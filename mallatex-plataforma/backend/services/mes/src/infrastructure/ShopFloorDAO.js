import { BaseDAO } from '@mallatex/shared/persistence';
import { PLAIN_LIMIT } from '@mallatex/shared/http';
import { Roll } from '../domain/Roll.js';
import { Aviso } from '../domain/Aviso.js';
import { Merma } from '../domain/Merma.js';

/** DAO de rollos: mapea filas ORM <-> entidad Roll. */
export class RollDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Roll(row.get({ plain: true }));
  }

  toPersistence(entity) {
    if (!(entity instanceof Roll)) return entity;
    const { id, ...rest } = entity.toPlain(); // id lo asigna la base (BIGSERIAL)
    return rest;
  }

  findByCode(code) {
    return this.findOne({ code: String(code) });
  }

  /** Filtros de listado -> cláusula where. */
  #whereDe({ estado, orderId } = {}) {
    const where = {};
    if (estado) where.estado = estado;
    if (orderId) where.orderId = orderId;
    return where;
  }

  list(filters = {}) {
    return this.findAll(this.#whereDe(filters), { order: [['code', 'ASC']], limit: PLAIN_LIMIT });
  }

  /** Versión paginada del listado (mismos filtros). */
  listPage(filters = {}, opts = {}) {
    return this.paginate(this.#whereDe(filters), { order: [['code', 'ASC']], ...opts });
  }
}

/** DAO de avisos de piso. */
export class AvisoDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Aviso(row.get({ plain: true }));
  }

  toPersistence(entity) {
    if (!(entity instanceof Aviso)) return entity;
    const { id, ...rest } = entity.toPlain(); // id lo asigna la base (BIGSERIAL)
    return rest;
  }

  /** Filtros de listado -> cláusula where. */
  #whereDe({ estado, lineId } = {}) {
    const where = {};
    if (estado) where.estado = estado;
    if (lineId) where.lineId = lineId;
    return where;
  }

  list(filters = {}) {
    return this.findAll(this.#whereDe(filters), { order: [['ts', 'DESC']], limit: PLAIN_LIMIT });
  }

  /** Versión paginada del listado (mismos filtros). */
  listPage(filters = {}, opts = {}) {
    return this.paginate(this.#whereDe(filters), { order: [['ts', 'DESC']], ...opts });
  }
}

/** DAO de mermas. */
export class MermaDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Merma(row.get({ plain: true }));
  }

  toPersistence(entity) {
    if (!(entity instanceof Merma)) return entity;
    const { id, ...rest } = entity.toPlain(); // id lo asigna la base (BIGSERIAL)
    return rest;
  }

  /** Filtros de listado -> cláusula where. */
  #whereDe({ categoria, lineId, orderId } = {}) {
    const where = {};
    if (categoria) where.categoria = categoria;
    if (lineId) where.lineId = lineId;
    if (orderId) where.orderId = orderId;
    return where;
  }

  list(filters = {}) {
    return this.findAll(this.#whereDe(filters), { order: [['fecha', 'DESC']], limit: PLAIN_LIMIT });
  }

  /** Versión paginada del listado (mismos filtros). */
  listPage(filters = {}, opts = {}) {
    return this.paginate(this.#whereDe(filters), { order: [['fecha', 'DESC']], ...opts });
  }
}

/** DAO de productividad por turno. */
export class ProductividadDAO extends BaseDAO {
  /** Filtros de listado -> cláusula where. */
  #whereDe({ lineId, turno } = {}) {
    const where = {};
    if (lineId) where.lineId = lineId;
    if (turno) where.turno = turno;
    return where;
  }

  list(filters = {}) {
    return this.findAll(this.#whereDe(filters), { order: [['fecha', 'DESC']], limit: PLAIN_LIMIT });
  }

  /** Versión paginada del listado (mismos filtros). */
  listPage(filters = {}, opts = {}) {
    return this.paginate(this.#whereDe(filters), { order: [['fecha', 'DESC']], ...opts });
  }
}
