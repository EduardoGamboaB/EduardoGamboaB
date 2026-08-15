import { ValueObject } from '@mallatex/shared/ddd';

/**
 * Folio — objeto de valor que representa el folio humano y secuencial de una
 * solicitud de formato. El prefijo identifica el tipo de documento y el número
 * se toma del identificador secuencial (BIGSERIAL) del registro, con relleno a
 * cuatro dígitos (p.ej. FMT-0042). Mismo patrón que el Folio del contexto crm.
 */
const PREFIX = Object.freeze({
  formatRequest: 'FMT',
  fieldPost: 'APC', // Aporte de campo (contenido del vendedor)
});

export class Folio extends ValueObject {
  constructor(prefix, seq) {
    super({ prefix, seq: Number(seq) });
  }

  /** Representación humana del folio (PREFIJO-####). */
  get value() {
    return `${this.props.prefix}-${String(this.props.seq).padStart(4, '0')}`;
  }

  toString() {
    return this.value;
  }

  static for(kind, seq) {
    const prefix = PREFIX[kind];
    if (!prefix) throw new Error(`Tipo de folio desconocido: ${kind}`);
    return new Folio(prefix, seq);
  }

  static formatRequest(seq) {
    return Folio.for('formatRequest', seq);
  }

  static fieldPost(seq) {
    return Folio.for('fieldPost', seq);
  }
}

export { PREFIX as FOLIO_PREFIX };
