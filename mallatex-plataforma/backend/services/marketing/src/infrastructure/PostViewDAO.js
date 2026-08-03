import { BaseDAO } from '@mallatex/shared/persistence';

/**
 * DAO de vistas de publicaciones por empleado (PK compuesta post_id +
 * employee_id). Alimenta el contador de "nuevo" en la app móvil.
 */
export class PostViewDAO extends BaseDAO {
  /** Ids de publicaciones ya vistas por el empleado. */
  async vistasDe(employeeId) {
    const rows = await this.model.findAll({ where: { employeeId }, attributes: ['postId'] });
    return rows.map((r) => String(r.get('postId')));
  }

  /** Marca como vistas (upsert idempotente por PK compuesta). */
  async marcarVistas(employeeId, postIds = []) {
    if (!postIds.length) return 0;
    await this.model.bulkCreate(
      postIds.map((postId) => ({ postId, employeeId, seenAt: new Date() })),
      { ignoreDuplicates: true }
    );
    return postIds.length;
  }
}
