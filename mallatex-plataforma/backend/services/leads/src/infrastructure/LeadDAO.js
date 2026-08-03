import { Op } from 'sequelize';
import { BaseDAO } from '@mallatex/shared/persistence';
import { Lead } from '../domain/Lead.js';

/** DAO de leads: mapea filas ORM <-> agregado Lead. */
export class LeadDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Lead(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof Lead ? entity.toPlain() : { ...entity };
    // El id lo asigna la BD (BIGSERIAL): si aún es un uuid generado por el
    // agregado (no numérico) o falta, se omite. created_at lo maneja Sequelize.
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }

  /** ¿Existe ya ese folio? (unicidad global del folio legible). */
  folioExiste(folio) {
    return this.exists({ folio });
  }

  /** Leads de un evento (más recientes primero). */
  porEvento(eventId) {
    return this.findAll({ eventId }, { order: [['created_at', 'DESC']] });
  }

  /** Todos los leads (más recientes primero). */
  todos() {
    return this.findAll({}, { order: [['created_at', 'DESC']] });
  }

  /**
   * Detecta un lead duplicado dentro del mismo evento por correo o teléfono.
   * Devuelve el lead existente o null.
   */
  async duplicado(eventId, email, telefono) {
    const canales = [];
    if (email) canales.push({ email });
    if (telefono) canales.push({ telefono });
    if (!canales.length) return null;
    return this.findOne({ eventId, [Op.or]: canales });
  }
}
