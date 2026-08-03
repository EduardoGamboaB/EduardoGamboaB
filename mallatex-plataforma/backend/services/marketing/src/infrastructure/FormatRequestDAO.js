import { BaseDAO } from '@mallatex/shared/persistence';
import { FormatRequest } from '../domain/FormatRequest.js';

/** DAO de solicitudes de formato: filas ORM <-> agregado FormatRequest. */
export class FormatRequestDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new FormatRequest(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof FormatRequest ? entity.toPlain() : { ...entity };
    // El id lo asigna la BD (BIGSERIAL); los timestamps los maneja Sequelize.
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    delete p.updatedAt;
    return p;
  }

  /** Solicitudes de un empleado (más recientes primero). */
  deSolicitante(solicitanteId, options = {}) {
    return this.findAll({ solicitanteId }, { order: [['created_at', 'DESC']], ...options });
  }
}
