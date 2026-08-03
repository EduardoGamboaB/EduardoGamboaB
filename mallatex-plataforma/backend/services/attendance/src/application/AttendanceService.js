import { Op } from 'sequelize';
import { DomainError } from '@mallatex/shared/ddd';
import { computeDay, overtimeCandidate, eachDate, dateOf, defaultSettings, STATUS } from '../domain/AttendanceRules.js';

const MANUAL_STATUSES = [
  STATUS.ASISTENCIA, STATUS.RETARDO, STATUS.FALTA, STATUS.JUSTIFICADA,
  STATUS.VACACIONES, STATUS.PERMISO, STATUS.INCAPACIDAD, STATUS.DESCANSO,
  STATUS.FESTIVO, STATUS.OMISION,
];

const INCIDENT_TYPES = ['vacaciones', 'permiso_goce', 'permiso_singoce', 'incapacidad', 'falta_justificada', 'festivo', 'descanso'];

/**
 * AttendanceService — orquesta el motor de reglas (dominio) con la persistencia:
 * carga de checadas/incidencias/horarios, reproceso del rango, y la operación
 * diaria (checadas, correcciones, incidencias, tiempo extra).
 */
export class AttendanceService {
  constructor({ employeeDAO, scheduleDAO, checadaDAO, attendanceDayDAO, incidentDAO, overtimeDAO, periodDAO, audit }) {
    this.employeeDAO = employeeDAO;
    this.scheduleDAO = scheduleDAO;
    this.checadaDAO = checadaDAO;
    this.attendanceDayDAO = attendanceDayDAO;
    this.incidentDAO = incidentDAO;
    this.overtimeDAO = overtimeDAO;
    this.periodDAO = periodDAO;
    this.audit = audit;
  }

  // ------------------------------------------------------------------
  //  Reproceso del motor de reglas
  // ------------------------------------------------------------------
  /**
   * Reprocesa el rango [startDate,endDate] para uno o todos los empleados.
   * Preserva la clasificación manual (manualStatus) pero recalcula métricas.
   * Devuelve el número de registros afectados.
   */
  async reprocess({ startDate, endDate, employeeIds = null } = {}) {
    if (!startDate || !endDate) throw new DomainError('startDate y endDate son obligatorios', { code: 'RANGE_REQUIRED' });
    const settings = defaultSettings();

    const empWhere = { active: true };
    if (employeeIds && employeeIds.length) empWhere.id = { [Op.in]: employeeIds.map(Number) };
    const employees = await this.employeeDAO.findAll(empWhere);
    if (!employees.length) return 0;
    const ids = employees.map((e) => e.id);

    const schedules = await this.scheduleDAO.findAll();
    const schedulesById = Object.fromEntries(schedules.map((s) => [s.id, s]));

    const checadas = await this.checadaDAO.findAll({
      employeeId: { [Op.in]: ids },
      timestamp: { [Op.gte]: `${startDate}T00:00:00.000`, [Op.lte]: `${endDate}T23:59:59.999` },
    });
    const incidents = await this.incidentDAO.findAll({
      employeeId: { [Op.in]: ids },
      status: 'autorizada',
    });

    const dates = eachDate(startDate, endDate);
    const computedDays = [];
    let count = 0;

    for (const emp of employees) {
      const schedule = schedulesById[emp.scheduleId];
      for (const date of dates) {
        const computed = computeDay(emp, date, { schedule, checadas, incidents, settings });
        const existing = await this.attendanceDayDAO.findByEmployeeDate(emp.id, date);
        if (existing) {
          const patch = { ...computed };
          // Respetar corrección manual del estatus
          if (existing.manualStatus) {
            patch.status = existing.manualStatus;
            patch.manualStatus = existing.manualStatus;
            patch.manualNote = existing.manualNote;
          }
          await this.attendanceDayDAO.update(existing.id, patch);
        } else {
          await this.attendanceDayDAO.create({ ...computed, manualStatus: null });
        }
        computedDays.push(computed);
        count++;
      }
    }

    await this.#syncOvertimeCandidates(computedDays);
    return count;
  }

  /** Crea/actualiza candidatos de tiempo extra a partir de los días calculados. */
  async #syncOvertimeCandidates(computedDays) {
    for (const day of computedDays) {
      const candidate = overtimeCandidate(day);
      if (!candidate) continue;
      const existing = await this.overtimeDAO.findByEmployeeDate(day.employeeId, day.date);
      if (existing) {
        if (existing.status === 'pendiente') {
          await this.overtimeDAO.update(existing.id, { calculatedMinutes: candidate.calculatedMinutes });
        }
      } else {
        await this.overtimeDAO.create(candidate);
      }
    }
  }

  async periodOf(date) {
    return this.periodDAO.findOne({ startDate: { [Op.lte]: date }, endDate: { [Op.gte]: date } });
  }

  // ------------------------------------------------------------------
  //  Checadas
  // ------------------------------------------------------------------
  async listChecadas({ employeeId, date, start, end } = {}) {
    const where = {};
    if (employeeId) where.employeeId = Number(employeeId);
    if (date) where.timestamp = { [Op.gte]: `${date}T00:00:00.000`, [Op.lte]: `${date}T23:59:59.999` };
    else if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp[Op.gte] = `${start}T00:00:00.000`;
      if (end) where.timestamp[Op.lte] = `${end}T23:59:59.999`;
    }
    return this.checadaDAO.findAll(where, { order: [['ts', 'ASC']] });
  }

  async createChecada(body, userName) {
    if (!body.employeeId || !body.timestamp) {
      throw new DomainError('employeeId y timestamp son obligatorios', { code: 'CHECADA_INVALID' });
    }
    const emp = await this.employeeDAO.findById(body.employeeId);
    if (!emp) throw new DomainError('Empleado no encontrado', { code: 'EMP_NOT_FOUND', status: 404 });
    const created = await this.checadaDAO.create({
      employeeId: emp.id,
      deviceId: emp.deviceId || null,
      timestamp: body.timestamp,
      type: body.type || 'entrada',
      method: 'manual',
      raw: { origen: 'CAPTURA-MANUAL', by: userName || null },
    });
    const date = dateOf(created.timestamp);
    await this.reprocess({ startDate: date, endDate: date, employeeIds: [emp.id] });
    await this.audit?.record({ action: 'create', entity: 'checada', entityId: String(created.id), userName });
    return created;
  }

  // ------------------------------------------------------------------
  //  Asistencia (revisión)
  // ------------------------------------------------------------------
  async listAttendance({ start, end, employeeId, department, status } = {}) {
    const where = {};
    if (start || end) {
      where.date = {};
      if (start) where.date[Op.gte] = start;
      if (end) where.date[Op.lte] = end;
    }
    if (employeeId) where.employeeId = Number(employeeId);
    if (status) where.status = status;
    const rows = await this.attendanceDayDAO.findAll(where, { order: [['date', 'DESC']] });
    const empById = await this.#employeesById();
    let enriched = rows.map((a) => {
      const e = empById[a.employeeId] || {};
      return { ...a, employeeName: e.name, employeeCode: e.code, department: e.department };
    });
    if (department) enriched = enriched.filter((a) => a.department === department);
    return enriched;
  }

  async correctAttendance(id, body = {}, userName) {
    const a = await this.attendanceDayDAO.findById(id);
    if (!a) throw new DomainError('Registro no encontrado', { code: 'ATT_NOT_FOUND', status: 404 });
    const period = await this.periodOf(a.date);
    if (period && period.status === 'cerrado') {
      throw new DomainError('El periodo está cerrado; no se puede modificar', { code: 'PERIOD_CLOSED', status: 409 });
    }
    if (body.status && !MANUAL_STATUSES.includes(body.status)) {
      throw new DomainError('Estatus no válido', { code: 'STATUS_INVALID' });
    }
    if (!body.reason) throw new DomainError('El motivo de la corrección es obligatorio', { code: 'REASON_REQUIRED' });
    const status = body.status || a.status;
    const patch = { status, manualStatus: status, manualNote: body.reason };
    if ('overtimeMinutes' in body) patch.overtimeMinutes = Number(body.overtimeMinutes) || 0;
    const updated = await this.attendanceDayDAO.update(id, patch);
    await this.audit?.record({ action: 'correct', entity: 'attendance', entityId: String(id), userName, detail: { from: a.status, to: status, reason: body.reason } });
    return updated;
  }

  // ------------------------------------------------------------------
  //  Incidencias
  // ------------------------------------------------------------------
  async listIncidents({ status, employeeId } = {}) {
    const where = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = Number(employeeId);
    const rows = await this.incidentDAO.findAll(where, { order: [['start_date', 'DESC']] });
    const empById = await this.#employeesById();
    return rows.map((i) => ({ ...i, employeeName: empById[i.employeeId]?.name }));
  }

  async createIncident(body, userName) {
    if (!body.employeeId || !body.type || !body.startDate || !body.endDate) {
      throw new DomainError('employeeId, type, startDate y endDate son obligatorios', { code: 'INCIDENT_INVALID' });
    }
    if (!INCIDENT_TYPES.includes(body.type)) throw new DomainError('Tipo de incidencia no válido', { code: 'INCIDENT_TYPE_INVALID' });
    if (body.endDate < body.startDate) throw new DomainError('La fecha fin no puede ser anterior a la de inicio', { code: 'DATE_RANGE_INVALID' });
    const created = await this.incidentDAO.create({
      employeeId: Number(body.employeeId),
      type: body.type,
      startDate: body.startDate,
      endDate: body.endDate,
      reason: body.reason || '',
      status: 'pendiente',
      createdBy: userName || null,
      authorizedBy: null,
      selfService: body.selfService === true,
    });
    await this.audit?.record({ action: 'create', entity: 'incident', entityId: String(created.id), userName });
    return created;
  }

  async updateIncident(id, body = {}) {
    const i = await this.incidentDAO.findById(id);
    if (!i) throw new DomainError('Incidencia no encontrada', { code: 'INCIDENT_NOT_FOUND', status: 404 });
    if (i.status === 'autorizada') throw new DomainError('La incidencia ya está autorizada', { code: 'INCIDENT_LOCKED', status: 409 });
    const patch = {};
    for (const k of ['type', 'startDate', 'endDate', 'reason']) if (k in body) patch[k] = body[k];
    return this.incidentDAO.update(id, patch);
  }

  async authorizeIncident(id, userName) {
    const i = await this.incidentDAO.findById(id);
    if (!i) throw new DomainError('Incidencia no encontrada', { code: 'INCIDENT_NOT_FOUND', status: 404 });
    const updated = await this.incidentDAO.update(id, { status: 'autorizada', authorizedBy: userName || null });
    await this.reprocess({ startDate: i.startDate, endDate: i.endDate, employeeIds: [i.employeeId] });
    await this.audit?.record({ action: 'authorize', entity: 'incident', entityId: String(id), userName });
    return updated;
  }

  async rejectIncident(id, reason, userName) {
    const i = await this.incidentDAO.findById(id);
    if (!i) throw new DomainError('Incidencia no encontrada', { code: 'INCIDENT_NOT_FOUND', status: 404 });
    const updated = await this.incidentDAO.update(id, { status: 'rechazada', authorizedBy: userName || null, reason: reason || i.reason });
    await this.audit?.record({ action: 'reject', entity: 'incident', entityId: String(id), userName });
    return updated;
  }

  async deleteIncident(id) {
    const i = await this.incidentDAO.findById(id);
    if (!i) throw new DomainError('Incidencia no encontrada', { code: 'INCIDENT_NOT_FOUND', status: 404 });
    await this.incidentDAO.delete(id);
    if (i.status === 'autorizada') await this.reprocess({ startDate: i.startDate, endDate: i.endDate, employeeIds: [i.employeeId] });
    return { ok: true };
  }

  // ------------------------------------------------------------------
  //  Tiempo extra
  // ------------------------------------------------------------------
  async listOvertime({ status, start, end, employeeId } = {}) {
    const where = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = Number(employeeId);
    if (start || end) {
      where.date = {};
      if (start) where.date[Op.gte] = start;
      if (end) where.date[Op.lte] = end;
    }
    const rows = await this.overtimeDAO.findAll(where, { order: [['date', 'DESC']] });
    const empById = await this.#employeesById();
    return rows.map((o) => ({ ...o, employeeName: empById[o.employeeId]?.name, employeeCode: empById[o.employeeId]?.code }));
  }

  async updateOvertime(id, body = {}) {
    const o = await this.overtimeDAO.findById(id);
    if (!o) throw new DomainError('Registro no encontrado', { code: 'OT_NOT_FOUND', status: 404 });
    const patch = {};
    if ('authorizedMinutes' in body) patch.authorizedMinutes = Number(body.authorizedMinutes) || 0;
    if ('type' in body) patch.type = body.type;
    return this.overtimeDAO.update(id, patch);
  }

  async authorizeOvertime(id, body = {}, userName) {
    const o = await this.overtimeDAO.findById(id);
    if (!o) throw new DomainError('Registro no encontrado', { code: 'OT_NOT_FOUND', status: 404 });
    const minutes = body.authorizedMinutes != null ? Number(body.authorizedMinutes) : (o.authorizedMinutes || o.calculatedMinutes);
    const updated = await this.overtimeDAO.update(id, { status: 'autorizada', authorizedMinutes: minutes, type: body.type || o.type, authorizedBy: userName || null });
    await this.audit?.record({ action: 'authorize', entity: 'overtime', entityId: String(id), userName });
    return updated;
  }

  async rejectOvertime(id, userName) {
    const o = await this.overtimeDAO.findById(id);
    if (!o) throw new DomainError('Registro no encontrado', { code: 'OT_NOT_FOUND', status: 404 });
    const updated = await this.overtimeDAO.update(id, { status: 'rechazada', authorizedMinutes: 0, authorizedBy: userName || null });
    await this.audit?.record({ action: 'reject', entity: 'overtime', entityId: String(id), userName });
    return updated;
  }

  async #employeesById() {
    const employees = await this.employeeDAO.findAll();
    return Object.fromEntries(employees.map((e) => [e.id, e]));
  }
}

export { MANUAL_STATUSES, INCIDENT_TYPES };
