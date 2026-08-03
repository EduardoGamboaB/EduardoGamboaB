import { DomainError } from '@mallatex/shared/ddd';
import { eventBus } from '@mallatex/shared';
import { ProductionOrder } from '../domain/ProductionOrder.js';

/**
 * ProductionService — casos de uso de pedidos de producción (MT-PC-003):
 * alta/edición, la compuerta de cobranza (liberar), avance de proceso y
 * registro de piezas terminadas. Persiste el agregado y publica sus eventos de
 * dominio ya ocurridos en el bus.
 */
export class ProductionService {
  constructor({ orderDAO, suborderDAO }) {
    this.orderDAO = orderDAO;
    this.suborderDAO = suborderDAO;
  }

  /** Persiste el agregado y drena/publica sus eventos de dominio. */
  async #persist(order, mode = 'update') {
    const saved =
      mode === 'create'
        ? await this.orderDAO.create(order)
        : await this.orderDAO.update(order.id, order);
    await eventBus.publishAll(order.pullDomainEvents());
    return saved;
  }

  list(filters) {
    return this.orderDAO.list(filters);
  }

  async getById(id) {
    const order = await this.orderDAO.findById(id);
    if (!order) throw new DomainError('Pedido no encontrado', { code: 'ORDER_NOT_FOUND', status: 404 });
    const suborders = await this.suborderDAO.byOrder(order.id);
    return { ...order.toPublic(), suborders };
  }

  async create(data) {
    const order = ProductionOrder.create(data);
    const saved = await this.#persist(order, 'create');
    if (Array.isArray(data.subPedidos) && data.subPedidos.length) {
      await this.suborderDAO.bulkCreate(
        data.subPedidos.map((name) => ({ orderId: saved.id, name, rollos: 0 }))
      );
    }
    return saved;
  }

  async update(id, data) {
    const updated = await this.orderDAO.update(id, data);
    if (!updated) throw new DomainError('Pedido no encontrado', { code: 'ORDER_NOT_FOUND', status: 404 });
    return updated;
  }

  #load(id) {
    return this.orderDAO.findById(id).then((order) => {
      if (!order) throw new DomainError('Pedido no encontrado', { code: 'ORDER_NOT_FOUND', status: 404 });
      return order;
    });
  }

  /** Compuerta de cobranza: libera el pedido si el pago está confirmado. */
  async liberar(id) {
    const order = await this.#load(id);
    order.liberarPedido();
    return this.#persist(order);
  }

  async confirmarPago(id) {
    const order = await this.#load(id);
    order.confirmarPago();
    return this.#persist(order);
  }

  async avanzarProceso(id) {
    const order = await this.#load(id);
    order.avanzarProceso();
    return this.#persist(order);
  }

  async registrarTerminados(id, n) {
    const order = await this.#load(id);
    order.registrarTerminados(n);
    return this.#persist(order);
  }

  /** Pedidos en espera de liberación por cobranza (pago no confirmado). */
  cobranzaPendientes() {
    return this.orderDAO.findAll({ pagoConfirmado: false });
  }
}
