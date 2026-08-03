import { Entity, DomainError } from '@mallatex/shared/ddd';
import { CATEGORIAS_MATERIAL } from './constants.js';

/**
 * Merma — registro de material no productivo clasificado por categoría
 * (prima|sobrante|defecto|desperdicio, MT-PC-003 política 8). Entidad simple:
 * un asiento inmutable de metros por categoría.
 */
export class Merma extends Entity {
  constructor(props) {
    super(props.id);
    this.fecha = props.fecha ?? null;
    this.operatorId = props.operatorId ?? null;
    this.lineId = props.lineId ?? null;
    this.material = props.material ?? null;
    this.metros = Number(props.metros ?? 0);
    this.categoria = props.categoria ?? null;
    this.defecto = props.defecto ?? null;
    this.orderId = props.orderId ?? null;
  }

  static create(props) {
    if (props.categoria && !CATEGORIAS_MATERIAL.includes(props.categoria)) {
      throw new DomainError(`Categoría de merma inválida: ${props.categoria}`, { code: 'MERMA_CATEGORIA_INVALID' });
    }
    if (Number(props.metros ?? 0) < 0) {
      throw new DomainError('Los metros no pueden ser negativos', { code: 'MERMA_METROS_INVALID' });
    }
    return new Merma(props);
  }

  toPlain() {
    return {
      id: this.id,
      fecha: this.fecha,
      operatorId: this.operatorId,
      lineId: this.lineId,
      material: this.material,
      metros: this.metros,
      categoria: this.categoria,
      defecto: this.defecto,
      orderId: this.orderId,
    };
  }
}
