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
    return p;
  }
}
