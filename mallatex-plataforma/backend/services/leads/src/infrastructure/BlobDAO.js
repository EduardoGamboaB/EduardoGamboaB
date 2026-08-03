import { BaseDAO } from '@mallatex/shared/persistence';

/**
 * DAO de blobs (imágenes) — tabla `leads.blobs` (key TEXT PK, mime, data BYTEA).
 * Guarda fotos de gafete (`badge:<leadId>`) e imágenes de premio
 * (`event:premio:<eventId>`). Sustituye a los blobs en disco del monolito.
 */
export class BlobDAO extends BaseDAO {
  /** Inserta o reemplaza un blob por su clave. */
  async put(key, buffer, mime = 'image/jpeg') {
    await this.save({ key, mime, data: buffer, updatedAt: new Date() });
  }

  /** Devuelve { mime, data } o null. */
  async get(key) {
    const row = await this.model.findByPk(key);
    if (!row) return null;
    const p = row.get({ plain: true });
    return { mime: p.mime || 'image/jpeg', data: p.data };
  }

  /** Elimina un blob (no falla si no existe). */
  async del(key) {
    await this.model.destroy({ where: { key } });
  }
}
