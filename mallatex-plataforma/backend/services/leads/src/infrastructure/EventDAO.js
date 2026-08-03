import { BaseDAO } from '@mallatex/shared/persistence';
import { Event } from '../domain/Event.js';

/** DAO de eventos: mapea filas ORM <-> agregado Event. */
export class EventDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Event(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof Event ? entity.toPlain() : { ...entity };
    // El id lo asigna la BD (BIGSERIAL): si aún es un uuid generado por el
    // agregado (no numérico) o falta, se omite. created_at lo maneja Sequelize.
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }

  /** Todos los eventos, del más reciente al más antiguo. */
  listar() {
    return this.findAll({}, { order: [['created_at', 'DESC']] });
  }

  /** Evento activo (activo = true), o null. */
  activo() {
    return this.findOne({ activo: true });
  }

  /** Desactiva todos los eventos (para reafirmar el único activo). */
  async desactivarTodos(tx) {
    await this.model.update({ activo: false }, { where: {}, transaction: tx });
  }
}
