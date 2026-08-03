import { Op } from 'sequelize';
import { DomainError } from '@mallatex/shared/ddd';
import { periodSummary, defaultSettings } from '../domain/AttendanceRules.js';
import { vacationBalance } from '../domain/Rh.js';

const REQUEST_TYPES = ['vacaciones', 'permiso_goce', 'permiso_singoce'];

/**
 * PortalService — autoservicio del empleado (sesión código+PIN): su perfil,
 * asistencia, checadas y solicitudes (vacaciones/permisos). Los recibos y
 * tickets del portal se sirven vía RhService.
 */
export class PortalService {
  constructor({ employeeDAO, scheduleDAO, periodDAO, attendanceDayDAO, overtimeDAO, incidentDAO, checadaDAO }) {
    this.employeeDAO = employeeDAO;
    this.scheduleDAO = scheduleDAO;
    this.periodDAO = periodDAO;
    this.attendanceDayDAO = attendanceDayDAO;
    this.overtimeDAO = overtimeDAO;
    this.incidentDAO = incidentDAO;
    this.checadaDAO = checadaDAO;
  }

  async #resolvePeriod(id) {
    if (id) return this.periodDAO.findById(id);
    return (await this.periodDAO.openOrLatest()) || (await this.periodDAO.findAll({}, { order: [['start_date', 'DESC']], limit: 1 }))[0] || null;
  }

  async #vacation(emp) {
    const incidents = await this.incidentDAO.findAll({ employeeId: emp.id, type: 'vacaciones', status: 'autorizada' });
    return vacationBalance(emp, incidents);
  }

  async me(employeeId) {
    const emp = await this.employeeDAO.findById(employeeId);
    if (!emp) throw new DomainError('Empleado no encontrado', { code: 'EMP_NOT_FOUND', status: 404 });
    const schedule = emp.scheduleId ? await this.scheduleDAO.findById(emp.scheduleId) : null;
    const periods = await this.periodDAO.findAll({}, { order: [['start_date', 'DESC']] });
    return {
      employee: { id: emp.id, code: emp.code, name: emp.name, department: emp.department, position: emp.position, profile: emp.appProfile || 'operativo' },
      scheduleName: schedule ? schedule.name : null,
      vacation: await this.#vacation(emp),
      periods,
    };
  }

  async attendance(employeeId, periodId) {
    const period = await this.#resolvePeriod(periodId);
    if (!period) return { period: null, rows: [], summary: null };
    const emp = await this.employeeDAO.findById(employeeId);
    const rows = await this.attendanceDayDAO.findAll(
      { employeeId, date: { [Op.between]: [period.startDate, period.endDate] } },
      { order: [['date', 'DESC']] }
    );
    const otAuth = await this.overtimeDAO.findAll({ employeeId, status: 'autorizada', date: { [Op.between]: [period.startDate, period.endDate] } });
    return { period, rows, summary: periodSummary(period, emp, { attendanceRows: rows, overtimeAuth: otAuth, settings: defaultSettings() }) };
  }

  async checadas(employeeId, periodId) {
    const period = await this.#resolvePeriod(periodId);
    const where = { employeeId };
    if (period) where.timestamp = { [Op.gte]: `${period.startDate}T00:00:00.000`, [Op.lte]: `${period.endDate}T23:59:59.999` };
    return this.checadaDAO.findAll(where, { order: [['ts', 'DESC']] });
  }

  async requests(employeeId) {
    return this.incidentDAO.findAll({ employeeId, type: { [Op.in]: REQUEST_TYPES } }, { order: [['start_date', 'DESC']] });
  }

  async createRequest(employeeId, body = {}) {
    if (!REQUEST_TYPES.includes(body.type)) throw new DomainError('Tipo de solicitud no válido', { code: 'REQUEST_TYPE_INVALID' });
    if (!body.startDate || !body.endDate) throw new DomainError('Indica las fechas', { code: 'DATES_REQUIRED' });
    if (body.endDate < body.startDate) throw new DomainError('La fecha fin no puede ser anterior a la de inicio', { code: 'DATE_RANGE_INVALID' });
    const emp = await this.employeeDAO.findById(employeeId);
    if (!emp) throw new DomainError('Empleado no encontrado', { code: 'EMP_NOT_FOUND', status: 404 });
    if (body.type === 'vacaciones') {
      const days = Math.round((new Date(body.endDate) - new Date(body.startDate)) / 86400000) + 1;
      const bal = await this.#vacation(emp);
      if (days > bal.available) throw new DomainError(`Sólo tienes ${bal.available} día(s) de vacaciones disponibles`, { code: 'VACATION_INSUFFICIENT', status: 409 });
    }
    return this.incidentDAO.create({
      employeeId, type: body.type, startDate: body.startDate, endDate: body.endDate,
      reason: body.reason || '', status: 'pendiente', selfService: true, createdBy: emp.name, authorizedBy: null,
    });
  }

  async deleteRequest(employeeId, id) {
    const i = await this.incidentDAO.findById(id);
    if (!i || i.employeeId !== employeeId) throw new DomainError('Solicitud no encontrada', { code: 'REQUEST_NOT_FOUND', status: 404 });
    if (i.status !== 'pendiente') throw new DomainError('Sólo puedes cancelar solicitudes pendientes', { code: 'REQUEST_LOCKED', status: 409 });
    await this.incidentDAO.delete(id);
    return { ok: true };
  }
}

export { REQUEST_TYPES };
