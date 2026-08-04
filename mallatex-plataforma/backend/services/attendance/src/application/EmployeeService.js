import { hashSecret } from '@mallatex/shared/auth';
import { DomainError } from '@mallatex/shared/ddd';
import { Employee } from '../domain/Employee.js';

/**
 * EmployeeService — casos de uso del alta/baja/edición de empleados y su
 * enrolamiento biométrico. La autenticación (código+PIN) la resuelve identity.
 */
export class EmployeeService {
  constructor({ employeeDAO, scheduleDAO, audit }) {
    this.employeeDAO = employeeDAO;
    this.scheduleDAO = scheduleDAO;
    this.audit = audit;
  }

  async #scheduleNames() {
    const schedules = await this.scheduleDAO.findAll();
    return Object.fromEntries(schedules.map((s) => [String(s.id), s.name]));
  }

  async list({ active, department } = {}) {
    const where = {};
    if (active === 'true' || active === true) where.active = true;
    if (department) where.department = department;
    const [items, names] = await Promise.all([
      this.employeeDAO.findAll(where, { order: [['name', 'ASC']] }),
      this.#scheduleNames(),
    ]);
    return items.map((e) => ({ ...e.toPublic(), scheduleName: names[String(e.scheduleId)] || null }));
  }

  async get(id) {
    const emp = await this.employeeDAO.findById(id);
    if (!emp) throw new DomainError('Empleado no encontrado', { code: 'EMP_NOT_FOUND', status: 404 });
    return emp;
  }

  async create(data) {
    const emp = Employee.create(data);
    if (data.pin) emp.pinHash = await hashSecret(data.pin);
    const saved = await this.employeeDAO.create(emp);
    await this.audit?.record({ action: 'create', entity: 'employee', entityId: String(saved.id), detail: { name: saved.name } });
    return saved;
  }

  async update(id, body = {}) {
    await this.get(id);
    const patch = {};
    for (const k of ['code', 'noiKey', 'name', 'rfc', 'department', 'position', 'checadorUserId',
      'hireDate', 'bonusEligible', 'workMode', 'appProfile', 'allowedSiteIds', 'active']) {
      if (k in body) patch[k] = body[k];
    }
    if ('scheduleId' in body) patch.scheduleId = body.scheduleId ? Number(body.scheduleId) : null;
    if ('deviceId' in body) patch.deviceId = body.deviceId ? Number(body.deviceId) : null;
    if ('dailySalary' in body) patch.dailySalary = Number(body.dailySalary) || 0;
    if (body.pin) patch.pinHash = await hashSecret(body.pin);
    const updated = await this.employeeDAO.update(id, patch);
    await this.audit?.record({ action: 'update', entity: 'employee', entityId: String(id) });
    return updated;
  }

  /** Baja lógica (conserva historial). */
  async deactivate(id) {
    await this.get(id);
    await this.employeeDAO.update(id, { active: false });
    await this.audit?.record({ action: 'deactivate', entity: 'employee', entityId: String(id) });
    return { ok: true };
  }

  async enrollFace(id, descriptor, photo) {
    const emp = await this.get(id);
    emp.enrollFace(descriptor, photo);
    await this.employeeDAO.update(id, { faceDescriptor: emp.faceDescriptor, facePhoto: emp.facePhoto });
    await this.audit?.record({ action: 'enroll', entity: 'employee', entityId: String(id) });
    return { ok: true, faceEnrolled: true };
  }

  /**
   * Autoenrolamiento (app/kiosco). Con descriptor 128D queda enrolado para
   * reconocimiento; con solo foto se guarda como referencia (RH o el kiosco
   * con modelo facial completan el descriptor después).
   */
  async selfFace(id, { descriptor, photo } = {}) {
    const emp = await this.get(id);
    if (Array.isArray(descriptor) && descriptor.length) {
      emp.enrollFace(descriptor, photo);
      await this.employeeDAO.update(id, { faceDescriptor: emp.faceDescriptor, facePhoto: emp.facePhoto });
      await this.audit?.record({ action: 'self-enroll-face', entity: 'employee', entityId: String(id) });
      return { ok: true, faceEnrolled: true, reference: false };
    }
    if (typeof photo !== 'string' || !photo.startsWith('data:image/')) {
      throw new DomainError('Se requiere una foto (dataURL) o un descriptor facial', { code: 'FACE_INPUT_REQUIRED' });
    }
    await this.employeeDAO.update(id, { facePhoto: photo });
    await this.audit?.record({ action: 'face-reference', entity: 'employee', entityId: String(id) });
    return { ok: true, faceEnrolled: emp.faceEnrolled, reference: true };
  }

  /** Guarda el Expo push token del último dispositivo del colaborador. */
  async savePushToken(id, token) {
    const clean = typeof token === 'string' ? token.trim().slice(0, 200) : '';
    if (!clean) throw new DomainError('Token push requerido', { code: 'PUSH_TOKEN_REQUIRED' });
    await this.get(id);
    await this.employeeDAO.update(id, { pushToken: clean });
    return { ok: true };
  }

  async unenrollFace(id) {
    const emp = await this.get(id);
    emp.unenrollFace();
    await this.employeeDAO.update(id, { faceDescriptor: null, facePhoto: null });
    await this.audit?.record({ action: 'unenroll', entity: 'employee', entityId: String(id) });
    return { ok: true, faceEnrolled: false };
  }
}
