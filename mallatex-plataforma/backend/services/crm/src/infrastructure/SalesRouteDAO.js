import { BaseDAO } from '@mallatex/shared/persistence';
import { SalesRoute } from '../domain/SalesRoute.js';

/** DAO de rutas de venta: mapea filas ORM <-> agregado SalesRoute. */
export class SalesRouteDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new SalesRoute(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof SalesRoute ? entity.toPlain() : { ...entity };
    if (p.id == null || !Number.isFinite(Number(p.id))) delete p.id;
    // Timestamps nulos: se omiten para que aplique el DEFAULT de la base.
    if (p.createdAt == null) delete p.createdAt;
    if (p.ts == null) delete p.ts;
    return p;
  }

  /** Ruta activa del vendedor (a lo sumo una). */
  activeFor(employeeId) {
    return this.findOne({ employeeId: Number(employeeId), status: 'activa' });
  }
}
