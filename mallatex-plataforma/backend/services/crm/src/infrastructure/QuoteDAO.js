import { BaseDAO } from '@mallatex/shared/persistence';
import { Quote } from '../domain/Quote.js';

/** DAO de cotizaciones: mapea filas ORM <-> agregado Quote. */
export class QuoteDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Quote(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof Quote ? entity.toPlain() : { ...entity };
    if (p.id == null || !Number.isFinite(Number(p.id))) delete p.id;
    // Timestamps nulos: se omiten para que aplique el DEFAULT de la base.
    if (p.createdAt == null) delete p.createdAt;
    if (p.ts == null) delete p.ts;
    return p;
  }
}
