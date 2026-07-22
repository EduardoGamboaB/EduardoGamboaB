// Portal del empleado (autoservicio). Sesión de empleado (código + PIN).
import express from 'express';
import * as db from '../db.js';
import { requireEmployee } from '../auth.js';
import { periodSummary } from '../rules.js';
import { vacationBalance } from '../rh.js';
import { log } from '../audit.js';

const router = express.Router();
router.use(requireEmployee);

function resolvePeriod(id) {
  if (id) return db.get('periods', id);
  return db.all('periods', (p) => p.status === 'abierto')[0] || db.all('periods')[0] || null;
}
const REQUEST_TYPES = ['vacaciones', 'permiso_goce', 'permiso_singoce'];

// Perfil + saldo de vacaciones
router.get('/me', (req, res) => {
  const emp = db.get('employees', req.employeeId);
  const schedule = db.get('schedules', emp.scheduleId);
  res.json({
    employee: req.employee,
    scheduleName: schedule ? schedule.name : null,
    vacation: vacationBalance(emp),
    periods: db.all('periods').sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
  });
});

// Mi asistencia (periodo)
router.get('/me/attendance', (req, res) => {
  const period = resolvePeriod(req.query.periodId);
  if (!period) return res.json({ period: null, rows: [], summary: null });
  const rows = db.all('attendance', (a) => a.employeeId === req.employeeId && a.date >= period.startDate && a.date <= period.endDate)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  res.json({ period, rows, summary: periodSummary(period, req.employeeId) });
});

// Mis checadas (periodo)
router.get('/me/checadas', (req, res) => {
  const period = resolvePeriod(req.query.periodId);
  let items = db.all('checadas', (c) => c.employeeId === req.employeeId);
  if (period) items = items.filter((c) => c.timestamp.slice(0, 10) >= period.startDate && c.timestamp.slice(0, 10) <= period.endDate);
  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(items);
});

// Mis solicitudes (vacaciones/permisos)
router.get('/me/requests', (req, res) => {
  const items = db.all('incidents', (i) => i.employeeId === req.employeeId && REQUEST_TYPES.includes(i.type))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  res.json(items);
});

router.post('/me/requests', (req, res) => {
  const b = req.body || {};
  if (!REQUEST_TYPES.includes(b.type)) return res.status(400).json({ error: 'Tipo de solicitud no válido' });
  if (!b.startDate || !b.endDate) return res.status(400).json({ error: 'Indica las fechas' });
  if (b.endDate < b.startDate) return res.status(400).json({ error: 'La fecha fin no puede ser anterior a la de inicio' });
  const emp = db.get('employees', req.employeeId);
  if (b.type === 'vacaciones') {
    const days = Math.round((new Date(b.endDate) - new Date(b.startDate)) / 86400000) + 1;
    const bal = vacationBalance(emp);
    if (days > bal.available) return res.status(409).json({ error: `Sólo tienes ${bal.available} día(s) de vacaciones disponibles` });
  }
  const created = db.insert('incidents', {
    employeeId: req.employeeId, type: b.type, startDate: b.startDate, endDate: b.endDate,
    reason: b.reason || '', status: 'pendiente', selfService: true,
    createdBy: emp.name, authorizedBy: null, createdAt: new Date().toISOString(),
  });
  log({ user: { id: null, name: emp.name, role: 'empleado' } }, { action: 'create', entity: 'incident', entityId: created.id, detail: `Solicitud ${b.type} (portal) ${b.startDate}…${b.endDate}` });
  res.status(201).json(created);
});

router.delete('/me/requests/:id', (req, res) => {
  const i = db.get('incidents', req.params.id);
  if (!i || i.employeeId !== req.employeeId) return res.status(404).json({ error: 'Solicitud no encontrada' });
  if (i.status !== 'pendiente') return res.status(409).json({ error: 'Sólo puedes cancelar solicitudes pendientes' });
  db.remove('incidents', i.id);
  res.json({ ok: true });
});

// Mis recibos
router.get('/me/payslips', (req, res) => {
  const items = db.all('payslips', (p) => p.employeeId === req.employeeId).sort((a, b) => (a.emittedAt < b.emittedAt ? 1 : -1));
  res.json(items.map(({ perceptions, deductions, ...rest }) => rest));
});
router.get('/me/payslips/:id', (req, res) => {
  const p = db.get('payslips', req.params.id);
  if (!p || p.employeeId !== req.employeeId) return res.status(404).json({ error: 'Recibo no encontrado' });
  res.json(p);
});

// Mis tickets
router.get('/me/tickets', (req, res) => {
  res.json(db.all('tickets', (t) => t.employeeId === req.employeeId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
});
router.post('/me/tickets', (req, res) => {
  const b = req.body || {};
  if (!b.subject || !b.message) return res.status(400).json({ error: 'Asunto y mensaje son obligatorios' });
  const emp = db.get('employees', req.employeeId);
  const created = db.insert('tickets', {
    employeeId: req.employeeId, employeeName: emp.name, category: b.category || 'General',
    subject: b.subject, status: 'abierto', createdAt: new Date().toISOString(),
    messages: [{ by: emp.name, role: 'empleado', message: b.message, at: new Date().toISOString() }],
  });
  res.status(201).json(created);
});
router.post('/me/tickets/:id/reply', (req, res) => {
  const t = db.get('tickets', req.params.id);
  if (!t || t.employeeId !== req.employeeId) return res.status(404).json({ error: 'Ticket no encontrado' });
  const emp = db.get('employees', req.employeeId);
  t.messages.push({ by: emp.name, role: 'empleado', message: (req.body || {}).message || '', at: new Date().toISOString() });
  if (t.status === 'resuelto') t.status = 'abierto';
  db.update('tickets', t.id, { messages: t.messages, status: t.status });
  res.json(t);
});

export default router;
