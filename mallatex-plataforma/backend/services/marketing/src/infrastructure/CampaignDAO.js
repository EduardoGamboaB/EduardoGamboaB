import { BaseDAO } from '@mallatex/shared/persistence';
import { Campaign } from '../domain/Campaign.js';

/** DAO de campañas: filas ORM <-> agregado Campaign. */
export class CampaignDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Campaign(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof Campaign ? entity.toPlain() : { ...entity };
    // El id lo asigna la BD (BIGSERIAL); created_at lo maneja Sequelize.
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }
}
