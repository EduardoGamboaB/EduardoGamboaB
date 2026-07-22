// Periodos de nómina, tablero (dashboard) y exportación a NOI.

import express from 'express';
import * as db from '../db.js';
import { requireRole, ROLES } from '../auth.js';
import { log } from '../audit.js';
import { periodSummary, STATUS, reprocess } from '../rules.js';
import { buildMovements, toFile } from '../noi.js';

const router = express.Router();

// ---------- Periodos ----------
router.get('/periods', (_req, res) => {
  const items = db.all('periods').sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  res.json(items);
});

router.post('/periods', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.startDate || !b.endDate) return res.status(400).json({ error: 'name, startDate y endDate son obligatorios' });
  const created = db.insert('periods', {
    name: b.name, startDate: b.startDate, endDate: b.endDate,
    status: 'abierto', closedBy: null, closedAt: null,
  });
  reprocess({ startDate: b.startDate, endDate: b.endDate });
  log(req, { action: 'create', entity: 'period', entityId: created.id, detail: `Alta de periodo ${created.name}` });
  res.status(201).json(created);
});

// Resumen del periodo por empleado + pendientes
router.get('/periods/:id/summary', (req, res) => {
  const period = db.get('periods', req.params.id);
  if (!period) return res.status(404).json({ error: 'Periodo no encontrado' });
  const employees = db.all('employees', (e) => e.active !== false);
  const rows = employees.map((e) => {
    const s = periodSummary(period, e.id);
    return { employee: { id: e.id, name: e.name, code: e.code, department: e.department }, ...s };
  });
  const pendingIncidents = db.all('incidents', (i) => i.status === 'pendiente' && !(i.endDate < period.startDate || i.startDate > period.endDate)).length;
  const pendingOvertime = db.all('overtime', (o) => o.status === 'pendiente' && o.date >= period.startDate && o.date <= period.endDate).length;
  const omisiones = db.all('attendance', (a) => a.status === STATUS.OMISION && a.date >= period.startDate && a.date <= period.endDate).length;
  res.json({ period, rows, pending: { incidents: pendingIncidents, overtime: pendingOvertime, omisiones } });
});

// Cierre de periodo: exige que no queden pendientes por autorizar
router.post('/periods/:id/close', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const period = db.get('periods', req.params.id);
  if (!period) return res.status(404).json({ error: 'Periodo no encontrado' });
  if (period.status === 'cerrado') return res.status(409).json({ error: 'El periodo ya está cerrado' });
  const pendingIncidents = db.all('incidents', (i) => i.status === 'pendiente' && !(i.endDate < period.startDate || i.startDate > period.endDate)).length;
  const pendingOvertime = db.all('overtime', (o) => o.status === 'pendiente' && o.date >= period.startDate && o.date <= period.endDate).length;
  if (!req.body?.force && (pendingIncidents || pendingOvertime)) {
    return res.status(409).json({
      error: 'Existen movimientos pendientes de autorizar',
      pending: { incidents: pendingIncidents, overtime: pendingOvertime },
    });
  }
  const updated = db.update('periods', period.id, { status: 'cerrado', closedBy: req.user.name, closedAt: new Date().toISOString() });
  log(req, { action: 'close', entity: 'period', entityId: period.id, detail: `Cierre de ${period.name}` });
  res.json(updated);
});

router.post('/periods/:id/reopen', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const period = db.get('periods', req.params.id);
  if (!period) return res.status(404).json({ error: 'Periodo no encontrado' });
  const updated = db.update('periods', period.id, { status: 'abierto', closedBy: null, closedAt: null });
  log(req, { action: 'reopen', entity: 'period', entityId: period.id, detail: `Reapertura de ${period.name}` });
  res.json(updated);
});

// ---------- Tablero / KPIs ----------
router.get('/dashboard', (req, res) => {
  const periodId = req.query.periodId;
  const period = periodId ? db.get('periods', periodId) : db.all('periods', (p) => p.status === 'abierto')[0] || db.all('periods')[0];
  if (!period) return res.json({ period: null });

  const employees = db.all('employees', (e) => e.active !== false);
  const att = db.all('attendance', (a) => a.date >= period.startDate && a.date <= period.endDate);
  const counts = { asistencia: 0, retardo: 0, falta: 0, omision: 0, vacaciones: 0, permiso: 0, incapacidad: 0, justificada: 0, descanso: 0, festivo: 0 };
  let overtimeMin = 0, lateMin = 0;
  for (const a of att) {
    if (a.status in counts) counts[a.status]++;
    lateMin += a.lateMinutes || 0;
  }
  const otAuth = db.all('overtime', (o) => o.status === 'autorizada' && o.date >= period.startDate && o.date <= period.endDate);
  overtimeMin = otAuth.reduce((s, o) => s + (o.authorizedMinutes || 0), 0);

  const device = db.all('devices')[0] || null;
  const pendingIncidents = db.all('incidents', (i) => i.status === 'pendiente').length;
  const pendingOvertime = db.all('overtime', (o) => o.status === 'pendiente' && o.date >= period.startDate && o.date <= period.endDate).length;
  const bonusEligible = employees.filter((e) => periodSummary(period, e.id).bonusEligible).length;

  res.json({
    period,
    employees: employees.length,
    counts,
    overtimeHours: Math.round((overtimeMin / 60) * 10) / 10,
    lateMinutes: lateMin,
    device: device ? { name: device.name, lastSync: device.lastSync, model: device.model } : null,
    pending: { incidents: pendingIncidents, overtime: pendingOvertime },
    bonusEligible,
  });
});

// ---------- Exportación NOI ----------
router.get('/periods/:id/noi/preview', (req, res) => {
  const period = db.get('periods', req.params.id);
  if (!period) return res.status(404).json({ error: 'Periodo no encontrado' });
  const result = buildMovements(period);
  res.json(result);
});

router.get('/periods/:id/noi/export', (req, res) => {
  const period = db.get('periods', req.params.id);
  if (!period) return res.status(404).json({ error: 'Periodo no encontrado' });
  const format = req.query.format === 'csv' ? 'csv' : 'txt';
  const { movements, pending } = buildMovements(period);
  if (!req.query.force && (pending.incidents || pending.overtime)) {
    return res.status(409).json({ error: 'Hay movimientos pendientes de autorizar', pending });
  }
  const content = toFile(movements, format);
  const safeName = period.name.replaceAll(/[^\w]+/g, '_');
  const filename = `NOI_${safeName}.${format}`;
  log(req, { action: 'export', entity: 'noi', entityId: period.id, detail: `Exportación NOI ${period.name} (${movements.length} movimientos, ${format})` });
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
});

export default router;
