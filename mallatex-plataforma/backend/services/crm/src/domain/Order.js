import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { Folio } from './Folio.js';

/**
 * Order — pedido (PED-XXXX). Raíz de agregado con los mismos importes que una
 * cotización; puede originarse a partir de una cotización (quoteId) o
 * capturarse directamente con sus renglones preciados.
 */
export class Order extends AggregateRoot {
  constructor(props) {
    super(props.id);
    this.employeeId = Number(props.employeeId);
    this.clientId = props.clientId != null ? Number(props.clientId) : null;
    this.quoteId = props.quoteId != null ? Number(props.quoteId) : null;
    this.items = props.items || [];
    this.subtotal = Number(props.subtotal) || 0;
    this.iva = Number(props.iva) || 0;
    this.total = Number(props.total) || 0;
    this.folio = props.folio || null;
    this.status = props.status || 'nuevo';
    this.createdAt = props.createdAt || null;
  }

  static create({ employeeId, clientId, quoteId, priced }) {
    if (!priced || !priced.items?.length) {
      throw new DomainError('El pedido no tiene productos', { code: 'ORDER_EMPTY' });
    }
    const order = new Order({
      employeeId,
      clientId,
      quoteId: quoteId || null,
      items: priced.items,
      subtotal: priced.subtotal,
      iva: priced.iva,
      total: priced.total,
      status: 'pendiente',
    });
    order.addDomainEvent(new DomainEvent('OrderCreated', { total: order.total }));
    return order;
  }

  /** Estampa el folio secuencial (PED-#####) a partir del id ya asignado. */
  stampFolio(seq = this.id) {
    this.folio = Folio.order(seq).value;
    return this.folio;
  }

  toPlain() {
    return {
      id: this.id,
      employeeId: this.employeeId,
      clientId: this.clientId,
      quoteId: this.quoteId,
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
