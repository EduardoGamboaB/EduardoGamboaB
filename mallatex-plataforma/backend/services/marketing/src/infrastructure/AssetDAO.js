import { BaseDAO } from '@mallatex/shared/persistence';
import { Asset } from '../domain/Asset.js';

/** Atributos de listado: nunca cargar el BYTEA en consultas masivas. */
const SIN_BLOB = { attributes: { exclude: ['blob'] } };

/** DAO de activos: mapea filas ORM <-> agregado Asset (el blob va aparte). */
export class AssetDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    const plain = row.get({ plain: true });
    delete plain.blob; // el agregado nunca carga el binario
    return new Asset(plain);
  }

  toPersistence(entity) {
    const esAgregado = entity instanceof Asset;
    const p = esAgregado ? entity.toPlain() : { ...entity };
    // El id lo asigna la BD (BIGSERIAL): si aún es un uuid generado por el
    // agregado (no numérico) o falta, se omite. created_at lo maneja Sequelize.
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    // El binario decodificado viaja como buffer transitorio del agregado y
    // sólo se persiste cuando el almacenamiento es en BD.
    if (esAgregado && entity.fileBuffer && p.storage === 'db') p.blob = entity.fileBuffer;
    return p;
  }

  /** findById sin blob (para metadatos). */
  porId(id) {
    return this.findById(id, SIN_BLOB);
  }

  /** Listado sin blob. */
  listado(where = {}, options = {}) {
    return this.findAll(where, { ...SIN_BLOB, ...options });
  }

  /** Paginado sin blob. */
  paginado(where = {}, options = {}) {
    return this.paginate(where, { ...SIN_BLOB, ...options });
  }

  /** Fila cruda CON blob (para servir el archivo). */
  async archivo(id) {
    const row = await this.model.findByPk(id);
    return row ? row.get({ plain: true }) : null;
  }

  /** Filas crudas CON blob pendientes de migrar a S3. */
  async pendientesSync() {
    const rows = await this.model.findAll({ where: { pendingSync: true } });
    return rows.map((r) => r.get({ plain: true }));
  }
}
