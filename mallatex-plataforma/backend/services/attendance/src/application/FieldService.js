import { Op } from 'sequelize';
import { DomainError } from '@mallatex/shared/ddd';
import { dateOf, minutesToHm, STATUS } from '../domain/AttendanceRules.js';
import { evaluateGeofence, euclidean, matchByDescriptor, FACE_MATCH_THRESHOLD } from '../domain/Geo.js';

const initials = (name) => (name || '?').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase();
const publicSite = (s) => ({ id: s.id, name: s.name, client: s.client, lat: s.lat, lng: s.lng, radiusMeters: s.radiusMeters });
const publicCheckin = (c) => ({
  id: c.id, timestamp: c.timestamp, type: c.type, distanceMeters: c.distanceMeters ?? null,
  withinGeofence: c.withinGeofence ?? null, faceVerified: c.faceVerified ?? null,
  lat: c.lat ?? null, lng: c.lng ?? null, siteId: c.siteId ?? null, offline: c.offline === true,
});

/**
 * FieldService — asistencia de campo (app móvil, sesión de empleado) y modo
 * kiosco (tablet pública). Ambas rutas generan checadas que entran al mismo
 * motor de reglas y a NOI. El reconocimiento facial usa el descriptor 128D.
 */
export class FieldService {
  constructor({ employeeDAO, siteDAO, checadaDAO, attendanceDayDAO, deviceDAO, attendanceService }) {
    this.employeeDAO = employeeDAO;
    this.siteDAO = siteDAO;
    this.checadaDAO = checadaDAO;
    this.attendanceDayDAO = attendanceDayDAO;
    this.deviceDAO = deviceDAO;
    this.attendanceService = attendanceService;
  }

  async #allowedSites(emp) {
    let sites = await this.siteDAO.findAll({ active: true }, { order: [['name', 'ASC']] });
    if (Array.isArray(emp.allowedSiteIds) && emp.allowedSiteIds.length) {
      const set = new Set(emp.allowedSiteIds.map(Number));
      sites = sites.filter((s) => set.has(Number(s.id)));
    }
    return sites;
  }

  async #todaysChecadas(employeeId, today) {
    return this.checadaDAO.findAll({
      employeeId,
      timestamp: { [Op.gte]: `${today}T00:00:00.000`, [Op.lte]: `${today}T23:59:59.999` },
    }, { order: [['ts', 'ASC']] });
  }

  async #resolveType(employeeId, today, requested) {
    if (requested === 'entrada' || requested === 'salida') return requested;
    const todays = await this.#todaysChecadas(employeeId, today);
    const last = todays[todays.length - 1];
    return !last || last.type === 'salida' ? 'entrada' : 'salida';
  }

  // ------------------------------------------------------------------
  //  Campo (empleado)
  // ------------------------------------------------------------------
  async fieldMe(employeeId) {
    const emp = await this.employeeDAO.findById(employeeId);
    if (!emp) throw new DomainError('Empleado no encontrado', { code: 'EMP_NOT_FOUND', status: 404 });
    const recent = (await this.checadaDAO.findAll({ employeeId, method: 'campo' }, { order: [['ts', 'DESC']], limit: 20 })).map(publicCheckin);
    const sites = await this.#allowedSites(emp);
    return {
      employee: { id: emp.id, name: emp.name, code: emp.code, department: emp.department, position: emp.position, workMode: emp.workMode || 'planta', faceEnrolled: emp.faceEnrolled },
      sites: sites.map(publicSite),
      recent,
    };
  }

  async fieldSites(employeeId) {
    const emp = await this.employeeDAO.findById(employeeId);
    if (!emp) throw new DomainError('Empleado no encontrado', { code: 'EMP_NOT_FOUND', status: 404 });
    return (await this.#allowedSites(emp)).map(publicSite);
  }

  async fieldCheckins(employeeId) {
    return (await this.checadaDAO.findAll({ employeeId, method: 'campo' }, { order: [['ts', 'DESC']], limit: 100 })).map(publicCheckin);
  }

  async fieldCheckin(employeeId, body = {}) {
    const emp = await this.employeeDAO.findById(employeeId);
    if (!emp || emp.active === false) throw new DomainError('Empleado no encontrado', { code: 'EMP_NOT_FOUND', status: 404 });

    const lat = Number(body.lat), lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new DomainError('Se requiere la ubicación (lat, lng)', { code: 'LOCATION_REQUIRED' });

    // Geocerca del sitio (si se indicó)
    let site = null, geo = { distanceMeters: null, withinGeofence: null };
    if (body.siteId) {
      site = await this.siteDAO.findById(body.siteId);
      if (!site || site.active === false) throw new DomainError('Sitio no encontrado', { code: 'SITE_NOT_FOUND', status: 404 });
      geo = evaluateGeofence(site, lat, lng);
    }

    // Verificación facial opcional contra el rostro enrolado del propio empleado
    let faceMatchDistance = null, faceVerified = null;
    if (Array.isArray(body.descriptor) && body.descriptor.length === 128 && emp.faceEnrolled) {
      faceMatchDistance = Number(euclidean(body.descriptor.map(Number), emp.faceDescriptor).toFixed(3));
      faceVerified = faceMatchDistance <= FACE_MATCH_THRESHOLD;
    }

    // Hora del SERVIDOR (no la del dispositivo).
    const now = new Date();
    const ts = now.toISOString();
    const today = dateOf(ts);
    const type = await this.#resolveType(emp.id, today, body.type);

    const created = await this.checadaDAO.create({
      employeeId: emp.id, deviceId: null, timestamp: ts, type, method: 'campo',
      raw: { origen: `CAMPO:${emp.code}`, deviceInfo: typeof body.deviceInfo === 'string' ? body.deviceInfo.slice(0, 120) : null },
      lat, lng, siteId: site ? site.id : null,
      distanceMeters: geo.distanceMeters, withinGeofence: geo.withinGeofence,
      faceMatchDistance, faceVerified, mocked: body.mocked === true, offline: body.offline === true,
    });

    await this.attendanceService.reprocess({ startDate: today, endDate: today, employeeIds: [emp.id] });
    const att = (await this.attendanceDayDAO.findByEmployeeDate(emp.id, today)) || {};

    const flags = [];
    if (geo.withinGeofence === false) flags.push('fuera_de_geocerca');
    if (faceVerified === false) flags.push('rostro_no_coincide');
    if (body.mocked === true) flags.push('ubicacion_simulada');

    const time = minutesToHm(now.getHours() * 60 + now.getMinutes());
    return {
      ok: true, id: created.id, type, time,
      dateLabel: now.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      site: site ? { id: site.id, name: site.name } : null,
      distanceMeters: geo.distanceMeters, withinGeofence: geo.withinGeofence, faceVerified,
      status: att.status || null,
      statusLabel: type === 'entrada'
        ? (att.status === STATUS.RETARDO ? `Retardo de ${att.lateMinutes} min` : 'Entrada registrada')
        : (att.workedMinutes ? `Jornada ${(att.workedMinutes / 60).toFixed(1)} h` : 'Salida registrada'),
      flags,
      headline: type === 'entrada' ? `¡Registrada tu entrada, ${emp.name.split(' ')[0]}!` : `¡Hasta pronto, ${emp.name.split(' ')[0]}!`,
    };
  }

  // ------------------------------------------------------------------
  //  Kiosco (público)
  // ------------------------------------------------------------------
  async kioskStatus() {
    const employees = await this.employeeDAO.active();
    const enrolled = employees.filter((e) => e.faceEnrolled).length;
    const device = (await this.deviceDAO.findAll({}, { limit: 1 }))[0] || null;
    return { enrolled, total: employees.length, threshold: FACE_MATCH_THRESHOLD, device: device ? { name: device.name } : null };
  }

  async kioskEmployees() {
    const employees = await this.employeeDAO.active();
    return employees
      .map((e) => ({ id: e.id, name: e.name, code: e.code, department: e.department, initials: initials(e.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async kioskCheckin(body = {}) {
    let emp = null, matchDistance = null;
    if (Array.isArray(body.descriptor) && body.descriptor.length === 128) {
      const employees = await this.employeeDAO.active();
      const m = matchByDescriptor(body.descriptor.map(Number), employees);
      if (!m) throw new DomainError('Rostro no reconocido', { code: 'FACE_UNKNOWN', status: 404 });
      emp = m.employee; matchDistance = Number(m.distance.toFixed(3));
    } else if (body.employeeId) {
      emp = await this.employeeDAO.findById(body.employeeId);
    } else if (body.code || body.checadorUserId) {
      emp = body.code ? await this.employeeDAO.findByCode(body.code) : await this.employeeDAO.findOne({ checadorUserId: String(body.checadorUserId) });
    }
    if (!emp || emp.active === false) throw new DomainError('Empleado no reconocido', { code: 'EMP_UNKNOWN', status: 404 });

    const now = new Date();
    const ts = now.toISOString();
    const today = dateOf(ts);
    const type = await this.#resolveType(emp.id, today);
    const device = (emp.deviceId ? await this.deviceDAO.findById(emp.deviceId) : null) || (await this.deviceDAO.findAll({}, { limit: 1 }))[0] || null;

    await this.checadaDAO.create({
      employeeId: emp.id, deviceId: device ? device.id : null, timestamp: ts, type, method: 'facial',
      raw: { origen: `HIK:${device?.serial || 'KIOSK'}:${emp.checadorUserId || emp.id}` },
      faceMatchDistance: matchDistance, faceVerified: matchDistance != null ? true : null,
    });

    await this.attendanceService.reprocess({ startDate: today, endDate: today, employeeIds: [emp.id] });
    const att = (await this.attendanceDayDAO.findByEmployeeDate(emp.id, today)) || {};

    const time = minutesToHm(now.getHours() * 60 + now.getMinutes());
    let tone = 'ok', statusLabel = '', detail = '';
    if (type === 'entrada') {
      detail = 'Entrada registrada';
      if (att.status === STATUS.RETARDO) { tone = 'warn'; statusLabel = `Retardo de ${att.lateMinutes} min`; }
      else if (att.status === STATUS.FALTA) { tone = 'warn'; statusLabel = `Registro tardío (${att.lateMinutes} min)`; }
      else { tone = 'ok'; statusLabel = 'Puntual'; }
    } else {
      detail = 'Salida registrada'; tone = 'info';
      if (att.overtimeMinutes > 0) statusLabel = `Tiempo extra ${(att.overtimeMinutes / 60).toFixed(1)} h`;
      else if (att.workedMinutes > 0) statusLabel = `Jornada ${(att.workedMinutes / 60).toFixed(1)} h`;
      else statusLabel = 'Buen descanso';
    }

    return {
      ok: true, type, time,
      dateLabel: now.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      status: att.status || null, tone, detail, statusLabel, matchDistance,
      headline: type === 'entrada' ? `¡Bienvenido, ${emp.name.split(' ')[0]}!` : `¡Hasta pronto, ${emp.name.split(' ')[0]}!`,
      employee: { id: emp.id, name: emp.name, code: emp.code, department: emp.department, initials: initials(emp.name), photo: emp.facePhoto || null },
    };
  }
}
