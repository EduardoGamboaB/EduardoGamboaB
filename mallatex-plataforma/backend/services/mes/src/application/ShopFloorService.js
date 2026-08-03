import { DomainError } from '@mallatex/shared/ddd';
import { Roll } from '../domain/Roll.js';
import { Aviso } from '../domain/Aviso.js';
import { Merma } from '../domain/Merma.js';

/**
 * ShopFloorService — casos de uso de piso de producción: catálogo de líneas y
 * operadores, inventario de rollos, avisos, mermas y productividad por turno.
 * También sirve los flujos de la tablet de línea (MT-PC-003 actividades 7-23).
 */
export class ShopFloorService {
  constructor({ lineDAO, operatorDAO, rollDAO, avisoDAO, mermaDAO, productividadDAO }) {
    this.lineDAO = lineDAO;
    this.operatorDAO = operatorDAO;
    this.rollDAO = rollDAO;
    this.avisoDAO = avisoDAO;
    this.mermaDAO = mermaDAO;
    this.productividadDAO = productividadDAO;
  }

  // ---- Líneas -------------------------------------------------------
  lines() {
    return this.lineDAO.list();
  }

  createLine(data) {
    return this.lineDAO.create(data);
  }

  updateLine(id, data) {
    return this.lineDAO.update(id, data);
  }

  // ---- Operadores ---------------------------------------------------
  operators(filters) {
    return this.operatorDAO.list(filters);
  }

  createOperator(data) {
    return this.operatorDAO.create(data);
  }

  updateOperator(id, data) {
    return this.operatorDAO.update(id, data);
  }

  // ---- Rollos -------------------------------------------------------
  rolls(filters) {
    return this.rollDAO.list(filters);
  }

  scanRoll(code) {
    return this.rollDAO.findByCode(code);
  }

  async createRoll(data) {
    const roll = Roll.create(data);
    return this.rollDAO.create(roll);
  }

  updateRoll(id, data) {
    return this.rollDAO.update(id, data);
  }

  // ---- Avisos -------------------------------------------------------
  avisos(filters) {
    return this.avisoDAO.list(filters);
  }

  async createAviso(data) {
    const aviso = Aviso.create({ ...data, ts: data.ts || new Date() });
    return this.avisoDAO.create(aviso);
  }

  updateAviso(id, data) {
    return this.avisoDAO.update(id, data);
  }

  // ---- Mermas -------------------------------------------------------
  mermas(filters) {
    return this.mermaDAO.list(filters);
  }

  async createMerma(data) {
    // La fecha es NOT NULL en la base: si no viene, se registra hoy.
    const merma = Merma.create({ ...data, fecha: data.fecha || new Date() });
    return this.mermaDAO.create(merma);
  }

  // ---- Productividad ------------------------------------------------
  productividad(filters) {
    return this.productividadDAO.list(filters);
  }

  /**
   * Registra la productividad de un turno calculando el rendimiento:
   * ml_hr = metros / horas, pz_hr = piezas / horas (MT-PC-003).
   */
  async createProductividad(data) {
    const horas = Number(data.horas ?? 0);
    if (horas <= 0) {
      throw new DomainError('Las horas deben ser mayores a cero', { code: 'PROD_HORAS_INVALID' });
    }
    const metros = Number(data.metros ?? 0);
    const piezas = Number(data.piezas ?? 0);
    return this.productividadDAO.create({
      ...data,
      metros,
      piezas,
      horas,
      mlHr: Number((metros / horas).toFixed(2)),
      pzHr: Number((piezas / horas).toFixed(2)),
    });
  }

  // ---- Tablet de línea ---------------------------------------------
  /** Escaneo de rollo por QR: lo pone en línea e iniciado. */
  async tabletScan({ code, orderId }) {
    const roll = await this.rollDAO.findByCode(code);
    if (!roll) throw new DomainError('Rollo no encontrado', { code: 'ROLL_NOT_FOUND', status: 404 });
    roll.escanearEnLinea(orderId);
    return this.rollDAO.update(roll.id, roll);
  }

  /** Alerta desde tablet -> aviso de piso. */
  tabletAlert(data) {
    return this.createAviso(data);
  }

  /** Merma reportada desde tablet. */
  tabletMerma(data) {
    return this.createMerma({ ...data, fecha: data.fecha || new Date() });
  }
}
