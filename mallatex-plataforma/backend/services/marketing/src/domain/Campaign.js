import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { clean } from './Asset.js';

export const CANALES_CAMPANA = ['redes', 'impresos', 'expo', 'mixto'];

/** Normaliza una fecha a 'YYYY-MM-DD' o lanza error de dominio. */
function normFecha(v, campo) {
  const s = clean(v, 40).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new DomainError(`Fecha no válida en ${campo} (YYYY-MM-DD)`, { code: 'CAMPANA_FECHA_INVALIDA' });
  }
  return s;
}

/**
 * Campaign — raíz de agregado del calendario de campañas de marketing
 * (temporalidades de producto/promoción). Valida el rango de fechas y expone
 * la vigencia calculada: hoy dentro del rango y estado distinto de 'cerrada'.
 */
export class Campaign extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.nombre = props.nombre;
    this.descripcion = props.descripcion || '';
    this.color = props.color || '#ED3237';
    this.canal = props.canal || '';
    this.fechaInicio = props.fechaInicio;
    this.fechaFin = props.fechaFin;
    this.productos = Array.isArray(props.productos) ? props.productos : [];
    this.estado = props.estado || 'planeada';
    this.createdBy = props.createdBy || '';
    this.createdAt = props.createdAt || null;
  }

  /** Fecha local de hoy en formato ISO (YYYY-MM-DD). */
  static hoyISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  static crear(body = {}, { createdBy = '' } = {}) {
    const nombre = clean(body.nombre, 200);
    if (!nombre) throw new DomainError('El nombre es obligatorio', { code: 'CAMPANA_NOMBRE_REQUERIDO' });
    const fechaInicio = normFecha(body.fechaInicio, 'fechaInicio');
    const fechaFin = normFecha(body.fechaFin, 'fechaFin');
    if (fechaInicio > fechaFin) {
      throw new DomainError('La fecha de inicio no puede ser posterior a la de fin', {
        code: 'CAMPANA_RANGO_INVALIDO',
      });
    }
    const camp = new Campaign({
      nombre,
      descripcion: clean(body.descripcion, 2000),
      color: clean(body.color, 20) || '#ED3237',
      canal: CANALES_CAMPANA.includes(body.canal) ? body.canal : clean(body.canal, 40),
      fechaInicio,
      fechaFin,
      productos: Array.isArray(body.productos) ? body.productos.map((p) => clean(p, 120)).filter(Boolean) : [],
      estado: 'planeada',
      createdBy: clean(createdBy, 120),
    });
    camp.addDomainEvent(new DomainEvent('CampanaCreada', { nombre, fechaInicio, fechaFin }));
    return camp;
  }

  /** Actualización parcial con las mismas validaciones del alta. */
  aplicar(body = {}) {
    if (body.nombre !== undefined) {
      const nombre = clean(body.nombre, 200);
      if (!nombre) throw new DomainError('El nombre es obligatorio', { code: 'CAMPANA_NOMBRE_REQUERIDO' });
      this.nombre = nombre;
    }
    if (body.descripcion !== undefined) this.descripcion = clean(body.descripcion, 2000);
    if (body.color !== undefined) this.color = clean(body.color, 20) || '#ED3237';
    if (body.canal !== undefined) {
      this.canal = CANALES_CAMPANA.includes(body.canal) ? body.canal : clean(body.canal, 40);
    }
    if (body.fechaInicio !== undefined) this.fechaInicio = normFecha(body.fechaInicio, 'fechaInicio');
    if (body.fechaFin !== undefined) this.fechaFin = normFecha(body.fechaFin, 'fechaFin');
    if (this.fechaInicio > this.fechaFin) {
      throw new DomainError('La fecha de inicio no puede ser posterior a la de fin', {
        code: 'CAMPANA_RANGO_INVALIDO',
      });
    }
    if (body.productos !== undefined) {
      this.productos = Array.isArray(body.productos)
        ? body.productos.map((p) => clean(p, 120)).filter(Boolean)
        : [];
    }
    return this;
  }

  /** ¿Está vigente hoy? (rango inclusivo y no cerrada). */
  vigente(hoy = Campaign.hoyISO()) {
    return this.estado !== 'cerrada' && this.fechaInicio <= hoy && hoy <= this.fechaFin;
  }

  cerrar() {
    this.estado = 'cerrada';
    this.addDomainEvent(new DomainEvent('CampanaCerrada', { nombre: this.nombre }));
    return this;
  }

  toPlain() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      color: this.color,
      canal: this.canal,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
      productos: this.productos,
      estado: this.estado,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
    };
  }

  /** Shape público con la vigencia calculada. */
  toApi(hoy = Campaign.hoyISO()) {
    return { ...this.toPlain(), vigente: this.vigente(hoy) };
  }
}
