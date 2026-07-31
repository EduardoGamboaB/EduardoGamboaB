// CRM móvil de ventas — API del VENDEDOR (app móvil). Requiere sesión de empleado.
// Cartera, rutas de visita con GPS, visitas con evidencia y objetivos/desempeño.

import express from 'express';
import * as db from '../db.js';
import { requireEmployee } from '../auth.js';
import { logSystem } from '../audit.js';

const router = express.Router();
router.use(requireEmployee);

const VISIT_STATUS = ['realizada', 'no_localizado', 'reagendada'];
const VISIT_TYPE = ['prospeccion', 'seguimiento', 'cierre', 'cobranza', 'entrega', 'postventa'];
const now = () => new Date().toISOString();

// ---------- Cartera de clientes / prospectos ----------
router.get('/my-clients', (req, res) => {
  const items = db.all('clients', (c) => c.active !== false && c.assignedTo === req.employeeId)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(items);
});

router.get('/clients/:id', (req, res) => {
  const c = db.get('clients', req.params.id);
  if (!c || c.assignedTo !== req.employeeId) return res.status(404).json({ error: 'Cliente no encontrado' });
  const visits = db.all('visits', (v) => v.clientId === c.id && v.employeeId === req.employeeId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);
  res.json({ ...c, visits });
});

// Alta de prospecto desde el campo
router.post('/clients', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const created = db.insert('clients', {
    name: b.name,
    type: 'prospecto',
    stage: 'prospecto',
    contactName: b.contactName || '',
    phone: b.phone || '',
    email: b.email || '',
    address: b.address || '',
    lat: b.lat != null ? Number(b.lat) : null,
    lng: b.lng != null ? Number(b.lng) : null,
    cultivo: b.cultivo || '',
    notes: b.notes || '',
    assignedTo: req.employeeId,
    createdBy: 'app-movil',
    active: true,
    createdAt: now(),
  });
  logSystem({ action: 'create', entity: 'client', entityId: created.id, detail: `Prospecto ${created.name} (vendedor ${req.employeeId})` });
  res.status(201).json(created);
});

// ---------- Rutas de visita (recorrido GPS) ----------
router.post('/routes/start', (req, res) => {
  const b = req.body || {};
  const open = db.find('salesRoutes', (r) => r.employeeId === req.employeeId && r.status === 'en_curso');
  if (open) return res.json(open); // ya hay una ruta en curso
  const created = db.insert('salesRoutes', {
    employeeId: req.employeeId,
    date: now().slice(0, 10),
    status: 'en_curso',
    startedAt: now(),
    endedAt: null,
    plannedClientIds: Array.isArray(b.plannedClientIds) ? b.plannedClientIds.map(Number) : [],
    track: b.lat != null && b.lng != null ? [{ lat: Number(b.lat), lng: Number(b.lng), ts: now() }] : [],
  });
  logSystem({ action: 'start', entity: 'salesRoute', entityId: created.id, detail: `Inicia ruta (vendedor ${req.employeeId})` });
  res.status(201).json(created);
});

router.get('/routes/active', (req, res) => {
  res.json(db.find('salesRoutes', (r) => r.employeeId === req.employeeId && r.status === 'en_curso') || null);
});

// Agrega puntos al recorrido (batch, apto para offline)
router.post('/routes/:id/track', (req, res) => {
  const r = db.get('salesRoutes', req.params.id);
  if (!r || r.employeeId !== req.employeeId) return res.status(404).json({ error: 'Ruta no encontrada' });
  if (r.status !== 'en_curso') return res.status(409).json({ error: 'La ruta ya está finalizada' });
  const pts = Array.isArray(req.body?.points) ? req.body.points : (req.body?.lat != null ? [req.body] : []);
  const clean = pts.filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
    .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng), ts: p.ts || now() }));
  const updated = db.update('salesRoutes', r.id, { track: [...(r.track || []), ...clean] });
  res.json({ ok: true, points: updated.track.length });
});

router.post('/routes/:id/end', (req, res) => {
  const r = db.get('salesRoutes', req.params.id);
  if (!r || r.employeeId !== req.employeeId) return res.status(404).json({ error: 'Ruta no encontrada' });
  const visits = db.all('visits', (v) => v.routeId === r.id).length;
  const updated = db.update('salesRoutes', r.id, { status: 'finalizada', endedAt: now() });
  logSystem({ action: 'end', entity: 'salesRoute', entityId: r.id, detail: `Finaliza ruta (${(r.track || []).length} puntos, ${visits} visitas)` });
  res.json(updated);
});

// ---------- Visitas (con evidencia) ----------
router.get('/visits', (req, res) => {
  let items = db.all('visits', (v) => v.employeeId === req.employeeId);
  if (req.query.routeId) items = items.filter((v) => v.routeId === Number(req.query.routeId));
  const byId = Object.fromEntries(db.all('clients').map((c) => [c.id, c.name]));
  items = items.map((v) => ({ ...v, clientName: byId[v.clientId] || '—', photos: undefined, photoCount: (v.photos || []).length }));
  items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(items);
});

router.post('/visits', (req, res) => {
  const b = req.body || {};
  if (!b.clientId) return res.status(400).json({ error: 'clientId es obligatorio' });
  const client = db.get('clients', b.clientId);
  if (!client || client.assignedTo !== req.employeeId) return res.status(404).json({ error: 'Cliente no encontrado en tu cartera' });
  const status = VISIT_STATUS.includes(b.status) ? b.status : 'realizada';
  const type = VISIT_TYPE.includes(b.type) ? b.type : 'seguimiento';
  const created = db.insert('visits', {
    employeeId: req.employeeId,
    clientId: Number(b.clientId),
    routeId: b.routeId ? Number(b.routeId) : null,
    timestamp: b.timestamp || now(),
    lat: b.lat != null ? Number(b.lat) : null,
    lng: b.lng != null ? Number(b.lng) : null,
    found: b.found === true,
    status,
    type,
    notes: b.notes || '',
    photos: Array.isArray(b.photos) ? b.photos.slice(0, 5) : [],
    offline: b.offline === true,
    createdAt: now(),
  });
  // Un prospecto localizado y trabajado avanza de etapa
  if (client.type === 'prospecto' && b.found === true && client.stage === 'prospecto') {
    db.update('clients', client.id, { stage: 'negociacion' });
  }
  logSystem({ action: 'visit', entity: 'client', entityId: client.id, detail: `Visita ${type}/${status} a ${client.name} (vendedor ${req.employeeId})` });
  res.status(201).json({ id: created.id, ok: true, status, type });
});

// ---------- Objetivos y desempeño ----------
router.get('/objectives/me', (req, res) => {
  const objs = db.all('salesObjectives', (o) => o.employeeId === req.employeeId)
    .sort((a, b) => (a.period < b.period ? 1 : -1));
  const current = objs[0] || null;
  const visitsThisRoute = db.all('visits', (v) => v.employeeId === req.employeeId).length;
  const clients = db.all('clients', (c) => c.assignedTo === req.employeeId && c.active !== false).length;
  const prospectos = db.all('clients', (c) => c.assignedTo === req.employeeId && c.type === 'prospecto' && c.active !== false).length;
  res.json({
    objective: current,
    progressPct: current && current.targetAmount ? Math.min(100, Math.round((current.achievedAmount / current.targetAmount) * 100)) : 0,
    kpis: { cartera: clients, prospectos, visitas: visitsThisRoute },
    history: objs,
  });
});

export default router;
