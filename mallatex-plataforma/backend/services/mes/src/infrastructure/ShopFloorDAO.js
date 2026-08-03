import { BaseDAO } from '@mallatex/shared/persistence';
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

  list({ estado, orderId } = {}) {
    const where = {};
    if (estado) where.estado = estado;
    if (orderId) where.orderId = orderId;
    return this.findAll(where, { order: [['code', 'ASC']] });
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

  list({ estado, lineId } = {}) {
    const where = {};
    if (estado) where.estado = estado;
    if (lineId) where.lineId = lineId;
    return this.findAll(where, { order: [['ts', 'DESC']] });
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

  list({ categoria, lineId, orderId } = {}) {
    const where = {};
    if (categoria) where.categoria = categoria;
    if (lineId) where.lineId = lineId;
    if (orderId) where.orderId = orderId;
    return this.findAll(where, { order: [['fecha', 'DESC']] });
  }
}

/** DAO de productividad por turno. */
export class ProductividadDAO extends BaseDAO {
  list({ lineId, turno } = {}) {
    const where = {};
    if (lineId) where.lineId = lineId;
    if (turno) where.turno = turno;
    return this.findAll(where, { order: [['fecha', 'DESC']] });
  }
}
