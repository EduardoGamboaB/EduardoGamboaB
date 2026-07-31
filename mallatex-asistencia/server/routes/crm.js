// CRM — administración del GERENTE COMERCIAL (app web). Cartera de clientes,
// asignación al vendedor y objetivos de venta. Se monta en la cadena adminOnly.

import express from 'express';
import * as db from '../db.js';
import { requireRole, ROLES } from '../auth.js';
import { log } from '../audit.js';
import { aspelTimbrar, integrationsStatus } from '../integrations.js';

const router = express.Router();
const WRITE = requireRole(ROLES.ADMIN, ROLES.CONTADOR);

// ---------- Clientes / prospectos ----------
router.get('/crm/clients', (req, res) => {
  let items = db.all('clients');
  if (req.query.active === 'true') items = items.filter((c) => c.active !== false);
  if (req.query.assignedTo) items = items.filter((c) => c.assignedTo === Number(req.query.assignedTo));
  if (req.query.type) items = items.filter((c) => c.type === req.query.type);
  const empById = Object.fromEntries(db.all('employees').map((e) => [e.id, e.name]));
  items = items.map((c) => ({ ...c, assignedToName: empById[c.assignedTo] || null }));
  items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(items);
});

router.post('/crm/clients', WRITE, (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const created = db.insert('clients', {
    name: b.name,
    type: ['cliente', 'prospecto'].includes(b.type) ? b.type : 'cliente',
    stage: b.stage || (b.type === 'prospecto' ? 'prospecto' : 'cliente'),
    contactName: b.contactName || '',
    phone: b.phone || '', email: b.email || '', address: b.address || '',
    lat: b.lat != null ? Number(b.lat) : null,
    lng: b.lng != null ? Number(b.lng) : null,
    cultivo: b.cultivo || '',
    assignedTo: b.assignedTo ? Number(b.assignedTo) : null,
    notes: b.notes || '',
    active: true,
  });
  log(req, { action: 'create', entity: 'client', entityId: created.id, detail: `Alta de cliente ${created.name}` });
  res.status(201).json(created);
});

router.put('/crm/clients/:id', WRITE, (req, res) => {
  const c = db.get('clients', req.params.id);
  if (!c) return res.status(404).json({ error: 'Cliente no encontrado' });
  const b = req.body || {};
  const patch = {};
  for (const k of ['name', 'type', 'stage', 'contactName', 'phone', 'email', 'address', 'cultivo', 'notes', 'active']) if (k in b) patch[k] = b[k];
  for (const k of ['lat', 'lng']) if (k in b) patch[k] = b[k] != null ? Number(b[k]) : null;
  if ('assignedTo' in b) patch.assignedTo = b.assignedTo ? Number(b.assignedTo) : null;
  const updated = db.update('clients', c.id, patch);
  log(req, { action: 'update', entity: 'client', entityId: c.id, detail: `Cliente ${updated.name} actualizado` });
  res.json(updated);
});

// Asignar cartera (uno o varios clientes a un vendedor)
router.post('/crm/assign', WRITE, (req, res) => {
  const { employeeId, clientIds } = req.body || {};
  if (!employeeId || !Array.isArray(clientIds)) return res.status(400).json({ error: 'employeeId y clientIds son obligatorios' });
  const emp = db.get('employees', employeeId);
  if (!emp) return res.status(404).json({ error: 'Vendedor no encontrado' });
  let n = 0;
  for (const id of clientIds) { if (db.get('clients', id)) { db.update('clients', id, { assignedTo: Number(employeeId) }); n++; } }
  log(req, { action: 'assign', entity: 'client', detail: `Asigna ${n} cliente(s) a ${emp.name}` });
  res.json({ ok: true, assigned: n });
});

// Seguimiento: visitas de un cliente (para el gerente)
router.get('/crm/clients/:id/visits', (req, res) => {
  const visits = db.all('visits', (v) => v.clientId === Number(req.params.id))
    .map((v) => ({ ...v, photos: undefined, photoCount: (v.photos || []).length }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(visits);
});

// ---------- Objetivos de venta ----------
router.get('/crm/objectives', (req, res) => {
  let items = db.all('salesObjectives');
  if (req.query.employeeId) items = items.filter((o) => o.employeeId === Number(req.query.employeeId));
  if (req.query.period) items = items.filter((o) => o.period === req.query.period);
  res.json(items);
});

router.post('/crm/objectives', WRITE, (req, res) => {
  const b = req.body || {};
  if (!b.employeeId || !b.period || b.targetAmount == null) return res.status(400).json({ error: 'employeeId, period y targetAmount son obligatorios' });
  const existing = db.find('salesObjectives', (o) => o.employeeId === Number(b.employeeId) && o.period === b.period);
  const data = { employeeId: Number(b.employeeId), period: b.period, targetAmount: Number(b.targetAmount), achievedAmount: Number(b.achievedAmount) || 0 };
  const saved = existing ? db.update('salesObjectives', existing.id, data) : db.insert('salesObjectives', data);
  log(req, { action: existing ? 'update' : 'create', entity: 'salesObjective', entityId: saved.id, detail: `Objetivo ${data.period} de vendedor ${data.employeeId}: ${data.targetAmount}` });
  res.status(existing ? 200 : 201).json(saved);
});

// ---------- Administrativo: viáticos, gastos y facturas (gerente) ----------
const empName = (id) => (db.get('employees', id) || {}).name || `#${id}`;

// Viáticos: revisión y aprobación/rechazo
router.get('/crm/expense-requests', (req, res) => {
  let items = db.all('expenseRequests');
  if (req.query.status) items = items.filter((r) => r.status === req.query.status);
  items = items.map((r) => ({ ...r, employeeName: empName(r.employeeId) }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

router.post('/crm/expense-requests/:id/decision', WRITE, (req, res) => {
  const r = db.get('expenseRequests', req.params.id);
  if (!r) return res.status(404).json({ error: 'Solicitud no encontrada' });
  const decision = req.body?.decision === 'aprobado' ? 'aprobado' : req.body?.decision === 'rechazado' ? 'rechazado' : null;
  if (!decision) return res.status(400).json({ error: 'decision debe ser aprobado o rechazado' });
  const updated = db.update('expenseRequests', r.id, {
    status: decision, decidedBy: req.user?.name || 'Gerente', decidedAt: new Date().toISOString(), decisionNote: req.body?.note || '',
  });
  log(req, { action: decision, entity: 'expenseRequest', entityId: r.id, detail: `Viático ${r.folio} ${decision}` });
  res.json(updated);
});

// Gastos: comprobaciones (con evidencia) y aprobación
router.get('/crm/expenses', (req, res) => {
  let items = db.all('expenses');
  if (req.query.status) items = items.filter((e) => e.status === req.query.status);
  if (req.query.employeeId) items = items.filter((e) => e.employeeId === Number(req.query.employeeId));
  items = items.map((e) => ({ ...e, employeeName: empName(e.employeeId), photo: undefined, hasPhoto: !!e.photo }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

// Evidencia de un gasto (imagen del ticket/factura)
router.get('/crm/expenses/:id/photo', (req, res) => {
  const e = db.get('expenses', req.params.id);
  if (!e || !e.photo) return res.status(404).json({ error: 'Sin evidencia' });
  res.json({ photo: e.photo });
});

router.post('/crm/expenses/:id/decision', WRITE, (req, res) => {
  const e = db.get('expenses', req.params.id);
  if (!e) return res.status(404).json({ error: 'Gasto no encontrado' });
  const decision = req.body?.decision === 'aprobado' ? 'aprobado' : req.body?.decision === 'rechazado' ? 'rechazado' : null;
  if (!decision) return res.status(400).json({ error: 'decision debe ser aprobado o rechazado' });
  const updated = db.update('expenses', e.id, { status: decision, decidedBy: req.user?.name || 'Gerente', decidedAt: new Date().toISOString() });
  log(req, { action: decision, entity: 'expense', entityId: e.id, detail: `Gasto ${e.folio} ${decision}` });
  res.json({ ...updated, photo: undefined, hasPhoto: !!updated.photo });
});

// Facturación: solicitudes y emisión (integración Aspel — fase posterior)
router.get('/crm/invoices', (req, res) => {
  let items = db.all('invoices');
  if (req.query.status) items = items.filter((i) => i.status === req.query.status);
  const cliById = Object.fromEntries(db.all('clients').map((c) => [c.id, c.name]));
  items = items.map((i) => ({ ...i, employeeName: empName(i.employeeId), clientName: cliById[i.clientId] || i.razonSocial || '—' }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

router.post('/crm/invoices/:id/emit', WRITE, async (req, res) => {
  const i = db.get('invoices', req.params.id);
  if (!i) return res.status(404).json({ error: 'Factura no encontrada' });
  if (i.status === 'emitida' || i.status === 'pagada') return res.status(409).json({ error: 'La factura ya fue emitida' });
  // Timbrado del CFDI (Aspel): en modo http llama al PAC; en mock genera un UUID determinista.
  let timbre;
  try { timbre = await aspelTimbrar(i, { uuidOverride: req.body?.uuid }); }
  catch (e) { return res.status(502).json({ error: `No se pudo timbrar en Aspel: ${e.message}` }); }
  const updated = db.update('invoices', i.id, { status: 'emitida', uuid: timbre.uuid, timbreMode: timbre.mode, emittedAt: new Date().toISOString(), emittedBy: req.user?.name || 'Gerente' });
  log(req, { action: 'emit', entity: 'invoice', entityId: i.id, detail: `Factura ${i.folio} emitida (${timbre.mode}, UUID ${timbre.uuid})` });
  res.json(updated);
});

// Estado de los conectores externos (G3 / MES / Aspel) para diagnóstico del gerente.
router.get('/crm/integrations/status', (req, res) => {
  res.json(integrationsStatus());
});

router.post('/crm/invoices/:id/cancel', WRITE, (req, res) => {
  const i = db.get('invoices', req.params.id);
  if (!i) return res.status(404).json({ error: 'Factura no encontrada' });
  const updated = db.update('invoices', i.id, { status: 'cancelada' });
  log(req, { action: 'cancel', entity: 'invoice', entityId: i.id, detail: `Factura ${i.folio} cancelada` });
  res.json(updated);
});

export default router;
