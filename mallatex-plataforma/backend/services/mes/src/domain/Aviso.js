import { Entity } from '@mallatex/shared/ddd';

/**
 * Aviso — alerta de piso reportada desde la tablet de línea (falla, sin-material,
 * sin-hilo, montacargas...). Entidad simple con un ciclo abierto -> resuelto.
 */
export class Aviso extends Entity {
  constructor(props) {
    super(props.id);
    this.ts = props.ts ?? null;
    this.lineId = props.lineId ?? null;
    this.operatorId = props.operatorId ?? null;
    this.tipo = props.tipo ?? null;
    this.descripcion = props.descripcion ?? null;
    this.tiempo = props.tiempo ?? null;
    this.estado = props.estado || 'abierto';
  }

  static create(props) {
    return new Aviso(props);
  }

  resolver() {
    this.estado = 'resuelto';
    return this;
  }

  toPlain() {
    return {
      id: this.id,
      ts: this.ts,
      lineId: this.lineId,
      operatorId: this.operatorId,
      tipo: this.tipo,
      descripcion: this.descripcion,
      tiempo: this.tiempo,
      estado: this.estado,
    };
  }
}
