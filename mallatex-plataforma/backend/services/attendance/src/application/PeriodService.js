import { Op } from 'sequelize';
import { DomainError } from '@mallatex/shared/ddd';
import { periodSummary, defaultSettings, STATUS } from '../domain/AttendanceRules.js';
import { buildMovements, toFile, defaultNoiConcepts } from '../domain/NoiExport.js';

/**
 * PeriodService — periodos de nómina, resumen/tablero y exportación a NOI.
 * Consolida la información revisada del periodo; bloquea el cierre y la
 * exportación oficial si quedan movimientos pendientes de autorizar.
 */
export class PeriodService {
  constructor({ periodDAO, employeeDAO, attendanceDayDAO, overtimeDAO, incidentDAO, deviceDAO, variableEntryDAO, variableConceptDAO, noiConceptDAO, attendanceService, audit }) {
    this.periodDAO = periodDAO;
    this.employeeDAO = employeeDAO;
    this.attendanceDayDAO = attendanceDayDAO;
    this.overtimeDAO = overtimeDAO;
    this.incidentDAO = incidentDAO;
    this.deviceDAO = deviceDAO;
    this.variableEntryDAO = variableEntryDAO;
    this.variableConceptDAO = variableConceptDAO;
    this.noiConceptDAO = noiConceptDAO;
    this.attendanceService = attendanceService;
    this.audit = audit;
  }

  list() {
    return this.periodDAO.findAll({}, { order: [['start_date', 'DESC']] });
  }

  async get(id) {
    const period = await this.periodDAO.findById(id);
    if (!period) throw new DomainError('Periodo no encontrado', { code: 'PERIOD_NOT_FOUND', status: 404 });
    return period;
  }

  async create(body, userName) {
    if (!body.name || !body.startDate || !body.endDate) {
      throw new DomainError('name, startDate y endDate son obligatorios', { code: 'PERIOD_INVALID' });
    }
    const created = await this.periodDAO.create({
      name: body.name, startDate: body.startDate, endDate: body.endDate, status: 'abierto',
    });
    await this.attendanceService.reprocess({ startDate: body.startDate, endDate: body.endDate });
    await this.audit?.record({ action: 'create', entity: 'period', entityId: String(created.id), userName });
    return created;
  }

  /** Carga las filas del periodo (asistencia, tiempo extra, incidencias, variables). */
  async #periodData(period) {
    const [employees, attendanceRows, overtimeRows, incidents, variableEntries, variableConcepts] = await Promise.all([
      this.employeeDAO.active(),
      this.attendanceDayDAO.findAll({ date: { [Op.between]: [period.startDate, period.endDate] } }),
      this.overtimeDAO.findAll({ date: { [Op.between]: [period.startDate, period.endDate] } }),
      this.incidentDAO.findAll(),
      this.variableEntryDAO.findAll({ periodId: period.id }),
      this.variableConceptDAO.findAll(),
    ]);
    return { employees, attendanceRows, overtimeRows, incidents, variableEntries, variableConcepts };
  }

  async #pending(period, incidents, overtimeRows) {
    const pendingIncidents = incidents.filter(
      (i) => i.status === 'pendiente' && !(i.endDate < period.startDate || i.startDate > period.endDate)
    ).length;
    const pendingOvertime = overtimeRows.filter(
      (o) => o.status === 'pendiente' && o.date >= period.startDate && o.date <= period.endDate
    ).length;
    return { incidents: pendingIncidents, overtime: pendingOvertime };
  }

  async summary(id) {
    const period = await this.get(id);
    const { employees, attendanceRows, overtimeRows, incidents } = await this.#periodData(period);
    const settings = defaultSettings();
    const rows = employees.map((e) => {
      const empAtt = attendanceRows.filter((a) => a.employeeId === e.id);
      const otAuth = overtimeRows.filter((o) => o.employeeId === e.id && o.status === 'autorizada');
      const s = periodSummary(period, e, { attendanceRows: empAtt, overtimeAuth: otAuth, settings });
      return { employee: { id: e.id, name: e.name, code: e.code, department: e.department }, ...s };
    });
    const pending = await this.#pending(period, incidents, overtimeRows);
    const omisiones = attendanceRows.filter((a) => a.status === STATUS.OMISION).length;
    return { period, rows, pending: { ...pending, omisiones } };
  }

  async close(id, force, userName) {
    const period = await this.get(id);
    if (period.status === 'cerrado') throw new DomainError('El periodo ya está cerrado', { code: 'PERIOD_ALREADY_CLOSED', status: 409 });
    const { incidents, overtimeRows } = await this.#periodData(period);
    const pending = await this.#pending(period, incidents, overtimeRows);
    if (!force && (pending.incidents || pending.overtime)) {
      throw new DomainError('Existen movimientos pendientes de autorizar', { code: 'PERIOD_PENDING', status: 409, details: { pending } });
    }
    const updated = await this.periodDAO.update(id, { status: 'cerrado', closedBy: userName || null, closedAt: new Date() });
    await this.audit?.record({ action: 'close', entity: 'period', entityId: String(id), userName });
    return updated;
  }

  async reopen(id, userName) {
    await this.get(id);
    const updated = await this.periodDAO.update(id, { status: 'abierto', closedBy: null, closedAt: null });
    await this.audit?.record({ action: 'reopen', entity: 'period', entityId: String(id), userName });
    return updated;
  }

  // ------------------------------------------------------------------
  //  Tablero / KPIs
  // ------------------------------------------------------------------
  async dashboard(periodId) {
    const period = periodId ? await this.periodDAO.findById(periodId) : (await this.periodDAO.openOrLatest()) || (await this.periodDAO.findAll({}, { order: [['start_date', 'DESC']], limit: 1 }))[0];
    if (!period) return { period: null };
    const { employees, attendanceRows, overtimeRows, incidents } = await this.#periodData(period);
    const settings = defaultSettings();

    const counts = { asistencia: 0, retardo: 0, falta: 0, omision: 0, vacaciones: 0, permiso: 0, incapacidad: 0, justificada: 0, descanso: 0, festivo: 0 };
    let lateMin = 0;
    for (const a of attendanceRows) {
      if (a.status in counts) counts[a.status]++;
      lateMin += a.lateMinutes || 0;
    }
    const overtimeMin = overtimeRows.filter((o) => o.status === 'autorizada').reduce((s, o) => s + (o.authorizedMinutes || 0), 0);
    const pending = await this.#pending(period, incidents, overtimeRows);
    const bonusEligible = employees.filter((e) => {
      const empAtt = attendanceRows.filter((a) => a.employeeId === e.id);
      const otAuth = overtimeRows.filter((o) => o.employeeId === e.id && o.status === 'autorizada');
      return periodSummary(period, e, { attendanceRows: empAtt, overtimeAuth: otAuth, settings }).bonusEligible;
    }).length;
    const device = (await this.deviceDAO.findAll({}, { limit: 1 }))[0] || null;

    return {
      period,
      employees: employees.length,
      counts,
      overtimeHours: Math.round((overtimeMin / 60) * 10) / 10,
      lateMinutes: lateMin,
      device: device ? { name: device.name, lastSync: device.lastSync, model: device.model } : null,
      pending,
      bonusEligible,
    };
  }

  // ------------------------------------------------------------------
  //  Exportación NOI
  // ------------------------------------------------------------------
  async #concepts() {
    const stored = await this.noiConceptDAO.findAll();
    return stored.length ? stored : defaultNoiConcepts();
  }

  async noiPreview(id) {
    const period = await this.get(id);
    const data = await this.#periodData(period);
    const concepts = await this.#concepts();
    return buildMovements(period, { ...data, concepts, settings: defaultSettings() });
  }

  async noiExport(id, format, force) {
    const period = await this.get(id);
    const data = await this.#periodData(period);
    const concepts = await this.#concepts();
    const { movements, pending } = buildMovements(period, { ...data, concepts, settings: defaultSettings() });
    if (!force && (pending.incidents || pending.overtime)) {
      throw new DomainError('Hay movimientos pendientes de autorizar', { code: 'NOI_PENDING', status: 409, details: { pending } });
    }
    const fmt = format === 'csv' ? 'csv' : 'txt';
    const content = toFile(movements, fmt);
    const safeName = String(period.name).replaceAll(/[^\w]+/g, '_');
    await this.audit?.record({ action: 'export', entity: 'noi', entityId: String(id), detail: { movimientos: movements.length, format: fmt } });
    return {
      content,
      filename: `NOI_${safeName}.${fmt}`,
      mime: fmt === 'csv' ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8',
    };
  }
}
