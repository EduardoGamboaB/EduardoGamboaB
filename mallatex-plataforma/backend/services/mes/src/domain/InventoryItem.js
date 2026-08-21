import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';

export const TIPOS_MOVIMIENTO_INV = ['entrada', 'salida', 'ajuste'];

/** Normaliza texto: recorta y limita longitud. */
export function clean(v, max = 200) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}

/** Redondea a 3 decimales (cantidades de inventario NUMERIC(14,3)). */
export function q3(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return NaN;
  return Math.round(x * 1000) / 1000;
}

/**
 * InventoryItem — artículo de inventario MES. El SKU coincide con el del SAE.
 * La existencia NO se persiste: se calcula del historial de movimientos
 * (entradas - salidas +/- ajustes). Mismo modelo de kardex que el inventario de
 * impresos, pero con cantidades decimales (kg, m, etc.).
 */
export class InventoryItem extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.sku = props.sku;
    this.descripcion = props.descripcion;
    this.unidad = props.unidad || 'pza';
    this.ubicacion = props.ubicacion || '';
    this.minimo = Number(props.minimo || 0);
    this.activo = props.activo ?? true;
    this.createdAt = props.createdAt || null;
  }

  static crear(body = {}) {
    const sku = clean(body.sku, 60);
    if (!sku) throw new DomainError('El SKU es obligatorio', { code: 'INV_SKU_REQUERIDO' });
    const descripcion = clean(body.descripcion, 300);
    if (!descripcion) throw new DomainError('La descripción es obligatoria', { code: 'INV_DESC_REQUERIDA' });
    const minimo = Math.max(0, q3(body.minimo) || 0);
    const item = new InventoryItem({
      sku,
      descripcion,
      unidad: clean(body.unidad, 20) || 'pza',
      ubicacion: clean(body.ubicacion, 120),
      minimo,
    });
    item.addDomainEvent(new DomainEvent('InventarioArticuloCreado', { sku }));
    return item;
  }

  aplicar(body = {}) {
    if (body.descripcion !== undefined) {
      const d = clean(body.descripcion, 300);
      if (!d) throw new DomainError('La descripción es obligatoria', { code: 'INV_DESC_REQUERIDA' });
      this.descripcion = d;
    }
    if (body.unidad !== undefined) this.unidad = clean(body.unidad, 20) || 'pza';
    if (body.ubicacion !== undefined) this.ubicacion = clean(body.ubicacion, 120);
    if (body.minimo !== undefined) this.minimo = Math.max(0, q3(body.minimo) || 0);
    return this;
  }

  /** Existencia calculada: entradas suman, salidas restan, ajustes suman con signo. */
  static existencia(movimientos = []) {
    return q3(
      movimientos.reduce((acc, m) => {
        const n = Number(m.cantidad) || 0;
        if (m.tipo === 'entrada') return acc + Math.abs(n);
        if (m.tipo === 'salida') return acc - Math.abs(n);
        if (m.tipo === 'ajuste') return acc + n; // puede ser negativo
        return acc;
      }, 0)
    );
  }

  bajoMinimo(existencia) {
    return this.minimo > 0 && existencia <= this.minimo;
  }

  toPlain() {
    return {
      id: this.id,
      sku: this.sku,
      descripcion: this.descripcion,
      unidad: this.unidad,
      ubicacion: this.ubicacion,
      minimo: this.minimo,
      activo: this.activo,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Valida un movimiento de inventario y devuelve la cantidad normalizada (3 dec.).
 * entrada/salida > 0; ajuste != 0; una salida no puede dejar la existencia
 * negativa (STOCK_INSUFICIENTE, 409).
 */
export function validarMovimientoInv({ tipo, cantidad } = {}, { existencia = 0 } = {}) {
  if (!TIPOS_MOVIMIENTO_INV.includes(tipo)) {
    throw new DomainError('Tipo de movimiento no válido (entrada|salida|ajuste)', { code: 'INV_TIPO_INVALIDO' });
  }
  const n = q3(cantidad);
  if (!Number.isFinite(n)) throw new DomainError('Cantidad no válida', { code: 'INV_CANTIDAD_INVALIDA' });
  if ((tipo === 'entrada' || tipo === 'salida') && n <= 0) {
    throw new DomainError('La cantidad debe ser mayor a cero', { code: 'INV_CANTIDAD_INVALIDA' });
  }
  if (tipo === 'ajuste' && n === 0) {
    throw new DomainError('El ajuste no puede ser cero', { code: 'INV_CANTIDAD_INVALIDA' });
  }
  if (tipo === 'salida' && q3(existencia - n) < 0) {
    throw new DomainError('Existencia insuficiente para registrar la salida', {
      code: 'STOCK_INSUFICIENTE',
      status: 409,
    });
  }
  return n;
}
