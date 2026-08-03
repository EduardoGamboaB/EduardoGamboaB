import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO de publicaciones (entidad ligera: objetos planos). */
export class PostDAO extends BaseDAO {
  toPersistence(entity) {
    const p = { ...entity };
    if (p.id == null || !/^\d+$/.test(String(p.id))) delete p.id;
    delete p.createdAt;
    return p;
  }

  /** Publicaciones activas, más recientes primero (tope 200). */
  listar(where = {}, { limit = 200 } = {}) {
    return this.findAll({ activo: true, ...where }, { order: [['created_at', 'DESC']], limit });
  }
}
