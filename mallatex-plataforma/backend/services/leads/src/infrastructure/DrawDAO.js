import { BaseDAO } from '@mallatex/shared/persistence';

/**
 * DAO de sorteos. Trabaja con objetos planos (el sorteo es un registro de
 * bitácora, no un agregado con invariantes propias).
 */
export class DrawDAO extends BaseDAO {
  /** Ganadores de un evento (más recientes primero). */
  porEvento(eventId) {
    return this.findAll({ eventId }, { order: [['created_at', 'DESC']] });
  }

  /** Todos los sorteos. */
  todos() {
    return this.findAll({}, { order: [['created_at', 'DESC']] });
  }
}
