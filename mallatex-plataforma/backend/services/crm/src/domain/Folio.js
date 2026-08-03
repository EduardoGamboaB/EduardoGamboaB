import { ValueObject } from '@mallatex/shared/ddd';

/**
 * Folio — objeto de valor que representa un folio humano y secuencial de un
 * documento comercial. El prefijo identifica el tipo de documento y el número
 * se toma del identificador secuencial (BIGSERIAL) del registro, con relleno a
 * cinco dígitos (p.ej. COT-00042).
 */
const PREFIX = Object.freeze({
  quote: 'COT',
  order: 'PED',
  expenseRequest: 'VIA',
  expense: 'GTO',
  invoice: 'FAC',
});

export class Folio extends ValueObject {
  constructor(prefix, seq) {
    super({ prefix, seq: Number(seq) });
  }

  /** Representación humana del folio (PREFIJO-#####). */
  get value() {
    return `${this.props.prefix}-${String(this.props.seq).padStart(5, '0')}`;
  }

  toString() {
    return this.value;
  }

  static for(kind, seq) {
    const prefix = PREFIX[kind];
    if (!prefix) throw new Error(`Tipo de folio desconocido: ${kind}`);
    return new Folio(prefix, seq);
  }

  static quote(seq) {
    return Folio.for('quote', seq);
  }

  static order(seq) {
    return Folio.for('order', seq);
  }

  static expenseRequest(seq) {
    return Folio.for('expenseRequest', seq);
  }

  static expense(seq) {
    return Folio.for('expense', seq);
  }

  static invoice(seq) {
    return Folio.for('invoice', seq);
  }
}

export { PREFIX as FOLIO_PREFIX };
