import { BaseDAO } from '@mallatex/shared/persistence';
import { Visit } from '../domain/Visit.js';

/** DAO de visitas: mapea filas ORM <-> agregado Visit. */
export class VisitDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Visit(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof Visit ? entity.toPlain() : { ...entity };
    if (p.id == null || !Number.isFinite(Number(p.id))) delete p.id;
    // Timestamps nulos: se omiten para que aplique el DEFAULT de la base.
    if (p.createdAt == null) delete p.createdAt;
    if (p.ts == null) delete p.ts;
    return p;
  }
}
