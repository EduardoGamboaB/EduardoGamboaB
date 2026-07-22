// Operación diaria: checadas, revisión y corrección de asistencia,
// incidencias (faltas, vacaciones, permisos, incapacidades…) y horas extra.

import express from 'express';
import * as db from '../db.js';
import { requireRole, ROLES } from '../auth.js';
import { log } from '../audit.js';
import { reprocess, STATUS } from '../rules.js';

const router = express.Router();

// Estatus editables manualmente por el revisor
const MANUAL_STATUSES = [
  STATUS.ASISTENCIA, STATUS.RETARDO, STATUS.FALTA, STATUS.JUSTIFICADA,
  STATUS.VACACIONES, STATUS.PERMISO, STATUS.INCAPACIDAD, STATUS.DESCANSO,
  STATUS.FESTIVO, STATUS.OMISION,
];

// ---------- Checadas crudas ----------
router.get('/checadas', (req, res) => {
  let items = db.all('checadas');
  if (req.query.employeeId) items = items.filter((c) => c.employeeId === Number(req.query.employeeId));
  if (req.query.date) items = items.filter((c) => c.timestamp.slice(0, 10) === req.query.date);
  if (req.query.start) items = items.filter((c) => c.timestamp.slice(0, 10) >= req.query.start);
  if (req.query.end) items = items.filter((c) => c.timestamp.slice(0, 10) <= req.query.end);
  items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  res.json(items);
});

router.post('/checadas', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const b = req.body || {};
  if (!b.employeeId || !b.timestamp) return res.status(400).json({ error: 'employeeId y timestamp son obligatorios' });
  const emp = db.get('employees', b.employeeId);
  if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
  const created = db.insert('checadas', {
    employeeId: Number(b.employeeId),
    deviceId: emp.deviceId || null,
    timestamp: b.timestamp,
    type: b.type || 'manual',
    method: 'manual',
    raw: 'CAPTURA-MANUAL',
  });
  const date = created.timestamp.slice(0, 10);
  reprocess({ startDate: date, endDate: date, employeeIds: [emp.id] });
  log(req, { action: 'create', entity: 'checada', entityId: created.id, detail: `Checada manual ${emp.name} ${created.timestamp}` });
  res.status(201).json(created);
});

// ---------- Asistencia (revisión) ----------
router.get('/attendance', (req, res) => {
  const { start, end, employeeId, department, status } = req.query;
  let items = db.all('attendance');
  if (start) items = items.filter((a) => a.date >= start);
  if (end) items = items.filter((a) => a.date <= end);
  if (employeeId) items = items.filter((a) => a.employeeId === Number(employeeId));
  if (status) items = items.filter((a) => a.status === status);

  const empById = Object.fromEntries(db.all('employees').map((e) => [e.id, e]));
  let enriched = items.map((a) => {
    const e = empById[a.employeeId] || {};
    return {
      ...a,
      employeeName: e.name,
      employeeCode: e.code,
      department: e.department,
    };
  });
  if (department) enriched = enriched.filter((a) => a.department === department);
  enriched.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.employeeName || '').localeCompare(b.employeeName || '')));
  res.json(enriched);
});

router.post('/attendance/reprocess', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const { start, end, employeeIds } = req.body || {};
  if (!start || !end) return res.status(400).json({ error: 'start y end son obligatorios' });
  const count = reprocess({ startDate: start, endDate: end, employeeIds });
  log(req, { action: 'reprocess', entity: 'attendance', detail: `Reproceso ${start}…${end} (${count} registros)` });
  res.json({ ok: true, count });
});

// Corrección manual del estatus de un día (queda en bitácora con motivo)
router.put('/attendance/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const a = db.get('attendance', req.params.id);
  if (!a) return res.status(404).json({ error: 'Registro no encontrado' });
  const period = periodOf(a.date);
  if (period && period.status === 'cerrado') {
    return res.status(409).json({ error: 'El periodo está cerrado; no se puede modificar' });
  }
  const b = req.body || {};
  if (b.status && !MANUAL_STATUSES.includes(b.status)) {
    return res.status(400).json({ error: 'Estatus no válido' });
  }
  if (!b.reason) return res.status(400).json({ error: 'El motivo de la corrección es obligatorio' });
  const patch = {
    status: b.status || a.status,
    manualStatus: true,
    manualNote: b.reason,
  };
  if ('overtimeMinutes' in b) patch.overtimeMinutes = Number(b.overtimeMinutes) || 0;
  const updated = db.update('attendance', a.id, patch);
  const emp = db.get('employees', a.employeeId);
  log(req, {
    action: 'correct', entity: 'attendance', entityId: a.id,
    detail: `Corrección ${emp?.name} ${a.date}: ${a.status} → ${patch.status}. Motivo: ${b.reason}`,
  });
  res.json(updated);
});

// ---------- Incidencias ----------
const INCIDENT_TYPES = ['vacaciones', 'permiso_goce', 'permiso_singoce', 'incapacidad', 'falta_justificada', 'festivo', 'descanso'];

router.get('/incidents', (req, res) => {
  let items = db.all('incidents');
  if (req.query.status) items = items.filter((i) => i.status === req.query.status);
  if (req.query.employeeId) items = items.filter((i) => i.employeeId === Number(req.query.employeeId));
  const empById = Object.fromEntries(db.all('employees').map((e) => [e.id, e.name]));
  items = items.map((i) => ({ ...i, employeeName: empById[i.employeeId] }));
  items.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  res.json(items);
});

router.post('/incidents', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const b = req.body || {};
  if (!b.employeeId || !b.type || !b.startDate || !b.endDate) {
    return res.status(400).json({ error: 'employeeId, type, startDate y endDate son obligatorios' });
  }
  if (!INCIDENT_TYPES.includes(b.type)) return res.status(400).json({ error: 'Tipo de incidencia no válido' });
  if (b.endDate < b.startDate) return res.status(400).json({ error: 'La fecha fin no puede ser anterior a la de inicio' });
  const created = db.insert('incidents', {
    employeeId: Number(b.employeeId),
    type: b.type,
    startDate: b.startDate,
    endDate: b.endDate,
    reason: b.reason || '',
    status: 'pendiente',
    createdBy: req.user.name,
    authorizedBy: null,
    createdAt: new Date().toISOString(),
  });
  const emp = db.get('employees', created.employeeId);
  log(req, { action: 'create', entity: 'incident', entityId: created.id, detail: `Incidencia ${b.type} ${emp?.name} ${b.startDate}…${b.endDate}` });
  res.status(201).json(created);
});

router.put('/incidents/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const i = db.get('incidents', req.params.id);
  if (!i) return res.status(404).json({ error: 'Incidencia no encontrada' });
  if (i.status === 'autorizada') return res.status(409).json({ error: 'La incidencia ya está autorizada' });
  const b = req.body || {};
  const patch = {};
  for (const k of ['type', 'startDate', 'endDate', 'reason']) if (k in b) patch[k] = b[k];
  const updated = db.update('incidents', i.id, patch);
  log(req, { action: 'update', entity: 'incident', entityId: i.id, detail: 'Incidencia actualizada' });
  res.json(updated);
});

// Autorizar / rechazar incidencias (contador general o admin)
router.post('/incidents/:id/authorize', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const i = db.get('incidents', req.params.id);
  if (!i) return res.status(404).json({ error: 'Incidencia no encontrada' });
  const updated = db.update('incidents', i.id, { status: 'autorizada', authorizedBy: req.user.name, authorizedAt: new Date().toISOString() });
  reprocess({ startDate: i.startDate, endDate: i.endDate, employeeIds: [i.employeeId] });
  const emp = db.get('employees', i.employeeId);
  log(req, { action: 'authorize', entity: 'incident', entityId: i.id, detail: `Autoriza ${i.type} de ${emp?.name}` });
  res.json(updated);
});

router.post('/incidents/:id/reject', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const i = db.get('incidents', req.params.id);
  if (!i) return res.status(404).json({ error: 'Incidencia no encontrada' });
  const updated = db.update('incidents', i.id, { status: 'rechazada', authorizedBy: req.user.name, authorizedAt: new Date().toISOString(), rejectReason: req.body?.reason || '' });
  log(req, { action: 'reject', entity: 'incident', entityId: i.id, detail: `Rechaza incidencia (${req.body?.reason || 'sin motivo'})` });
  res.json(updated);
});

router.delete('/incidents/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const i = db.get('incidents', req.params.id);
  if (!i) return res.status(404).json({ error: 'Incidencia no encontrada' });
  db.remove('incidents', i.id);
  if (i.status === 'autorizada') reprocess({ startDate: i.startDate, endDate: i.endDate, employeeIds: [i.employeeId] });
  log(req, { action: 'delete', entity: 'incident', entityId: i.id });
  res.json({ ok: true });
});

// ---------- Horas extra ----------
router.get('/overtime', (req, res) => {
  let items = db.all('overtime');
  if (req.query.status) items = items.filter((o) => o.status === req.query.status);
  if (req.query.start) items = items.filter((o) => o.date >= req.query.start);
  if (req.query.end) items = items.filter((o) => o.date <= req.query.end);
  if (req.query.employeeId) items = items.filter((o) => o.employeeId === Number(req.query.employeeId));
  const empById = Object.fromEntries(db.all('employees').map((e) => [e.id, e]));
  items = items.map((o) => ({ ...o, employeeName: empById[o.employeeId]?.name, employeeCode: empById[o.employeeId]?.code }));
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json(items);
});

router.put('/overtime/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const o = db.get('overtime', req.params.id);
  if (!o) return res.status(404).json({ error: 'Registro no encontrado' });
  const b = req.body || {};
  const patch = {};
  if ('authorizedMinutes' in b) patch.authorizedMinutes = Number(b.authorizedMinutes) || 0;
  if ('type' in b) patch.type = b.type;
  if ('note' in b) patch.note = b.note;
  const updated = db.update('overtime', o.id, patch);
  log(req, { action: 'update', entity: 'overtime', entityId: o.id, detail: 'Ajuste de horas extra' });
  res.json(updated);
});

// Autorizar tiempo extra: valida y cierra el registro (usa authorizedMinutes o el calculado)
router.post('/overtime/:id/authorize', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const o = db.get('overtime', req.params.id);
  if (!o) return res.status(404).json({ error: 'Registro no encontrado' });
  const minutes = req.body?.authorizedMinutes != null ? Number(req.body.authorizedMinutes) : (o.authorizedMinutes || o.calculatedMinutes);
  const updated = db.update('overtime', o.id, {
    status: 'autorizada',
    authorizedMinutes: minutes,
    type: req.body?.type || o.type,
    authorizedBy: req.user.name,
    authorizedAt: new Date().toISOString(),
  });
  const emp = db.get('employees', o.employeeId);
  log(req, { action: 'authorize', entity: 'overtime', entityId: o.id, detail: `Autoriza ${(minutes / 60).toFixed(2)} h extra de ${emp?.name} (${o.date})` });
  res.json(updated);
});

router.post('/overtime/:id/reject', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const o = db.get('overtime', req.params.id);
  if (!o) return res.status(404).json({ error: 'Registro no encontrado' });
  const updated = db.update('overtime', o.id, { status: 'rechazada', authorizedMinutes: 0, authorizedBy: req.user.name, authorizedAt: new Date().toISOString() });
  log(req, { action: 'reject', entity: 'overtime', entityId: o.id, detail: `Rechaza horas extra (${o.date})` });
  res.json(updated);
});

function periodOf(date) {
  return db.find('periods', (p) => date >= p.startDate && date <= p.endDate);
}

export default router;
