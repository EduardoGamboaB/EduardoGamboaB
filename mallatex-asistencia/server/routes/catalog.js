// Catálogos y configuración: empleados, horarios, dispositivos (checador),
// usuarios, conceptos NOI y ajustes/reglas globales.

import express from 'express';
import * as db from '../db.js';
import { requireRole, ROLES, ROLE_LABEL, hashPassword, publicUser } from '../auth.js';
import { log } from '../audit.js';
import { syncDevice } from '../checador.js';
import { getConcepts } from '../noi.js';

const router = express.Router();

// ---------- Metadatos ----------
router.get('/meta/roles', (_req, res) => {
  res.json(Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })));
});

router.get('/settings', (_req, res) => res.json(db.getSettings()));
router.put('/settings', requireRole(ROLES.ADMIN), (req, res) => {
  const saved = db.saveSettings(req.body || {});
  log(req, { action: 'update', entity: 'settings', detail: 'Ajustes/reglas actualizados' });
  res.json(saved);
});

// ---------- Empleados ----------
router.get('/employees', (req, res) => {
  let items = db.all('employees');
  if (req.query.active === 'true') items = items.filter((e) => e.active !== false);
  if (req.query.department) items = items.filter((e) => e.department === req.query.department);
  // Enriquecer con nombre de horario. Se omiten los datos biométricos pesados
  // (descriptor/foto); se expone sólo el indicador de enrolamiento.
  const schedules = Object.fromEntries(db.all('schedules').map((s) => [s.id, s.name]));
  res.json(items.map(({ faceDescriptor, facePhoto, ...e }) => ({
    ...e,
    scheduleName: schedules[e.scheduleId] || null,
    faceEnrolled: Array.isArray(faceDescriptor) && faceDescriptor.length > 0,
  })));
});

// ---------- Enrolamiento biométrico (rostro) ----------
router.post('/employees/:id/face', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const e = db.get('employees', req.params.id);
  if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
  const { descriptor, photo } = req.body || {};
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    return res.status(400).json({ error: 'Descriptor facial inválido (se esperan 128 valores)' });
  }
  db.update('employees', e.id, { faceDescriptor: descriptor.map(Number), facePhoto: typeof photo === 'string' ? photo : null });
  log(req, { action: 'enroll', entity: 'employee', entityId: e.id, detail: `Registro biométrico (rostro) de ${e.name}` });
  res.json({ ok: true, faceEnrolled: true });
});

router.delete('/employees/:id/face', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const e = db.get('employees', req.params.id);
  if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
  db.update('employees', e.id, { faceDescriptor: null, facePhoto: null });
  log(req, { action: 'unenroll', entity: 'employee', entityId: e.id, detail: `Baja de registro biométrico de ${e.name}` });
  res.json({ ok: true, faceEnrolled: false });
});

router.get('/employees/:id', (req, res) => {
  const e = db.get('employees', req.params.id);
  if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
  res.json(e);
});

router.post('/employees', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.code) return res.status(400).json({ error: 'Nombre y clave son obligatorios' });
  const created = db.insert('employees', {
    code: b.code,
    noiKey: b.noiKey || b.code,
    name: b.name,
    rfc: b.rfc || '',
    department: b.department || '',
    position: b.position || '',
    scheduleId: b.scheduleId ? Number(b.scheduleId) : null,
    deviceId: b.deviceId ? Number(b.deviceId) : null,
    checadorUserId: b.checadorUserId || '',
    dailySalary: Number(b.dailySalary) || 0,
    hireDate: b.hireDate || null,
    bonusEligible: b.bonusEligible !== false,
    active: true,
  });
  log(req, { action: 'create', entity: 'employee', entityId: created.id, detail: `Alta de empleado ${created.name}` });
  res.status(201).json(created);
});

router.put('/employees/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const e = db.get('employees', req.params.id);
  if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
  const b = req.body || {};
  const patch = {};
  for (const k of ['code', 'noiKey', 'name', 'rfc', 'department', 'position', 'checadorUserId', 'hireDate', 'bonusEligible', 'active']) {
    if (k in b) patch[k] = b[k];
  }
  if ('scheduleId' in b) patch.scheduleId = b.scheduleId ? Number(b.scheduleId) : null;
  if ('deviceId' in b) patch.deviceId = b.deviceId ? Number(b.deviceId) : null;
  if ('dailySalary' in b) patch.dailySalary = Number(b.dailySalary) || 0;
  const updated = db.update('employees', e.id, patch);
  log(req, { action: 'update', entity: 'employee', entityId: e.id, detail: `Actualización de ${updated.name}` });
  res.json(updated);
});

router.delete('/employees/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const e = db.get('employees', req.params.id);
  if (!e) return res.status(404).json({ error: 'Empleado no encontrado' });
  db.update('employees', e.id, { active: false });
  log(req, { action: 'deactivate', entity: 'employee', entityId: e.id, detail: `Baja de ${e.name}` });
  res.json({ ok: true });
});

// ---------- Horarios / turnos ----------
router.get('/schedules', (_req, res) => res.json(db.all('schedules')));

router.post('/schedules', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const b = req.body || {};
  const created = db.insert('schedules', {
    name: b.name || 'Nuevo turno',
    entryTime: b.entryTime || '08:00',
    exitTime: b.exitTime || '17:00',
    lunchMinutes: Number(b.lunchMinutes) || 0,
    toleranceMinutes: Number(b.toleranceMinutes) ?? 10,
    lateAfterMinutes: Number(b.lateAfterMinutes) ?? 20,
    hoursPerDay: Number(b.hoursPerDay) || 8,
    workDays: Array.isArray(b.workDays) ? b.workDays.map(Number) : [1, 2, 3, 4, 5],
  });
  log(req, { action: 'create', entity: 'schedule', entityId: created.id, detail: `Alta de turno ${created.name}` });
  res.status(201).json(created);
});

router.put('/schedules/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const s = db.get('schedules', req.params.id);
  if (!s) return res.status(404).json({ error: 'Turno no encontrado' });
  const b = req.body || {};
  const patch = {};
  for (const k of ['name', 'entryTime', 'exitTime']) if (k in b) patch[k] = b[k];
  for (const k of ['lunchMinutes', 'toleranceMinutes', 'lateAfterMinutes', 'hoursPerDay']) if (k in b) patch[k] = Number(b[k]);
  if ('workDays' in b) patch.workDays = b.workDays.map(Number);
  const updated = db.update('schedules', s.id, patch);
  log(req, { action: 'update', entity: 'schedule', entityId: s.id, detail: `Turno ${updated.name} actualizado` });
  res.json(updated);
});

router.delete('/schedules/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const inUse = db.all('employees', (e) => e.scheduleId === Number(req.params.id) && e.active !== false).length;
  if (inUse) return res.status(409).json({ error: `El turno tiene ${inUse} empleado(s) asignado(s)` });
  db.remove('schedules', req.params.id);
  log(req, { action: 'delete', entity: 'schedule', entityId: Number(req.params.id) });
  res.json({ ok: true });
});

// ---------- Dispositivos (checador) ----------
router.get('/devices', (_req, res) => res.json(db.all('devices')));

router.post('/devices/:id/sync', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const { startDate, endDate } = req.body || {};
  if (!startDate || !endDate) return res.status(400).json({ error: 'startDate y endDate son obligatorios' });
  try {
    const result = syncDevice(Number(req.params.id), { startDate, endDate });
    log(req, {
      action: 'sync', entity: 'device', entityId: Number(req.params.id),
      detail: `Sincronización ${startDate}…${endDate}: ${result.createdCount} checadas`,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- Usuarios administrativos ----------
router.get('/users', requireRole(ROLES.ADMIN), (_req, res) => {
  res.json(db.all('users').map(publicUser));
});

router.post('/users', requireRole(ROLES.ADMIN), (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.password) return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
  if (db.find('users', (u) => u.email.toLowerCase() === b.email.toLowerCase())) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  }
  const activeAdmins = db.all('users', (u) => u.active !== false).length;
  if (activeAdmins >= 5 && b.active !== false) {
    // La propuesta contempla hasta 5 usuarios administrativos en la renta operativa
    return res.status(409).json({ error: 'Límite de 5 usuarios administrativos alcanzado (Renta Operativa)' });
  }
  const created = db.insert('users', {
    name: b.name, email: b.email, role: b.role || ROLES.NOMINA,
    position: b.position || '', password: hashPassword(b.password), active: true,
  });
  log(req, { action: 'create', entity: 'user', entityId: created.id, detail: `Alta de usuario ${created.email}` });
  res.status(201).json(publicUser(created));
});

router.put('/users/:id', requireRole(ROLES.ADMIN), (req, res) => {
  const u = db.get('users', req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  const b = req.body || {};
  const patch = {};
  for (const k of ['name', 'email', 'role', 'position', 'active']) if (k in b) patch[k] = b[k];
  if (b.password) patch.password = hashPassword(b.password);
  const updated = db.update('users', u.id, patch);
  log(req, { action: 'update', entity: 'user', entityId: u.id, detail: `Usuario ${updated.email} actualizado` });
  res.json(publicUser(updated));
});

// ---------- Conceptos NOI ----------
router.get('/noi/concepts', (_req, res) => res.json(getConcepts()));

router.put('/noi/concepts/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  // Si aún no están persistidos, sembrar los conceptos por defecto
  if (db.all('noiConcepts').length === 0) {
    for (const c of getConcepts()) db.insert('noiConcepts', c);
  }
  const c = db.get('noiConcepts', req.params.id);
  if (!c) return res.status(404).json({ error: 'Concepto no encontrado' });
  const b = req.body || {};
  const patch = {};
  for (const k of ['noiNumber', 'tipo', 'descripcion', 'unidad', 'enabled']) if (k in b) patch[k] = b[k];
  const updated = db.update('noiConcepts', c.id, patch);
  log(req, { action: 'update', entity: 'noiConcept', entityId: c.id, detail: `Concepto NOI ${updated.descripcion}` });
  res.json(updated);
});

export default router;
