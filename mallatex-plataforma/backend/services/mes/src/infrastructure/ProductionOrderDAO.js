import { BaseDAO } from '@mallatex/shared/persistence';
import { PLAIN_LIMIT } from '@mallatex/shared/http';
import { ProductionOrder } from '../domain/ProductionOrder.js';

/** DAO de pedidos de producción: mapea filas ORM <-> agregado ProductionOrder. */
export class ProductionOrderDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new ProductionOrder(row.get({ plain: true }));
  }

  toPersistence(entity) {
    if (!(entity instanceof ProductionOrder)) return entity;
    // El id lo asigna la base (BIGSERIAL); la entidad nueva trae un UUID de
    // Entity que no debe insertarse. En update, BaseDAO ya localiza por PK.
    const { id, createdAt, ...rest } = entity.toPlain();
    // created_at lo gestiona la base (DEFAULT now()); sólo lo reenviamos si el
    // agregado ya trae una fecha real, para no sobrescribir el default con null
    // al dar de alta un pedido nuevo (toPlain() expone createdAt: null).
    if (createdAt != null) rest.createdAt = createdAt;
    return rest;
  }

  findByCode(code) {
    return this.findOne({ code: String(code) });
  }

  /** Filtros de listado -> cláusula where. */
  #whereDe({ estado, lineId } = {}) {
    const where = {};
    if (estado) where.estado = estado;
    if (lineId) where.lineId = lineId;
    return where;
  }

  /** Listado con filtros opcionales por estado y línea (tope duro de filas). */
  list(filters = {}) {
    return this.findAll(this.#whereDe(filters), { order: [['created_at', 'DESC']], limit: PLAIN_LIMIT });
  }

  /** Versión paginada del listado (mismos filtros). */
  listPage(filters = {}, opts = {}) {
    return this.paginate(this.#whereDe(filters), { order: [['created_at', 'DESC']], ...opts });
  }
}

/** DAO de sub-pedidos (sub-campos de un mega-pedido, p.ej. EZE 503). */
export class SuborderDAO extends BaseDAO {
  byOrder(orderId) {
    return this.findAll({ orderId }, { order: [['id', 'ASC']] });
  }

  /** Subórdenes (partidas) de un conjunto de pedidos, en un solo query. */
  byOrders(orderIds = []) {
    if (!orderIds.length) return Promise.resolve([]);
    return this.findAll({ orderId: orderIds }, { order: [['id', 'ASC']] });
  }
}
