import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { Folio } from './Folio.js';

/**
 * Quote — cotización (COT-XXXX). Raíz de agregado que agrupa los renglones ya
 * preciados (subtotal/IVA/total calculados por el servicio de dominio Pricing)
 * y su folio humano. El folio se estampa una vez conocido el id secuencial.
 */
export class Quote extends AggregateRoot {
  constructor(props) {
    super(props.id);
    this.employeeId = Number(props.employeeId);
    this.clientId = props.clientId != null ? Number(props.clientId) : null;
    this.items = props.items || [];
    this.subtotal = Number(props.subtotal) || 0;
    this.iva = Number(props.iva) || 0;
    this.total = Number(props.total) || 0;
    this.folio = props.folio || null;
    this.status = props.status || 'borrador';
    this.createdAt = props.createdAt || null;
  }

  static create({ employeeId, clientId, priced }) {
    if (!priced || !priced.items?.length) {
      throw new DomainError('Agrega al menos un producto', { code: 'QUOTE_EMPTY' });
    }
    const quote = new Quote({
      employeeId,
      clientId,
      items: priced.items,
      subtotal: priced.subtotal,
      iva: priced.iva,
      total: priced.total,
      status: 'abierta',
    });
    quote.addDomainEvent(new DomainEvent('QuoteCreated', { total: quote.total }));
    return quote;
  }

  /** Estampa el folio secuencial (COT-#####) a partir del id ya asignado. */
  stampFolio(seq = this.id) {
    this.folio = Folio.quote(seq).value;
    return this.folio;
  }

  /** Marca la cotización como convertida en pedido. */
  markConverted() {
    this.status = 'convertida';
  }

  toPlain() {
    return {
      id: this.id,
      employeeId: this.employeeId,
      clientId: this.clientId,
      items: this.items,
      subtotal: this.subtotal,
      iva: this.iva,
      total: this.total,
      folio: this.folio,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}
