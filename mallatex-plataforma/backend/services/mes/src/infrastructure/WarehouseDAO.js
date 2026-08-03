import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO de recepciones de material (MT-DT-001). */
export class RecepcionDAO extends BaseDAO {
  list() {
    return this.findAll({}, { order: [['ts', 'DESC']] });
  }
}

/** DAO de egresos a producción (MT-DT-002). */
export class EgresoDAO extends BaseDAO {
  list({ orderId } = {}) {
    const where = {};
    if (orderId) where.orderId = orderId;
    return this.findAll(where, { order: [['ts', 'DESC']] });
  }
}

/** DAO de producto terminado / pesaje final (MT-DT-006). */
export class ProductoTerminadoDAO extends BaseDAO {
  list({ orderId } = {}) {
    const where = {};
    if (orderId) where.orderId = orderId;
    return this.findAll(where, { order: [['ts', 'DESC']] });
  }
}
