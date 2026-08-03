import { BaseDAO } from '@mallatex/shared/persistence';
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
    const { id, ...rest } = entity.toPlain();
    return rest;
  }

  findByCode(code) {
    return this.findOne({ code: String(code) });
  }

  /** Listado con filtros opcionales por estado y línea. */
  list({ estado, lineId } = {}) {
    const where = {};
    if (estado) where.estado = estado;
    if (lineId) where.lineId = lineId;
    return this.findAll(where, { order: [['created_at', 'DESC']] });
  }
}

/** DAO de sub-pedidos (sub-campos de un mega-pedido, p.ej. EZE 503). */
export class SuborderDAO extends BaseDAO {
  byOrder(orderId) {
    return this.findAll({ orderId }, { order: [['id', 'ASC']] });
  }
}
