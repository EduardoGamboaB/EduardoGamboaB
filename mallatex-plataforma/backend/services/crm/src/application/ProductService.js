import { DomainError } from '@mallatex/shared/ddd';

const notFound = () => new DomainError('Producto no encontrado', { code: 'NOT_FOUND', status: 404 });

/**
 * ProductService — administración del catálogo de productos (mallas). Superficie
 * WEB de administración (adminOnly). Los importes se devuelven como número.
 */
export class ProductService {
  constructor({ productDAO }) {
    this.productDAO = productDAO;
  }

  #toPublic(p) {
    if (!p) return null;
    return { ...p, price: Number(p.price), stock: Number(p.stock), specs: p.specs || {} };
  }

  async list(query = {}) {
    const where = {};
    if (query.active === 'true') where.active = true;
    if (query.category) where.category = query.category;
    const items = await this.productDAO.findAll(where, { order: [['name', 'ASC']] });
    return items.map((p) => this.#toPublic(p));
  }

  async get(id) {
    const p = await this.productDAO.findById(Number(id));
    if (!p) throw notFound();
    return this.#toPublic(p);
  }

  async create(body) {
    const b = body || {};
    if (!b.sku) throw new DomainError('El SKU es obligatorio', { code: 'PRODUCT_SKU_REQUIRED' });
    if (!b.name) throw new DomainError('El nombre es obligatorio', { code: 'PRODUCT_NAME_REQUIRED' });
    const created = await this.productDAO.create({
      sku: b.sku,
      name: b.name,
      category: b.category || null,
      unit: b.unit || 'm2',
      price: Number(b.price) || 0,
      stock: Number(b.stock) || 0,
      warehouse: b.warehouse || null,
      specs: b.specs || {},
      active: b.active !== false,
    });
    return this.#toPublic(created);
  }

  async update(id, body) {
    const p = await this.productDAO.findById(Number(id));
    if (!p) throw notFound();
    const b = body || {};
    const patch = {};
    for (const k of ['sku', 'name', 'category', 'unit', 'warehouse', 'specs', 'active']) if (k in b) patch[k] = b[k];
    for (const k of ['price', 'stock']) if (k in b) patch[k] = Number(b[k]) || 0;
    const updated = await this.productDAO.update(p.id, patch);
    return this.#toPublic(updated);
  }

  async remove(id) {
    const p = await this.productDAO.findById(Number(id));
    if (!p) throw notFound();
    // Baja lógica: se conserva el histórico de cotizaciones/pedidos.
    await this.productDAO.update(p.id, { active: false });
    return { ok: true };
  }
}
