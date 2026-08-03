import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { clean, idOpcional } from './Asset.js';
import { Folio } from './Folio.js';

export const ESTADOS_FORMATO = ['solicitado', 'en_diseno', 'entregado', 'rechazado'];

// Máquina de estados: solicitado -> en_diseno -> entregado | rechazado.
const TRANSICIONES = Object.freeze({
  solicitado: ['en_diseno', 'rechazado'],
  en_diseno: ['entregado', 'rechazado'],
  entregado: [],
  rechazado: [],
});

/**
 * FormatRequest — raíz de agregado de las solicitudes de formato que un
 * vendedor levanta a marketing (lona, ficha, presentación…). Controla el folio
 * FMT-####, las transiciones de estado (entregar exige un activo entregable)
 * y el hilo de mensajes vendedor<->marketing.
 */
export class FormatRequest extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.folio = props.folio || null;
    this.solicitanteId = props.solicitanteId ?? null;
    this.solicitante = props.solicitante || '';
    this.titulo = props.titulo;
    this.descripcion = props.descripcion || '';
    this.referenciaAssetId = props.referenciaAssetId ?? null;
    this.estado = props.estado || 'solicitado';
    this.mensajes = Array.isArray(props.mensajes) ? props.mensajes : [];
    this.entregableAssetId = props.entregableAssetId ?? null;
    this.createdAt = props.createdAt || null;
    this.updatedAt = props.updatedAt || null;
  }

  /** Alta de la solicitud (el folio se asigna después, con el id BIGSERIAL). */
  static crear(body = {}, { solicitanteId = null, solicitante = '' } = {}) {
    const titulo = clean(body.titulo, 200);
    if (!titulo) throw new DomainError('El título es obligatorio', { code: 'FMT_TITULO_REQUERIDO' });
    const quien = clean(solicitante, 120);
    if (!quien) throw new DomainError('Falta el solicitante', { code: 'FMT_SOLICITANTE_REQUERIDO' });

    const fr = new FormatRequest({
      solicitanteId: idOpcional(solicitanteId),
      solicitante: quien,
      titulo,
      descripcion: clean(body.descripcion, 2000),
      referenciaAssetId: idOpcional(body.referenciaAssetId),
      estado: 'solicitado',
      mensajes: [],
    });
    fr.addDomainEvent(new DomainEvent('FormatoSolicitado', { titulo, solicitante: quien }));
    return fr;
  }

  /** Folio humano FMT-#### a partir del id secuencial. */
  asignarFolio(seq) {
    this.folio = Folio.formatRequest(seq).value;
    return this.folio;
  }

  /** ¿La solicitud pertenece a este empleado? */
  esDe(employeeId) {
    return this.solicitanteId != null && String(this.solicitanteId) === String(employeeId);
  }

  /**
   * Transición de estado. `entregado` exige el activo entregable (el diseño
   * terminado queda ligado al banco de activos).
   */
  cambiarEstado(nuevo, { entregableAssetId = null } = {}) {
    if (!ESTADOS_FORMATO.includes(nuevo)) {
      throw new DomainError('Estado no válido (en_diseno|entregado|rechazado)', { code: 'FMT_ESTADO_INVALIDO' });
    }
    if (!(TRANSICIONES[this.estado] || []).includes(nuevo)) {
      throw new DomainError(`Transición no permitida: ${this.estado} → ${nuevo}`, {
        code: 'FMT_TRANSICION_INVALIDA',
        status: 409,
      });
    }
    const entregable = idOpcional(entregableAssetId);
    if (nuevo === 'entregado' && !entregable) {
      throw new DomainError('Para entregar se requiere el activo entregable', {
        code: 'FMT_ENTREGABLE_REQUERIDO',
      });
    }
    this.estado = nuevo;
    if (entregable) this.entregableAssetId = entregable;
    this.addDomainEvent(new DomainEvent('FormatoEstadoCambiado', { folio: this.folio, estado: nuevo }));
    return this;
  }

  /** Agrega un mensaje al hilo ({by, role, message, at}). */
  addMessage({ by = '', role = 'vendedor', message } = {}) {
    const texto = clean(message, 2000);
    if (!texto) throw new DomainError('El mensaje no puede estar vacío', { code: 'FMT_MENSAJE_REQUERIDO' });
    const entrada = {
      by: clean(by, 120),
      role: role === 'marketing' ? 'marketing' : 'vendedor',
      message: texto,
      at: new Date().toISOString(),
    };
    this.mensajes = [...this.mensajes, entrada];
    return entrada;
  }

  toPlain() {
    return {
      id: this.id,
      folio: this.folio,
      solicitanteId: this.solicitanteId,
      solicitante: this.solicitante,
      titulo: this.titulo,
      descripcion: this.descripcion,
      referenciaAssetId: this.referenciaAssetId,
      estado: this.estado,
      mensajes: this.mensajes,
      entregableAssetId: this.entregableAssetId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
