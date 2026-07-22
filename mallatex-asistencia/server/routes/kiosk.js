// Modo kiosco (público): interfaz que ve el empleado al marcar entrada/salida
// en la tablet/checador. No requiere inicio de sesión administrativo.
// En producción, la identificación la haría el reconocimiento facial del
// dispositivo Hikvision; aquí se selecciona/identifica al empleado para demostrar
// la pantalla de confirmación.

import express from 'express';
import * as db from '../db.js';
import { reprocess, STATUS, minutesToHm } from '../rules.js';
import { logSystem } from '../audit.js';

const router = express.Router();

function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}
function dateOf(ts) { return ts.slice(0, 10); }

// Distancia euclidiana entre dos descriptores faciales (128D).
function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}
const MATCH_THRESHOLD = 0.5; // menor = coincidencia (típico 0.5–0.6)

// Identifica al empleado enrolado más parecido a un descriptor facial.
function matchByDescriptor(descriptor) {
  const enrolled = db.all('employees', (e) => e.active !== false && Array.isArray(e.faceDescriptor) && e.faceDescriptor.length === 128);
  let best = null, bestDist = Infinity;
  for (const e of enrolled) {
    const dist = euclidean(descriptor, e.faceDescriptor);
    if (dist < bestDist) { bestDist = dist; best = e; }
  }
  return best && bestDist <= MATCH_THRESHOLD ? { employee: best, distance: bestDist } : null;
}

// Estado del kiosco: cuántos rostros hay enrolados.
router.get('/status', (_req, res) => {
  const enrolled = db.all('employees', (e) => e.active !== false && Array.isArray(e.faceDescriptor) && e.faceDescriptor.length === 128).length;
  const total = db.all('employees', (e) => e.active !== false).length;
  const device = db.all('devices')[0] || null;
  res.json({ enrolled, total, threshold: MATCH_THRESHOLD, device: device ? { name: device.name } : null });
});

// Empleados disponibles para el kiosco (datos mínimos, sin información sensible)
router.get('/employees', (_req, res) => {
  const emps = db.all('employees', (e) => e.active !== false)
    .map((e) => ({ id: e.id, name: e.name, code: e.code, department: e.department, initials: initials(e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(emps);
});

// Registro de entrada/salida desde el kiosco.
// Identificación por descriptor facial (cámara), o por employeeId/código (respaldo).
router.post('/checkin', (req, res) => {
  const b = req.body || {};
  let emp = null, matchDistance = null;
  if (Array.isArray(b.descriptor) && b.descriptor.length === 128) {
    const m = matchByDescriptor(b.descriptor.map(Number));
    if (!m) return res.status(404).json({ error: 'Rostro no reconocido' });
    emp = m.employee; matchDistance = Number(m.distance.toFixed(3));
  } else if (b.employeeId) {
    emp = db.get('employees', b.employeeId);
  } else if (b.code || b.checadorUserId) {
    emp = db.find('employees', (e) => e.code === b.code || e.checadorUserId === String(b.checadorUserId));
  }
  if (!emp || emp.active === false) return res.status(404).json({ error: 'Empleado no reconocido' });

  const now = new Date();
  const ts = now.toISOString();
  const today = dateOf(ts);

  // Determinar si es entrada o salida según la última marca del día
  const todays = db.all('checadas', (c) => c.employeeId === emp.id && dateOf(c.timestamp) === today)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const last = todays[todays.length - 1];
  const type = !last || last.type === 'salida' ? 'entrada' : 'salida';

  const device = db.get('devices', emp.deviceId) || db.all('devices')[0];
  db.insert('checadas', {
    employeeId: emp.id,
    deviceId: device ? device.id : null,
    timestamp: ts,
    type,
    method: 'facial',
    raw: `HIK:${device?.serial || 'KIOSK'}:${emp.checadorUserId || emp.id}`,
  });

  // Procesar el día para reflejar el registro
  reprocess({ startDate: today, endDate: today, employeeIds: [emp.id] });
  const att = db.find('attendance', (a) => a.employeeId === emp.id && a.date === today) || {};

  const time = minutesToHm(now.getHours() * 60 + now.getMinutes());
  const dateLabel = now.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  // Mensaje según entrada/salida y estatus calculado
  let tone = 'ok', statusLabel = '', detail = '';
  if (type === 'entrada') {
    detail = 'Entrada registrada';
    if (att.status === STATUS.RETARDO) { tone = 'warn'; statusLabel = `Retardo de ${att.lateMinutes} min`; }
    else if (att.status === STATUS.FALTA) { tone = 'warn'; statusLabel = `Registro tardío (${att.lateMinutes} min)`; }
    else { tone = 'ok'; statusLabel = 'Puntual'; }
  } else {
    detail = 'Salida registrada';
    tone = 'info';
    if (att.overtimeMinutes > 0) statusLabel = `Tiempo extra ${(att.overtimeMinutes / 60).toFixed(1)} h`;
    else if (att.workedMinutes > 0) statusLabel = `Jornada ${(att.workedMinutes / 60).toFixed(1)} h`;
    else statusLabel = 'Buen descanso';
  }

  const via = matchDistance != null ? `facial d=${matchDistance}` : 'manual';
  logSystem({ action: 'checkin', entity: 'kiosk', entityId: emp.id, detail: `${type} ${emp.name} ${time} (${statusLabel}) · ${via}` });

  res.json({
    ok: true,
    type,
    time,
    dateLabel,
    status: att.status || null,
    tone,
    detail,
    statusLabel,
    matchDistance,
    headline: type === 'entrada' ? `¡Bienvenido, ${emp.name.split(' ')[0]}!` : `¡Hasta pronto, ${emp.name.split(' ')[0]}!`,
    employee: { id: emp.id, name: emp.name, code: emp.code, department: emp.department, initials: initials(emp.name), photo: emp.facePhoto || null },
  });
});

export default router;
