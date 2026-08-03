import { DomainError } from '@mallatex/shared/ddd';
import { clean } from '../domain/Asset.js';
import { PrintItem, validarMovimiento } from '../domain/PrintItem.js';

/**
 * PrintService — inventario de artículos impresos. La existencia se calcula
 * del historial de movimientos; marketing registra cualquier movimiento y los
 * empleados sólo salidas (con la regla de stock: nunca queda negativo).
 */
export class PrintService {
  constructor({ printItemDAO, printMovementDAO }) {
    this.printItemDAO = printItemDAO;
    this.printMovementDAO = printMovementDAO;
  }

  /** Artículos activos con existencia y bandera de bajo mínimo calculadas. */
  async listar() {
    const items = await this.printItemDAO.findAll({ activo: true }, { order: [['nombre', 'ASC']] });
    const movs = await this.printMovementDAO.porItems(items.map((i) => i.id));
    const porItem = new Map();
    for (const m of movs) {
      const k = String(m.itemId);
      if (!porItem.has(k)) porItem.set(k, []);
      porItem.get(k).push(m);
    }
    return items.map((item) => {
      const existencia = PrintItem.existencia(porItem.get(String(item.id)) || []);
      return { ...item.toPlain(), existencia, bajoMinimo: item.bajoMinimo(existencia) };
    });
  }

  async crear(body = {}) {
    const item = PrintItem.crear(body);
    const saved = await this.printItemDAO.create(item);
    return { ...saved.toPlain(), existencia: 0, bajoMinimo: saved.bajoMinimo(0) };
  }

  async actualizar(id, body = {}) {
    const item = await this.#obtener(id);
    item.aplicar(body);
    await this.printItemDAO.update(id, item);
    return (await this.#detalle(id));
  }

  /** Baja lógica (conserva el historial de movimientos). */
  async eliminar(id) {
    await this.#obtener(id);
    await this.printItemDAO.update(id, { activo: false });
    return { ok: true };
  }

  /** Historial de movimientos de un artículo (DESC, tope 200). */
  async movimientos(itemId) {
    await this.#obtener(itemId);
    return this.printMovementDAO.porItem(itemId);
  }

  /**
   * Registra un movimiento. `actor.soloSalida` viene de la superficie: los
   * empleados sólo registran salidas y quedan como `persona` del movimiento.
   * Una salida que dejaría existencia negativa responde 409 STOCK_INSUFICIENTE.
   */
  async registrarMovimiento(body = {}, { actor = {} } = {}) {
    const item = await this.#obtener(body.itemId);
    const previos = await this.printMovementDAO.porItems([item.id]);
    const existencia = PrintItem.existencia(previos);

    const soloSalida = actor.principal === 'employee';
    const cantidad = validarMovimiento(
      { tipo: body.tipo, cantidad: body.cantidad },
      { existencia, soloSalida }
    );

    const persona = soloSalida ? clean(actor.name, 120) : clean(body.persona, 120) || clean(actor.name, 120);
    const created = await this.printMovementDAO.create({
      itemId: item.id,
      tipo: body.tipo,
      cantidad,
      persona,
      // La app móvil manda `motivo`; la web puede mandar `notas`.
      motivo: clean(body.motivo ?? body.notas, 500),
      createdBy: clean(actor.name, 120),
    });

    const delta = body.tipo === 'entrada' ? cantidad : body.tipo === 'salida' ? -cantidad : cantidad;
    return { ...created, existencia: existencia + delta };
  }

  // ---- Auxiliares ----------------------------------------------------
  async #obtener(id) {
    const item = await this.printItemDAO.findById(id);
    if (!item || !item.activo) {
      throw new DomainError('Artículo no encontrado', { code: 'IMPRESO_NOT_FOUND', status: 404 });
    }
    return item;
  }

  async #detalle(id) {
    const item = await this.#obtener(id);
    const movs = await this.printMovementDAO.porItems([id]);
    const existencia = PrintItem.existencia(movs);
    return { ...item.toPlain(), existencia, bajoMinimo: item.bajoMinimo(existencia) };
  }
}
