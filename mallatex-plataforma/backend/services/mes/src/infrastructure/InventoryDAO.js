import { BaseDAO } from '@mallatex/shared/persistence';
import { InventoryItem } from '../domain/InventoryItem.js';
import { InventoryCount } from '../domain/InventoryCount.js';

/** Artículos de inventario: filas ORM <-> agregado InventoryItem. */
export class InventoryItemDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new InventoryItem(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof InventoryItem ? entity.toPlain() : { ...entity };
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }

  porSku(sku) {
    return this.findOne({ sku });
  }
}

/** Movimientos (kardex) — objetos planos. */
export class InventoryMovementDAO extends BaseDAO {
  toPersistence(entity) {
    const p = { ...entity };
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }

  /** Historial de un artículo, más reciente primero. */
  porItem(itemId, { limit = 200 } = {}) {
    return this.findAll({ itemId }, { order: [['created_at', 'DESC']], limit });
  }

  /** Movimientos de un conjunto de artículos (para calcular existencias). */
  porItems(itemIds = []) {
    if (!itemIds.length) return Promise.resolve([]);
    return this.findAll({ itemId: itemIds });
  }
}

/** Conteos físicos: filas ORM <-> agregado InventoryCount. */
export class InventoryCountDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new InventoryCount(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof InventoryCount ? entity.toPlain() : { ...entity };
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    delete p.updatedAt;
    return p;
  }
}

/** Renglones de conteo — objetos planos. */
export class InventoryCountLineDAO extends BaseDAO {
  toPersistence(entity) {
    const p = { ...entity };
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }

  porConteo(countId) {
    return this.findAll({ countId }, { order: [['sku', 'ASC']] });
  }

  porConteoItem(countId, itemId) {
    return this.findOne({ countId, itemId });
  }
}
