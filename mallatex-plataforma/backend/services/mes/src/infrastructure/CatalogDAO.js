import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO de líneas de producción (LC1-LC4, LK, LP, LE). */
export class LineDAO extends BaseDAO {
  list() {
    return this.findAll({}, { order: [['code', 'ASC']] });
  }

  findByCode(code) {
    return this.findOne({ code: String(code) });
  }
}

/** DAO de operadores (competencia A/B/C/D, promedio mL/hr histórico). */
export class OperatorDAO extends BaseDAO {
  list({ lineId } = {}) {
    const where = {};
    if (lineId) where.lineId = lineId;
    return this.findAll(where, { order: [['name', 'ASC']] });
  }
}

/** DAO de ubicaciones de almacén. */
export class LocationDAO extends BaseDAO {
  list() {
    return this.findAll({}, { order: [['code', 'ASC']] });
  }
}
