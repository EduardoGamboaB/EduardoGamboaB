// Recursos Humanos (administrativo): saldos de vacaciones, recibos, tickets e indicadores.
import express from 'express';
import * as db from '../db.js';
import { requireRole, ROLES } from '../auth.js';
import { vacationBalance, computePayslip, indicators } from '../rh.js';
import { log } from '../audit.js';

const router = express.Router();
const RH = requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA);

// ---------- Vacaciones: saldos ----------
router.get('/rh/vacation-balances', RH, (_req, res) => {
  const rows = db.all('employees', (e) => e.active !== false).map((e) => ({
    id: e.id, name: e.name, code: e.code, department: e.department, hireDate: e.hireDate,
    ...vacationBalance(e),
  }));
  res.json(rows);
});

// ---------- Recibos ----------
router.post('/rh/payslips/generate', RH, (req, res) => {
  const period = db.get('periods', (req.body || {}).periodId);
  if (!period) return res.status(404).json({ error: 'Periodo no encontrado' });
  // Reemplaza los recibos previos del periodo
  for (const old of db.all('payslips', (p) => p.periodId === period.id)) db.remove('payslips', old.id);
  const employees = db.all('employees', (e) => e.active !== false);
  const emittedAt = new Date().toISOString();
  let count = 0;
  for (const emp of employees) {
    const calc = computePayslip(period, emp);
    db.insert('payslips', {
      employeeId: emp.id, employeeName: emp.name, employeeCode: emp.code, department: emp.department,
      periodId: period.id, periodName: period.name, periodStart: period.startDate, periodEnd: period.endDate,
      perceptions: calc.perceptions, deductions: calc.deductions,
      totalP: calc.totalP, totalD: calc.totalD, neto: calc.neto,
      emittedAt, emittedBy: req.user.name,
    });
    count++;
  }
  log(req, { action: 'generate', entity: 'payslip', entityId: period.id, detail: `Recibos preliminares de ${period.name} (${count})` });
  res.json({ ok: true, count });
});

router.get('/rh/payslips', RH, (req, res) => {
  let items = db.all('payslips');
  if (req.query.periodId) items = items.filter((p) => p.periodId === Number(req.query.periodId));
  items.sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''));
  res.json(items.map(({ perceptions, deductions, ...rest }) => rest));
});

router.get('/rh/payslips/:id', RH, (req, res) => {
  const p = db.get('payslips', req.params.id);
  if (!p) return res.status(404).json({ error: 'Recibo no encontrado' });
  res.json(p);
});

// ---------- Tickets RH ----------
router.get('/rh/tickets', RH, (req, res) => {
  let items = db.all('tickets');
  if (req.query.status) items = items.filter((t) => t.status === req.query.status);
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json(items);
});

router.post('/rh/tickets/:id/reply', RH, (req, res) => {
  const t = db.get('tickets', req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket no encontrado' });
  t.messages.push({ by: req.user.name, role: 'rh', message: (req.body || {}).message || '', at: new Date().toISOString() });
  const status = (req.body || {}).status || (t.status === 'abierto' ? 'en_proceso' : t.status);
  db.update('tickets', t.id, { messages: t.messages, status });
  log(req, { action: 'reply', entity: 'ticket', entityId: t.id, detail: `Respuesta a ticket de ${t.employeeName}` });
  res.json(db.get('tickets', t.id));
});

router.put('/rh/tickets/:id', RH, (req, res) => {
  const t = db.get('tickets', req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket no encontrado' });
  const updated = db.update('tickets', t.id, { status: (req.body || {}).status || t.status });
  log(req, { action: 'update', entity: 'ticket', entityId: t.id, detail: `Ticket → ${updated.status}` });
  res.json(updated);
});

// ---------- Indicadores RH ----------
router.get('/rh/indicators', RH, (req, res) => {
  const period = req.query.periodId ? db.get('periods', req.query.periodId)
    : db.all('periods', (p) => p.status === 'abierto')[0] || db.all('periods')[0];
  if (!period) return res.json({ period: null });
  res.json(indicators(period));
});

export default router;
