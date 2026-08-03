import { Entity, DomainError } from '@mallatex/shared/ddd';

const ESTADOS_ROLLO = ['almacen', 'reservado', 'en-linea'];

/**
 * Roll — rollo físico de material (MT-DT-004). Entidad simple: su ciclo se
 * limita a moverse entre almacén, reservado y en línea, y a marcarse iniciado
 * cuando el operador escanea su QR en la tablet.
 */
export class Roll extends Entity {
  constructor(props) {
    super(props.id);
    this.code = props.code;
    this.material = props.material ?? null;
    this.medida = props.medida ?? null;
    this.lote = props.lote ?? null;
    this.peso = props.peso ?? null;
    this.ubicacion = props.ubicacion ?? null;
    this.orderId = props.orderId ?? null;
    this.estado = props.estado || 'almacen';
    this.empezado = props.empezado ?? false;
  }

  static create(props) {
    if (!props.code) throw new DomainError('El código de rollo es obligatorio', { code: 'ROLL_CODE_REQUIRED' });
    if (props.estado && !ESTADOS_ROLLO.includes(props.estado)) {
      throw new DomainError(`Estado de rollo inválido: ${props.estado}`, { code: 'ROLL_ESTADO_INVALID' });
    }
    return new Roll(props);
  }

  /** El operador escanea el rollo en la línea: pasa a en-linea y queda iniciado. */
  escanearEnLinea(orderId) {
    this.estado = 'en-linea';
    this.empezado = true;
    if (orderId) this.orderId = orderId;
    return this;
  }

  toPlain() {
    return {
      id: this.id,
      code: this.code,
      material: this.material,
      medida: this.medida,
      lote: this.lote,
      peso: this.peso,
      ubicacion: this.ubicacion,
      orderId: this.orderId,
      estado: this.estado,
      empezado: this.empezado,
    };
  }
}

export { ESTADOS_ROLLO };
