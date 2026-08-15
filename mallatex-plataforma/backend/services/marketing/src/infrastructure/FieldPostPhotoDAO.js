import { BaseDAO } from '@mallatex/shared/persistence';

/** Nunca cargar el BYTEA en consultas de listado. */
const SIN_BLOB = { attributes: { exclude: ['blob'] } };

/**
 * DAO de fotos de aportes de campo. Igual que AssetDAO, el binario (BYTEA) se
 * mantiene fuera de las lecturas de metadata y sólo se materializa al servir el
 * archivo. Trabaja con filas planas (no hay agregado propio: la foto es un
 * objeto de valor del aporte).
 */
export class FieldPostPhotoDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    const p = row.get({ plain: true });
    delete p.blob;
    return p;
  }

  toPersistence(data) {
    const p = { ...data };
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }

  /** Metadatos de las fotos de un aporte (sin blob), en orden. */
  listByPost(fieldPostId, options = {}) {
    return this.findAll({ fieldPostId }, { ...SIN_BLOB, order: [['orden', 'ASC'], ['id', 'ASC']], ...options });
  }

  /** Fila cruda CON blob (para servir el archivo). */
  async archivo(id) {
    const row = await this.model.findByPk(id);
    return row ? row.get({ plain: true }) : null;
  }

  /** Cuenta las fotos de un aporte. */
  contarPorPost(fieldPostId) {
    return this.count({ fieldPostId });
  }
}
