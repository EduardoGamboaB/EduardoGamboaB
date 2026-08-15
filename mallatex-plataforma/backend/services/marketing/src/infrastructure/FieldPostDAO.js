import { BaseDAO } from '@mallatex/shared/persistence';
import { FieldPost } from '../domain/FieldPost.js';

/** DAO de aportes de campo: filas ORM <-> agregado FieldPost. */
export class FieldPostDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new FieldPost(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof FieldPost ? entity.toPlain() : { ...entity };
    // El id lo asigna la BD (BIGSERIAL); los timestamps los maneja Sequelize.
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    delete p.updatedAt;
    return p;
  }

  /** Aportes de un empleado (más recientes primero). */
  deAutor(autorId, options = {}) {
    return this.findAll({ autorId }, { order: [['created_at', 'DESC']], ...options });
  }
}
