import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { clean, q3 } from './InventoryItem.js';

export const ESTADOS_CONTEO = ['abierto', 'cerrado', 'sincronizado', 'error'];
export const ESTADOS_SAE = ['pendiente', 'enviado', 'error'];

// Flujo del conteo:
//   abierto -> cerrado (genera ajustes) -> sincronizado (empujado al SAE)
//   cerrado/sincronizado pueden quedar en 'error' si la sync al SAE falla.
const TRANSICIONES = Object.freeze({
  abierto: ['cerrado'],
  cerrado: ['sincronizado', 'error'],
  error: ['sincronizado'],
  sincronizado: [],
});

/**
 * InventoryCount — sesión de conteo físico (folio CTF-####). Captura el físico
 * contra el teórico del kardex; al cerrar, cada renglón con diferencia genera un
 * ajuste; luego el conteo se sincroniza al SAE (sólo se empujan los ajustes).
 * Los renglones se gestionan aparte (objeto de valor persistido por su DAO).
 */
export class InventoryCount extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.folio = props.folio || null;
    this.ubicacion = props.ubicacion || '';
    this.estado = props.estado || 'abierto';
    this.createdBy = props.createdBy || '';
    this.saeSyncEstado = props.saeSyncEstado || 'pendiente';
    this.saeRef = props.saeRef || null;
    this.saeError = props.saeError || null;
    this.saeSyncAt = props.saeSyncAt || null;
    this.closedAt = props.closedAt || null;
    this.createdAt = props.createdAt || null;
    this.updatedAt = props.updatedAt || null;
  }

  static crear(body = {}, { createdBy = '' } = {}) {
    const c = new InventoryCount({
      ubicacion: clean(body.ubicacion, 120),
      estado: 'abierto',
      createdBy: clean(createdBy, 120),
      saeSyncEstado: 'pendiente',
    });
    c.addDomainEvent(new DomainEvent('ConteoFisicoIniciado', { ubicacion: c.ubicacion }));
    return c;
  }

  get abierto() {
    return this.estado === 'abierto';
  }

  #transicion(nuevo) {
    if (!(TRANSICIONES[this.estado] || []).includes(nuevo)) {
      throw new DomainError(`Transición de conteo no permitida: ${this.estado} → ${nuevo}`, {
        code: 'CONTEO_TRANSICION_INVALIDA',
        status: 409,
      });
    }
    this.estado = nuevo;
  }

  /** Cierra el conteo (ya no admite capturas; se generan los ajustes). */
  cerrar() {
    this.#transicion('cerrado');
    this.addDomainEvent(new DomainEvent('ConteoFisicoCerrado', { folio: this.folio }));
    return this;
  }

  /** Marca el resultado de la sincronización con el SAE. */
  marcarSae({ ok, ref = null, error = null } = {}) {
    if (ok) {
      this.#transicion('sincronizado');
      this.saeSyncEstado = 'enviado';
      this.saeRef = ref ? clean(ref, 120) : null;
      this.saeError = null;
    } else {
      this.#transicion('error');
      this.saeSyncEstado = 'error';
      this.saeError = clean(error, 500) || 'Error desconocido al sincronizar con el SAE';
    }
    this.addDomainEvent(new DomainEvent('ConteoFisicoSincronizado', { folio: this.folio, ok: !!ok }));
    return this;
  }

  toPlain() {
    return {
      id: this.id,
      folio: this.folio,
      ubicacion: this.ubicacion,
      estado: this.estado,
      createdBy: this.createdBy,
      saeSyncEstado: this.saeSyncEstado,
      saeRef: this.saeRef,
      saeError: this.saeError,
      saeSyncAt: this.saeSyncAt,
      closedAt: this.closedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

/** Renglón de conteo: teórico (snapshot) vs contado; diferencia derivada. */
export function nuevoRenglon({ item, contado, contadoPor }) {
  const cont = q3(contado);
  if (!Number.isFinite(cont) || cont < 0) {
    throw new DomainError('La cantidad contada no es válida', { code: 'CONTEO_CANTIDAD_INVALIDA' });
  }
  const teorico = q3(item.existencia);
  return {
    itemId: item.id,
    sku: item.sku,
    teorico,
    contado: cont,
    diferencia: q3(cont - teorico),
    contadoPor: clean(contadoPor, 120),
  };
}
