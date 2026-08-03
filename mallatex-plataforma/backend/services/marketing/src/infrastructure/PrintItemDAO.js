import { BaseDAO } from '@mallatex/shared/persistence';
import { PrintItem } from '../domain/PrintItem.js';

/** DAO de artículos impresos: filas ORM <-> agregado PrintItem. */
export class PrintItemDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new PrintItem(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof PrintItem ? entity.toPlain() : { ...entity };
    // El id lo asigna la BD (BIGSERIAL); created_at lo maneja Sequelize.
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }
}
