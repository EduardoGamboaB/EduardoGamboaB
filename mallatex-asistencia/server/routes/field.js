// Asistencia de campo (personal remoto). Consumido por la app móvil nativa.
// Requiere sesión de EMPLEADO (código + PIN). Genera checadas method:'campo' con
// ubicación (geocerca) y evidencia, que entran al mismo motor de reglas y a NOI.

import express from 'express';
import * as db from '../db.js';
import { requireEmployee } from '../auth.js';
import { reprocess, STATUS, minutesToHm } from '../rules.js';
import { logSystem } from '../audit.js';
import { evaluateGeofence, euclidean, FACE_MATCH_THRESHOLD } from '../geo.js';

const router = express.Router();
router.use(requireEmployee);

const dateOf = (ts) => ts.slice(0, 10);

function allowedSitesFor(emp) {
  let sites = db.all('sites', (s) => s.active !== false);
  if (Array.isArray(emp.allowedSiteIds) && emp.allowedSiteIds.length) {
    const set = new Set(emp.allowedSiteIds.map(Number));
    sites = sites.filter((s) => set.has(s.id));
  }
  return sites.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}
const publicSite = (s) => ({ id: s.id, name: s.name, client: s.client, lat: s.lat, lng: s.lng, radiusMeters: s.radiusMeters });

// Perfil de campo + sitios permitidos + últimos registros
router.get('/me', (req, res) => {
  const emp = db.get('employees', req.employeeId);
  if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
  const recent = db.all('checadas', (c) => c.employeeId === emp.id && c.method === 'campo')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20)
    .map(publicCheckin);
  res.json({
    employee: { id: emp.id, name: emp.name, code: emp.code, department: emp.department, workMode: emp.workMode || 'planta', faceEnrolled: Array.isArray(emp.faceDescriptor) && emp.faceDescriptor.length === 128 },
    sites: allowedSitesFor(emp).map(publicSite),
    recent,
  });
});

router.get('/sites', (req, res) => {
  const emp = db.get('employees', req.employeeId);
  res.json(allowedSitesFor(emp).map(publicSite));
});

router.get('/checkins', (req, res) => {
  const items = db.all('checadas', (c) => c.employeeId === req.employeeId && c.method === 'campo')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100)
    .map(publicCheckin);
  res.json(items);
});

// Registro de entrada/salida desde el campo.
router.post('/checkin', (req, res) => {
  const emp = db.get('employees', req.employeeId);
  if (!emp || emp.active === false) return res.status(404).json({ error: 'Empleado no encontrado' });
  const b = req.body || {};

  const lat = Number(b.lat), lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Se requiere la ubicación (lat, lng)' });
  }

  // Geocerca del sitio (si se indicó)
  let site = null, geo = { distanceMeters: null, withinGeofence: null };
  if (b.siteId) {
    site = db.get('sites', b.siteId);
    if (!site || site.active === false) return res.status(404).json({ error: 'Sitio no encontrado' });
    geo = evaluateGeofence(site, lat, lng);
  }

  // Verificación facial opcional contra el rostro enrolado del propio empleado
  let faceMatchDistance = null, faceVerified = null;
  if (Array.isArray(b.descriptor) && b.descriptor.length === 128 && Array.isArray(emp.faceDescriptor) && emp.faceDescriptor.length === 128) {
    faceMatchDistance = Number(euclidean(b.descriptor.map(Number), emp.faceDescriptor).toFixed(3));
    faceVerified = faceMatchDistance <= FACE_MATCH_THRESHOLD;
  }

  // Hora del SERVIDOR (no la del dispositivo). Permite antedatar sólo si se marca offline.
  const now = new Date();
  const ts = now.toISOString();
  const today = dateOf(ts);

  // Entrada o salida según la última marca del día
  const type = b.type === 'entrada' || b.type === 'salida'
    ? b.type
    : (() => {
        const todays = db.all('checadas', (c) => c.employeeId === emp.id && dateOf(c.timestamp) === today)
          .sort((a, b2) => new Date(a.timestamp) - new Date(b2.timestamp));
        const last = todays[todays.length - 1];
        return !last || last.type === 'salida' ? 'entrada' : 'salida';
      })();

  const created = db.insert('checadas', {
    employeeId: emp.id,
    deviceId: null,
    timestamp: ts,
    type,
    method: 'campo',
    raw: `CAMPO:${emp.code}`,
    lat, lng,
    accuracy: b.accuracy != null ? Number(b.accuracy) : null,
    siteId: site ? site.id : null,
    siteName: site ? site.name : null,
    distanceMeters: geo.distanceMeters,
    withinGeofence: geo.withinGeofence,
    facePhoto: typeof b.photo === 'string' ? b.photo : null,
    faceMatchDistance,
    faceVerified,
    mocked: b.mocked === true,
    offline: b.offline === true,
    deviceInfo: typeof b.deviceInfo === 'string' ? b.deviceInfo.slice(0, 120) : null,
  });

  reprocess({ startDate: today, endDate: today, employeeIds: [emp.id] });
  const att = db.find('attendance', (a) => a.employeeId === emp.id && a.date === today) || {};

  const flags = [];
  if (geo.withinGeofence === false) flags.push('fuera_de_geocerca');
  if (faceVerified === false) flags.push('rostro_no_coincide');
  if (b.mocked === true) flags.push('ubicacion_simulada');

  logSystem({
    action: 'checkin', entity: 'field', entityId: emp.id,
    detail: `${type} campo ${emp.name} ${minutesToHm(now.getHours() * 60 + now.getMinutes())}${site ? ' @ ' + site.name : ''}${geo.distanceMeters != null ? ' (' + geo.distanceMeters + 'm)' : ''}${flags.length ? ' [' + flags.join(',') + ']' : ''}`,
  });

  res.status(201).json({
    ok: true,
    id: created.id,
    type,
    time: minutesToHm(now.getHours() * 60 + now.getMinutes()),
    dateLabel: now.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    site: site ? { id: site.id, name: site.name } : null,
    distanceMeters: geo.distanceMeters,
    withinGeofence: geo.withinGeofence,
    faceVerified,
    status: att.status || null,
    statusLabel: type === 'entrada'
      ? (att.status === STATUS.RETARDO ? `Retardo de ${att.lateMinutes} min` : 'Entrada registrada')
      : (att.workedMinutes ? `Jornada ${(att.workedMinutes / 60).toFixed(1)} h` : 'Salida registrada'),
    flags,
    headline: type === 'entrada' ? `¡Registrada tu entrada, ${emp.name.split(' ')[0]}!` : `¡Hasta pronto, ${emp.name.split(' ')[0]}!`,
  });
});

function publicCheckin(c) {
  return {
    id: c.id, timestamp: c.timestamp, type: c.type,
    siteName: c.siteName || null, distanceMeters: c.distanceMeters ?? null,
    withinGeofence: c.withinGeofence ?? null, faceVerified: c.faceVerified ?? null,
    lat: c.lat ?? null, lng: c.lng ?? null, offline: c.offline === true,
  };
}

export default router;
