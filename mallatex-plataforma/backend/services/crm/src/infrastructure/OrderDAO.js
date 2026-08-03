import { BaseDAO } from '@mallatex/shared/persistence';
import { Order } from '../domain/Order.js';

/** DAO de pedidos: mapea filas ORM <-> agregado Order. */
export class OrderDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Order(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof Order ? entity.toPlain() : { ...entity };
    if (p.id == null || !Number.isFinite(Number(p.id))) delete p.id;
    // Timestamps nulos: se omiten para que aplique el DEFAULT de la base.
    if (p.createdAt == null) delete p.createdAt;
    if (p.ts == null) delete p.ts;
    return p;
  }
}
