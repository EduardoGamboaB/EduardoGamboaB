import { Op } from 'sequelize';
import { DomainError } from '@mallatex/shared/ddd';
import { vacationBalance, computePayslip, indicators } from '../domain/Rh.js';
import { periodSummary, defaultSettings } from '../domain/AttendanceRules.js';

/**
 * RhService — Recursos Humanos administrativo: saldos de vacaciones, recibos
 * preliminares, tickets e indicadores agregados.
 */
export class RhService {
  constructor({ employeeDAO, periodDAO, attendanceDayDAO, overtimeDAO, incidentDAO, payslipDAO, ticketDAO, audit }) {
    this.employeeDAO = employeeDAO;
    this.periodDAO = periodDAO;
    this.attendanceDayDAO = attendanceDayDAO;
    this.overtimeDAO = overtimeDAO;
    this.incidentDAO = incidentDAO;
    this.payslipDAO = payslipDAO;
    this.ticketDAO = ticketDAO;
    this.audit = audit;
  }

  // ---------- Vacaciones ----------
  async vacationBalances() {
    const [employees, incidents] = await Promise.all([this.employeeDAO.active(), this.incidentDAO.findAll({ type: 'vacaciones', status: 'autorizada' })]);
    return employees.map((e) => ({
      id: e.id, name: e.name, code: e.code, department: e.department, hireDate: e.hireDate,
      ...vacationBalance(e, incidents),
    }));
  }

  // ---------- Recibos ----------
  async generatePayslips(periodId, userName) {
    const period = await this.periodDAO.findById(periodId);
    if (!period) throw new DomainError('Periodo no encontrado', { code: 'PERIOD_NOT_FOUND', status: 404 });
    const [employees, attendanceRows, overtimeRows, incidents] = await Promise.all([
      this.employeeDAO.active(),
      this.attendanceDayDAO.findAll({ date: { [Op.between]: [period.startDate, period.endDate] } }),
      this.overtimeDAO.findAll({ date: { [Op.between]: [period.startDate, period.endDate] }, status: 'autorizada' }),
      this.incidentDAO.findAll(),
    ]);
    const settings = defaultSettings();
    // Reemplaza los recibos previos del periodo
    await this.payslipDAO.deleteWhere({ periodId: period.id });
    let count = 0;
    for (const emp of employees) {
      const empAtt = attendanceRows.filter((a) => a.employeeId === emp.id);
      const otAuth = overtimeRows.filter((o) => o.employeeId === emp.id);
      const calc = computePayslip(period, emp, { attendanceRows: empAtt, overtimeAuth: otAuth, incidents, settings });
      await this.payslipDAO.create({
        employeeId: emp.id, periodId: period.id,
        perceptions: calc.perceptions, deductions: calc.deductions,
        totalP: calc.totalP, totalD: calc.totalD, neto: calc.neto, emittedAt: new Date(),
      });
      count++;
    }
    await this.audit?.record({ action: 'generate', entity: 'payslip', entityId: String(period.id), userName, detail: { count } });
    return { ok: true, count };
  }

  async listPayslips({ periodId } = {}) {
    const where = {};
    if (periodId) where.periodId = Number(periodId);
    const [items, employees, periods] = await Promise.all([this.payslipDAO.findAll(where), this.employeeDAO.findAll(), this.periodDAO.findAll()]);
    const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
    const periodById = Object.fromEntries(periods.map((p) => [p.id, p]));
    return items.map(({ perceptions, deductions, ...rest }) => {
      const e = empById[rest.employeeId] || {};
      const p = periodById[rest.periodId] || {};
      return { ...rest, employeeName: e.name, employeeCode: e.code, department: e.department, periodName: p.name };
    });
  }

  async getPayslip(id, employeeId = null) {
    const p = await this.payslipDAO.findById(id);
    if (!p || (employeeId != null && p.employeeId !== employeeId)) throw new DomainError('Recibo no encontrado', { code: 'PAYSLIP_NOT_FOUND', status: 404 });
    return p;
  }

  async payslipsForEmployee(employeeId) {
    const items = await this.payslipDAO.findAll({ employeeId }, { order: [['emitted_at', 'DESC']] });
    return items.map(({ perceptions, deductions, ...rest }) => rest);
  }

  // ---------- Tickets ----------
  async listTickets({ status } = {}) {
    const where = {};
    if (status) where.status = status;
    return this.ticketDAO.findAll(where, { order: [['created_at', 'DESC']] });
  }

  async ticketsForEmployee(employeeId) {
    return this.ticketDAO.findAll({ employeeId }, { order: [['created_at', 'DESC']] });
  }

  async createTicket(employeeId, employeeName, body) {
    if (!body.subject || !body.message) throw new DomainError('Asunto y mensaje son obligatorios', { code: 'TICKET_INVALID' });
    return this.ticketDAO.create({
      employeeId, employeeName, category: body.category || 'General', subject: body.subject, status: 'abierto',
      messages: [{ by: employeeName, role: 'empleado', message: body.message, at: new Date().toISOString() }],
    });
  }

  async replyTicket(id, { message, status } = {}, { by, role }, ownerEmployeeId = null) {
    const t = await this.ticketDAO.findById(id);
    if (!t || (ownerEmployeeId != null && t.employeeId !== ownerEmployeeId)) throw new DomainError('Ticket no encontrado', { code: 'TICKET_NOT_FOUND', status: 404 });
    const messages = [...(t.messages || []), { by, role, message: message || '', at: new Date().toISOString() }];
    let nextStatus = status;
    if (!nextStatus) {
      if (role === 'empleado') nextStatus = t.status === 'resuelto' ? 'abierto' : t.status;
      else nextStatus = t.status === 'abierto' ? 'en_proceso' : t.status;
    }
    return this.ticketDAO.update(id, { messages, status: nextStatus });
  }

  async updateTicket(id, status) {
    const t = await this.ticketDAO.findById(id);
    if (!t) throw new DomainError('Ticket no encontrado', { code: 'TICKET_NOT_FOUND', status: 404 });
    return this.ticketDAO.update(id, { status: status || t.status });
  }

  // ---------- Indicadores ----------
  async indicators(periodId) {
    const period = periodId ? await this.periodDAO.findById(periodId) : (await this.periodDAO.openOrLatest()) || (await this.periodDAO.findAll({}, { order: [['start_date', 'DESC']], limit: 1 }))[0];
    if (!period) return { period: null };
    const [employees, attendanceRows, overtimeRows, incidents, tickets] = await Promise.all([
      this.employeeDAO.active(),
      this.attendanceDayDAO.findAll({ date: { [Op.between]: [period.startDate, period.endDate] } }),
      this.overtimeDAO.findAll({ date: { [Op.between]: [period.startDate, period.endDate] }, status: 'autorizada' }),
      this.incidentDAO.findAll(),
      this.ticketDAO.findAll(),
    ]);
    const settings = defaultSettings();
    const bonusEligibleCount = employees.filter((e) => {
      const empAtt = attendanceRows.filter((a) => a.employeeId === e.id);
      const otAuth = overtimeRows.filter((o) => o.employeeId === e.id);
      return periodSummary(period, e, { attendanceRows: empAtt, overtimeAuth: otAuth, settings }).bonusEligible;
    }).length;
    return indicators(period, { employees, attendanceRows, overtimeAuth: overtimeRows, tickets, incidents, bonusEligibleCount });
  }
}
