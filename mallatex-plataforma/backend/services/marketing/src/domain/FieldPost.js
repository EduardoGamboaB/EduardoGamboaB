import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { clean, idOpcional } from './Asset.js';
import { Folio } from './Folio.js';

export const ESTADOS_APORTE = ['nuevo', 'aprobado', 'publicado', 'rechazado'];

// Máquina de estados de la curación:
//   nuevo -> aprobado | rechazado
//   aprobado -> publicado | rechazado
//   publicado / rechazado son finales.
const TRANSICIONES = Object.freeze({
  nuevo: ['aprobado', 'rechazado'],
  aprobado: ['publicado', 'rechazado'],
  publicado: [],
  rechazado: [],
});

/**
 * FieldPost — raíz de agregado de los "aportes de campo": contenido que el
 * vendedor genera desde la app (fotos de un proyecto + su contexto) para que
 * marketing lo cure y, si procede, lo publique como material del banco. Es el
 * único flujo del módulo en sentido campo -> marketing con archivos adjuntos.
 * Las fotos se manejan aparte (agregado ligero de valor), igual que el blob del
 * Asset: aquí sólo vive la metadata y la máquina de estados.
 */
export class FieldPost extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.folio = props.folio || null;
    this.autorId = props.autorId ?? null;
    this.autor = props.autor || '';
    this.titulo = props.titulo;
    this.ubicacion = props.ubicacion || '';
    this.cultivo = props.cultivo || '';
    this.producto = props.producto || '';
    this.cliente = props.cliente || '';
    this.contexto = props.contexto || '';
    this.estado = props.estado || 'nuevo';
    this.notaMarketing = props.notaMarketing || '';
    this.mensajes = Array.isArray(props.mensajes) ? props.mensajes : [];
    this.publicadoAssetIds = Array.isArray(props.publicadoAssetIds) ? props.publicadoAssetIds : [];
    this.createdAt = props.createdAt || null;
    this.updatedAt = props.updatedAt || null;
  }

  /**
   * Alta por el vendedor. El folio APC-#### se asigna después con el id
   * BIGSERIAL. Las fotos se validan y persisten en la capa de aplicación.
   */
  static crear(body = {}, { autorId = null, autor = '' } = {}) {
    const titulo = clean(body.titulo, 200);
    if (!titulo) throw new DomainError('El título es obligatorio', { code: 'APC_TITULO_REQUERIDO' });
    const quien = clean(autor, 120);
    if (!quien) throw new DomainError('Falta el autor del aporte', { code: 'APC_AUTOR_REQUERIDO' });

    const fp = new FieldPost({
      autorId: idOpcional(autorId),
      autor: quien,
      titulo,
      ubicacion: clean(body.ubicacion, 200),
      cultivo: clean(body.cultivo, 120),
      producto: clean(body.producto, 120),
      cliente: clean(body.cliente, 200),
      contexto: clean(body.contexto, 4000),
      estado: 'nuevo',
      mensajes: [],
      publicadoAssetIds: [],
    });
    fp.addDomainEvent(new DomainEvent('AporteCampoCreado', { titulo, autor: quien }));
    return fp;
  }

  /** Folio humano APC-#### a partir del id secuencial. */
  asignarFolio(seq) {
    this.folio = Folio.fieldPost(seq).value;
    return this.folio;
  }

  /** ¿El aporte pertenece a este empleado? */
  esDe(employeeId) {
    return this.autorId != null && String(this.autorId) === String(employeeId);
  }

  /**
   * Transición de estado por marketing. `rechazado` puede fijar una nota (motivo)
   * y `publicado` registra los ids de los assets creados en el banco.
   */
  cambiarEstado(nuevo, { notaMarketing, assetIds } = {}) {
    if (!ESTADOS_APORTE.includes(nuevo)) {
      throw new DomainError('Estado no válido (aprobado|publicado|rechazado)', { code: 'APC_ESTADO_INVALIDO' });
    }
    if (!(TRANSICIONES[this.estado] || []).includes(nuevo)) {
      throw new DomainError(`Transición no permitida: ${this.estado} → ${nuevo}`, {
        code: 'APC_TRANSICION_INVALIDA',
        status: 409,
      });
    }
    this.estado = nuevo;
    if (notaMarketing !== undefined) this.notaMarketing = clean(notaMarketing, 2000);
    if (Array.isArray(assetIds) && assetIds.length) {
      this.publicadoAssetIds = assetIds.map((n) => idOpcional(n)).filter(Boolean);
    }
    this.addDomainEvent(new DomainEvent('AporteCampoEstadoCambiado', { folio: this.folio, estado: nuevo }));
    return this;
  }

  /** Agrega un mensaje al hilo ({by, role, message, at}). */
  addMessage({ by = '', role = 'marketing', message } = {}) {
    const texto = clean(message, 2000);
    if (!texto) throw new DomainError('El mensaje no puede estar vacío', { code: 'APC_MENSAJE_REQUERIDO' });
    const entrada = {
      by: clean(by, 120),
      role: role === 'vendedor' ? 'vendedor' : 'marketing',
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
      autorId: this.autorId,
      autor: this.autor,
      titulo: this.titulo,
      ubicacion: this.ubicacion,
      cultivo: this.cultivo,
      producto: this.producto,
      cliente: this.cliente,
      contexto: this.contexto,
      estado: this.estado,
      notaMarketing: this.notaMarketing,
      mensajes: this.mensajes,
      publicadoAssetIds: this.publicadoAssetIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
