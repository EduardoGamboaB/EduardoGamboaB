import { DomainError } from '@mallatex/shared/ddd';
import { clean, idOpcional } from '../domain/Asset.js';

export const REDES = ['facebook', 'instagram', 'whatsapp', 'tiktok', 'otro'];

/**
 * PostService — publicaciones listas para compartir en redes. Marketing las
 * publica desde la web; los empleados las consultan desde la app, con contador
 * de "nuevas" alimentado por marketing.post_views.
 */
export class PostService {
  constructor({ postDAO, postViewDAO, assetDAO }) {
    this.postDAO = postDAO;
    this.postViewDAO = postViewDAO;
    this.assetDAO = assetDAO;
  }

  /** Listado activo DESC (tope 200), enriquecido con el activo ligado. */
  async listar(query = {}) {
    const where = {};
    if (query.campaign) where.campaignId = query.campaign;
    if (query.red) where.red = query.red;
    const posts = await this.postDAO.listar(where);

    // Enriquecimiento: tipo y título del activo ligado (sin blob).
    const ids = [...new Set(posts.map((p) => p.assetId).filter(Boolean))];
    const activos = ids.length ? await this.assetDAO.listado({ id: ids }) : [];
    const porId = new Map(activos.map((a) => [String(a.id), a]));

    return posts.map((p) => this.#item(p, porId.get(String(p.assetId))));
  }

  /** Alta por marketing. */
  async crear(body = {}, { publicadoPor = '' } = {}) {
    const titulo = clean(body.titulo, 200);
    if (!titulo) throw new DomainError('El título es obligatorio', { code: 'POST_TITULO_REQUERIDO' });
    const assetId = idOpcional(body.assetId);
    if (assetId) {
      const asset = await this.assetDAO.porId(assetId);
      if (!asset || !asset.activo) {
        throw new DomainError('El activo ligado no existe', { code: 'ASSET_NOT_FOUND', status: 404 });
      }
    }
    const created = await this.postDAO.create({
      titulo,
      copyTexto: clean(body.copyTexto, 4000),
      red: REDES.includes(body.red) ? body.red : clean(body.red, 40),
      assetId,
      campaignId: idOpcional(body.campaignId),
      publicadoPor: clean(publicadoPor, 120),
      activo: true,
    });
    const asset = created.assetId ? await this.assetDAO.porId(created.assetId) : null;
    return this.#item(created, asset);
  }

  /** Baja lógica. */
  async eliminar(id) {
    const post = await this.postDAO.findById(id);
    if (!post) throw new DomainError('Publicación no encontrada', { code: 'POST_NOT_FOUND', status: 404 });
    await this.postDAO.update(id, { activo: false });
    return { ok: true };
  }

  /** Publicaciones activas que el empleado aún no ha visto. */
  async unseenCount(employeeId) {
    const activos = await this.postDAO.findAll({ activo: true }, { attributes: ['id'] });
    const vistas = new Set(await this.postViewDAO.vistasDe(employeeId));
    const count = activos.filter((p) => !vistas.has(String(p.id))).length;
    return { count };
  }

  /** Marca vistas ({postIds:[...]} o {all:true}); upsert idempotente. */
  async marcarVistas(employeeId, body = {}) {
    const activos = await this.postDAO.findAll({ activo: true }, { attributes: ['id'] });
    const validos = new Set(activos.map((p) => String(p.id)));
    let ids;
    if (body.all === true) {
      ids = [...validos];
    } else {
      const pedidos = Array.isArray(body.postIds) ? body.postIds : [];
      // Sólo ids de publicaciones existentes (evita violar la FK).
      ids = [...new Set(pedidos.map((v) => String(v)))].filter((v) => validos.has(v));
    }
    const seen = await this.postViewDAO.marcarVistas(employeeId, ids);
    return { seen };
  }

  // ---- Auxiliares ----------------------------------------------------
  #item(p, asset) {
    return {
      id: p.id,
      titulo: p.titulo,
      copyTexto: p.copyTexto,
      red: p.red,
      assetId: p.assetId,
      campaignId: p.campaignId,
      publicadoPor: p.publicadoPor,
      createdAt: p.createdAt,
      assetTipo: asset ? asset.tipo : undefined,
      assetTitulo: asset ? asset.titulo : undefined,
    };
  }
}
