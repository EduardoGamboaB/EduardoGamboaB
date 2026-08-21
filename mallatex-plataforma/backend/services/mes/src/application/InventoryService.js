import { DomainError } from '@mallatex/shared/ddd';
import { InventoryItem, validarMovimientoInv, clean, q3 } from '../domain/InventoryItem.js';
import { InventoryCount, nuevoRenglon } from '../domain/InventoryCount.js';

const folioCTF = (id) => `CTF-${String(id).padStart(4, '0')}`;

/**
 * InventoryService — inventario físico del MES. Mantiene el saldo por artículo
 * (kardex), permite conteo físico desde la tablet (captura contado vs teórico) y
 * empuja los ajustes resultantes al SAE (a través del SaeClient / middleware).
 */
export class InventoryService {
  constructor({ itemDAO, movementDAO, countDAO, lineDAO, sae }) {
    this.itemDAO = itemDAO;
    this.movementDAO = movementDAO;
    this.countDAO = countDAO;
    this.lineDAO = lineDAO;
    this.sae = sae;
  }

  // ---------------- Artículos + kardex ----------------
  /** Artículos activos con existencia y bajo mínimo calculados del kardex. */
  async listItems(query = {}) {
    const where = { activo: true };
    const items = await this.itemDAO.findAll(where, { order: [['descripcion', 'ASC']] });
    const movs = await this.movementDAO.porItems(items.map((i) => i.id));
    const porItem = new Map();
    for (const m of movs) {
      const k = String(m.itemId);
      if (!porItem.has(k)) porItem.set(k, []);
      porItem.get(k).push(m);
    }
    const needle = query.q ? String(query.q).toLowerCase() : '';
    return items
      .filter((it) => !needle || `${it.sku} ${it.descripcion}`.toLowerCase().includes(needle))
      .map((item) => {
        const existencia = InventoryItem.existencia(porItem.get(String(item.id)) || []);
        return { ...item.toPlain(), existencia, bajoMinimo: item.bajoMinimo(existencia) };
      });
  }

  async crearItem(body = {}) {
    if (await this.itemDAO.porSku(clean(body.sku, 60))) {
      throw new DomainError('Ya existe un artículo con ese SKU', { code: 'INV_SKU_DUPLICADO', status: 409 });
    }
    const item = InventoryItem.crear(body);
    const saved = await this.itemDAO.create(item);
    return { ...saved.toPlain(), existencia: 0, bajoMinimo: saved.bajoMinimo(0) };
  }

  async actualizarItem(id, body = {}) {
    const item = await this.#item(id);
    item.aplicar(body);
    await this.itemDAO.update(id, item);
    return this.#itemConExistencia(id);
  }

  async eliminarItem(id) {
    await this.#item(id);
    await this.itemDAO.update(id, { activo: false });
    return { ok: true };
  }

  async movimientos(itemId) {
    await this.#item(itemId);
    return this.movementDAO.porItem(itemId);
  }

  /** Registra un movimiento manual (entrada/salida/ajuste) desde la web. */
  async registrarMovimiento(body = {}, { actor = {} } = {}) {
    const item = await this.#item(body.itemId);
    const existencia = await this.#existencia(item.id);
    const cantidad = validarMovimientoInv({ tipo: body.tipo, cantidad: body.cantidad }, { existencia });
    await this.movementDAO.create({
      itemId: item.id,
      tipo: body.tipo,
      cantidad,
      motivo: clean(body.motivo, 300),
      origen: clean(actor.origen, 20) || 'web',
      createdBy: clean(actor.name, 120),
    });
    return this.#itemConExistencia(item.id);
  }

  // ---------------- Conteo físico ----------------
  /** Inicia un conteo (folio CTF-#### con el id secuencial). */
  async iniciarConteo(body = {}, { createdBy = '' } = {}) {
    const c = InventoryCount.crear(body, { createdBy });
    const created = await this.countDAO.create(c);
    const conFolio = await this.countDAO.update(created.id, { folio: folioCTF(created.id) });
    return conFolio.toPlain();
  }

  async listarConteos(query = {}) {
    const where = {};
    if (query.estado) where.estado = query.estado;
    const items = await this.countDAO.findAll(where, { order: [['created_at', 'DESC']], limit: 200 });
    return items.map((c) => c.toPlain());
  }

  async detalleConteo(id) {
    const c = await this.#conteo(id);
    const lines = await this.lineDAO.porConteo(id);
    return { ...c.toPlain(), lines, resumen: this.#resumen(lines) };
  }

  /**
   * Captura (o corrige) el conteo físico de un artículo. Toma el teórico del
   * kardex en ese momento; el renglón es único por (conteo, artículo).
   */
  async capturarRenglon(countId, body = {}, { contadoPor = '' } = {}) {
    const c = await this.#conteo(countId);
    if (!c.abierto) {
      throw new DomainError('El conteo ya está cerrado; no admite capturas', { code: 'CONTEO_CERRADO', status: 409 });
    }
    const item = body.itemId ? await this.#item(body.itemId) : await this.itemDAO.porSku(clean(body.sku, 60));
    if (!item) throw new DomainError('Artículo no encontrado (SKU)', { code: 'INV_ITEM_NOT_FOUND', status: 404 });
    item.existencia = await this.#existencia(item.id);
    const renglon = nuevoRenglon({ item, contado: body.contado, contadoPor });

    const previo = await this.lineDAO.porConteoItem(countId, item.id);
    if (previo) {
      await this.lineDAO.update(previo.id, renglon);
    } else {
      await this.lineDAO.create({ countId, ...renglon });
    }
    return { ...renglon, itemDescripcion: item.descripcion, unidad: item.unidad };
  }

  /**
   * Cierra el conteo: por cada renglón con diferencia != 0 genera un ajuste en
   * el kardex (la existencia queda igual a lo contado). Ya no admite capturas.
   */
  async cerrarConteo(id, { actor = {} } = {}) {
    const c = await this.#conteo(id);
    const lines = await this.lineDAO.porConteo(id);
    if (lines.length === 0) {
      throw new DomainError('El conteo no tiene renglones que cerrar', { code: 'CONTEO_VACIO', status: 409 });
    }
    c.cerrar();
    let ajustes = 0;
    for (const l of lines) {
      const dif = q3(l.diferencia);
      if (dif !== 0) {
        await this.movementDAO.create({
          itemId: l.itemId,
          tipo: 'ajuste',
          cantidad: dif,
          motivo: `Conteo físico ${c.folio}`,
          countId: c.id,
          origen: clean(actor.origen, 20) || 'tablet',
          createdBy: clean(actor.name, 120) || c.createdBy,
        });
        ajustes += 1;
      }
    }
    await this.countDAO.update(id, { ...c.toPlain(), closedAt: new Date(), updatedAt: new Date() });
    return this.detalleConteo(id);
  }

  /**
   * Sincroniza el conteo con el SAE: empuja SÓLO los renglones con diferencia
   * (los ajustes). Marca el conteo como sincronizado o con error según responda.
   */
  async sincronizarConteo(id) {
    const c = await this.#conteo(id);
    if (c.estado !== 'cerrado' && c.estado !== 'error') {
      throw new DomainError('Sólo se sincronizan conteos cerrados', { code: 'CONTEO_NO_CERRADO', status: 409 });
    }
    const lines = await this.lineDAO.porConteo(id);
    const ajustes = lines
      .filter((l) => q3(l.diferencia) !== 0)
      .map((l) => ({ sku: l.sku, cantidad: q3(l.diferencia), unidad: l.unidad || undefined }));

    const res = await this.sae.pushAdjustments({
      folio: c.folio,
      ubicacion: c.ubicacion,
      fecha: new Date().toISOString(),
      ajustes,
    });
    c.marcarSae(res);
    await this.countDAO.update(id, { ...c.toPlain(), saeSyncAt: new Date(), updatedAt: new Date() });
    return this.detalleConteo(id);
  }

  // ---------------- Auxiliares ----------------
  async #item(id) {
    const item = await this.itemDAO.findById(id);
    if (!item || !item.activo) throw new DomainError('Artículo no encontrado', { code: 'INV_ITEM_NOT_FOUND', status: 404 });
    return item;
  }

  async #conteo(id) {
    const c = await this.countDAO.findById(id);
    if (!c) throw new DomainError('Conteo no encontrado', { code: 'CONTEO_NOT_FOUND', status: 404 });
    return c;
  }

  async #existencia(itemId) {
    const movs = await this.movementDAO.porItem(itemId, { limit: 100000 });
    return InventoryItem.existencia(movs);
  }

  async #itemConExistencia(id) {
    const item = await this.#item(id);
    const existencia = await this.#existencia(id);
    return { ...item.toPlain(), existencia, bajoMinimo: item.bajoMinimo(existencia) };
  }

  #resumen(lines) {
    const contados = lines.length;
    const conDiferencia = lines.filter((l) => q3(l.diferencia) !== 0).length;
    const difTotal = q3(lines.reduce((a, l) => a + (Number(l.diferencia) || 0), 0));
    return { contados, conDiferencia, difTotal };
  }
}
