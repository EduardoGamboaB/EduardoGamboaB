import { BaseDAO } from '@mallatex/shared/persistence';
import { Op } from 'sequelize';

/**
 * DAO de productos (catálogo de mallas). Devuelve registros planos; el precio y
 * el stock se coercionan a número en la capa de cálculo (Pricing/Advisor).
 */
export class ProductDAO extends BaseDAO {
  /** Búsqueda por texto libre sobre nombre/SKU/categoría (para la app móvil). */
  async search({ q, category, activeOnly = true } = {}) {
    const where = {};
    if (activeOnly) where.active = true;
    if (category) where.category = category;
    if (q) {
      // iLike (case-insensitive) en Postgres; like en SQLite (ya insensible en ASCII).
      const dialect = this.model.sequelize.getDialect();
      const operator = dialect === 'postgres' ? Op.iLike : Op.like;
      const like = { [operator]: `%${q}%` };
      where[Op.or] = [{ name: like }, { sku: like }, { category: like }];
    }
    return this.findAll(where, { order: [['name', 'ASC']] });
  }
}
