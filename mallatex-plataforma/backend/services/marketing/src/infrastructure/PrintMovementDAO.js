import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO de movimientos de inventario de impresos (objetos planos). */
export class PrintMovementDAO extends BaseDAO {
  toPersistence(entity) {
    const p = { ...entity };
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }

  /** Historial de un artículo, más reciente primero (tope 200). */
  porItem(itemId, { limit = 200 } = {}) {
    return this.findAll({ itemId }, { order: [['created_at', 'DESC']], limit });
  }

  /** Todos los movimientos de un conjunto de artículos (para existencias). */
  porItems(itemIds = []) {
    if (!itemIds.length) return Promise.resolve([]);
    return this.findAll({ itemId: itemIds });
  }
}
