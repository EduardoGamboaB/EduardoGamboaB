import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { clean } from './Asset.js';

export const TIPOS_MOVIMIENTO = ['entrada', 'salida', 'ajuste'];
export const CATEGORIAS_IMPRESO = ['muestrario', 'tarjeta', 'carpeta', 'souvenir', 'otro'];

/**
 * PrintItem — raíz de agregado del inventario de artículos impresos
 * (muestrarios, tarjetas, carpetas, souvenirs…). La existencia no se guarda:
 * se calcula del historial de movimientos (entradas - salidas +/- ajustes),
 * y las reglas de stock viven aquí (una salida no puede dejar negativo).
 */
export class PrintItem extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.nombre = props.nombre;
    this.categoria = props.categoria || 'otro';
    this.unidad = props.unidad || 'pieza';
    this.minimo = Number(props.minimo || 0);
    this.notas = props.notas || '';
    this.activo = props.activo ?? true;
    this.createdAt = props.createdAt || null;
  }

  static crear(body = {}) {
    const nombre = clean(body.nombre, 200);
    if (!nombre) throw new DomainError('El nombre es obligatorio', { code: 'IMPRESO_NOMBRE_REQUERIDO' });
    const minimo = Math.max(0, Math.trunc(Number(body.minimo) || 0));
    const item = new PrintItem({
      nombre,
      categoria: CATEGORIAS_IMPRESO.includes(body.categoria) ? body.categoria : clean(body.categoria, 60) || 'otro',
      unidad: clean(body.unidad, 40) || 'pieza',
      minimo,
      notas: clean(body.notas, 1000),
    });
    item.addDomainEvent(new DomainEvent('ImpresoCreado', { nombre }));
    return item;
  }

  aplicar(body = {}) {
    if (body.nombre !== undefined) {
      const nombre = clean(body.nombre, 200);
      if (!nombre) throw new DomainError('El nombre es obligatorio', { code: 'IMPRESO_NOMBRE_REQUERIDO' });
      this.nombre = nombre;
    }
    if (body.categoria !== undefined) {
      this.categoria = CATEGORIAS_IMPRESO.includes(body.categoria)
        ? body.categoria
        : clean(body.categoria, 60) || 'otro';
    }
    if (body.unidad !== undefined) this.unidad = clean(body.unidad, 40) || 'pieza';
    if (body.minimo !== undefined) this.minimo = Math.max(0, Math.trunc(Number(body.minimo) || 0));
    if (body.notas !== undefined) this.notas = clean(body.notas, 1000);
    return this;
  }

  desactivar() {
    this.activo = false;
  }

  /** Existencia calculada: entradas suman, salidas restan, ajustes suman con signo. */
  static existencia(movimientos = []) {
    return movimientos.reduce((acc, m) => {
      const n = Number(m.cantidad) || 0;
      if (m.tipo === 'entrada') return acc + Math.abs(n);
      if (m.tipo === 'salida') return acc - Math.abs(n);
      if (m.tipo === 'ajuste') return acc + n; // puede ser negativo
      return acc;
    }, 0);
  }

  /** ¿La existencia llegó al mínimo configurado? */
  bajoMinimo(existencia) {
    return this.minimo > 0 && existencia <= this.minimo;
  }

  toPlain() {
    return {
      id: this.id,
      nombre: this.nombre,
      categoria: this.categoria,
      unidad: this.unidad,
      minimo: this.minimo,
      notas: this.notas,
      activo: this.activo,
      createdAt: this.createdAt,
    };
  }
}

/**
 * Valida un movimiento de inventario y devuelve la cantidad normalizada.
 * Reglas: tipo del catálogo; entrada/salida con cantidad > 0; ajuste distinto
 * de cero; los empleados sólo registran salidas; una salida no puede dejar la
 * existencia en negativo (STOCK_INSUFICIENTE, 409).
 */
export function validarMovimiento({ tipo, cantidad } = {}, { existencia = 0, soloSalida = false } = {}) {
  if (!TIPOS_MOVIMIENTO.includes(tipo)) {
    throw new DomainError('Tipo de movimiento no válido (entrada|salida|ajuste)', { code: 'MOV_TIPO_INVALIDO' });
  }
  if (soloSalida && tipo !== 'salida') {
    throw new DomainError('Los empleados sólo pueden registrar salidas', {
      code: 'MOV_SOLO_SALIDA',
      status: 403,
    });
  }
  const n = Math.trunc(Number(cantidad));
  if (!Number.isFinite(n)) {
    throw new DomainError('Cantidad no válida', { code: 'MOV_CANTIDAD_INVALIDA' });
  }
  if ((tipo === 'entrada' || tipo === 'salida') && n <= 0) {
    throw new DomainError('La cantidad debe ser mayor a cero', { code: 'MOV_CANTIDAD_INVALIDA' });
  }
  if (tipo === 'ajuste' && n === 0) {
    throw new DomainError('El ajuste no puede ser cero', { code: 'MOV_CANTIDAD_INVALIDA' });
  }
  if (tipo === 'salida' && existencia - n < 0) {
    throw new DomainError('Existencia insuficiente para registrar la salida', {
      code: 'STOCK_INSUFICIENTE',
      status: 409,
    });
  }
  return n;
}
