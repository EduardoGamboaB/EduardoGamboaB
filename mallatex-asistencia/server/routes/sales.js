// CRM móvil de ventas — API del VENDEDOR (app móvil). Requiere sesión de empleado.
// Cartera, rutas de visita con GPS, visitas con evidencia y objetivos/desempeño.

import express from 'express';
import * as db from '../db.js';
import { requireEmployee } from '../auth.js';
import { requireCommercialProfile } from '../access.js';
import { logSystem } from '../audit.js';
import { recommend } from '../advisor.js';

const router = express.Router();
// Todo el CRM móvil de ventas requiere sesión de empleado CON perfil comercial.
router.use(requireEmployee, requireCommercialProfile);

// ---------- Asistente técnico (recomendación de malla) ----------
router.post('/advisor', (req, res) => {
  res.json(recommend(req.body || {}));
});

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

// ---------- Inventario (consulta) ----------
router.get('/products', (req, res) => {
  let items = db.all('products', (p) => p.active !== false);
  if (req.query.category) items = items.filter((p) => p.category === req.query.category);
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    items = items.filter((p) => (p.name + ' ' + p.sku + ' ' + (p.category || '')).toLowerCase().includes(q));
  }
  items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(items.map((p) => ({ id: p.id, sku: p.sku, name: p.name, category: p.category, unit: p.unit, price: p.price, stock: p.stock, warehouse: p.warehouse, specs: p.specs || '' })));
});

// Calcula líneas e importes a partir de items {productId, qty, discount}
function priceItems(rawItems) {
  const items = [];
  let subtotal = 0;
  for (const it of rawItems || []) {
    const p = db.get('products', it.productId);
    if (!p) continue;
    const qty = Math.max(0, Number(it.qty) || 0);
    const discount = Math.min(100, Math.max(0, Number(it.discount) || 0));
    const importe = round2(qty * p.price * (1 - discount / 100));
    subtotal += importe;
    items.push({ productId: p.id, sku: p.sku, name: p.name, unit: p.unit, price: p.price, qty, discount, importe });
  }
  const iva = round2(subtotal * 0.16);
  return { items, subtotal: round2(subtotal), iva, total: round2(subtotal + iva) };
}
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ---------- Cotizaciones ----------
router.get('/quotes', (req, res) => {
  const byId = Object.fromEntries(db.all('clients').map((c) => [c.id, c.name]));
  const items = db.all('quotes', (q) => q.employeeId === req.employeeId)
    .map((q) => ({ ...q, clientName: byId[q.clientId] || '—' }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

router.post('/quotes', (req, res) => {
  const b = req.body || {};
  const client = db.get('clients', b.clientId);
  if (!client || client.assignedTo !== req.employeeId) return res.status(404).json({ error: 'Cliente no encontrado en tu cartera' });
  const priced = priceItems(b.items);
  if (!priced.items.length) return res.status(400).json({ error: 'Agrega al menos un producto' });
  const created = db.insert('quotes', {
    employeeId: req.employeeId, clientId: client.id,
    ...priced, notes: b.notes || '', status: 'abierta', createdAt: now(),
  });
  const updated = db.update('quotes', created.id, { folio: 'COT-' + String(created.id).padStart(5, '0') });
  logSystem({ action: 'create', entity: 'quote', entityId: created.id, detail: `Cotización ${updated.folio} a ${client.name}: ${priced.total}` });
  res.status(201).json(updated);
});

// ---------- Pedidos ----------
router.get('/orders', (req, res) => {
  const byId = Object.fromEntries(db.all('clients').map((c) => [c.id, c.name]));
  const items = db.all('orders', (o) => o.employeeId === req.employeeId)
    .map((o) => ({ ...o, clientName: byId[o.clientId] || '—' }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

router.post('/orders', (req, res) => {
  const b = req.body || {};
  let clientId = b.clientId, priced;
  if (b.quoteId) {
    const q = db.get('quotes', b.quoteId);
    if (!q || q.employeeId !== req.employeeId) return res.status(404).json({ error: 'Cotización no encontrada' });
    clientId = q.clientId;
    priced = { items: q.items, subtotal: q.subtotal, iva: q.iva, total: q.total };
  } else {
    priced = priceItems(b.items);
  }
  const client = db.get('clients', clientId);
  if (!client || client.assignedTo !== req.employeeId) return res.status(404).json({ error: 'Cliente no encontrado en tu cartera' });
  if (!priced.items.length) return res.status(400).json({ error: 'El pedido no tiene productos' });
  const created = db.insert('orders', {
    employeeId: req.employeeId, clientId: client.id, quoteId: b.quoteId ? Number(b.quoteId) : null,
    ...priced, status: 'pendiente', notes: b.notes || '', createdAt: now(),
  });
  const updated = db.update('orders', created.id, { folio: 'PED-' + String(created.id).padStart(5, '0') });
  if (b.quoteId) db.update('quotes', Number(b.quoteId), { status: 'convertida' });
  // Acumula el importe al objetivo del vendedor (avance de venta)
  const obj = db.all('salesObjectives', (o) => o.employeeId === req.employeeId).sort((a, c) => (a.period < c.period ? 1 : -1))[0];
  if (obj) db.update('salesObjectives', obj.id, { achievedAmount: round2((obj.achievedAmount || 0) + priced.total) });
  logSystem({ action: 'create', entity: 'order', entityId: created.id, detail: `Pedido ${updated.folio} de ${client.name}: ${priced.total}` });
  res.status(201).json(updated);
});

// ---------- Administrativo: viáticos, gastos y facturas ----------
// El vendedor levanta desde el campo; el gerente aprueba/emite desde la web (crm.js).
const EXPENSE_CAT = ['hospedaje', 'alimentos', 'combustible', 'casetas', 'transporte', 'otros'];

// Solicitud de viáticos (anticipo de gastos de viaje)
router.get('/expense-requests', (req, res) => {
  const items = db.all('expenseRequests', (r) => r.employeeId === req.employeeId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

router.post('/expense-requests', (req, res) => {
  const b = req.body || {};
  const amount = Math.max(0, Number(b.amount) || 0);
  if (!b.concept || !amount) return res.status(400).json({ error: 'Concepto y monto son obligatorios' });
  const created = db.insert('expenseRequests', {
    employeeId: req.employeeId,
    concept: b.concept,
    description: b.description || '',
    destination: b.destination || '',
    amount,
    fromDate: b.fromDate || null,
    toDate: b.toDate || null,
    status: 'solicitado',
    decidedBy: null, decidedAt: null, decisionNote: '',
    createdAt: now(),
  });
  const updated = db.update('expenseRequests', created.id, { folio: 'VIA-' + String(created.id).padStart(5, '0') });
  logSystem({ action: 'create', entity: 'expenseRequest', entityId: created.id, detail: `Viático ${updated.folio} (${amount}) vendedor ${req.employeeId}` });
  res.status(201).json(updated);
});

// Comprobación de gastos (ticket/factura con evidencia)
router.get('/expenses', (req, res) => {
  const items = db.all('expenses', (e) => e.employeeId === req.employeeId)
    .map((e) => ({ ...e, photo: undefined, hasPhoto: !!e.photo }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

router.post('/expenses', (req, res) => {
  const b = req.body || {};
  const amount = Math.max(0, Number(b.amount) || 0);
  if (!amount) return res.status(400).json({ error: 'El monto es obligatorio' });
  const category = EXPENSE_CAT.includes(b.category) ? b.category : 'otros';
  if (b.requestId) {
    const vr = db.get('expenseRequests', b.requestId);
    if (!vr || vr.employeeId !== req.employeeId) return res.status(404).json({ error: 'Viático no encontrado' });
  }
  const created = db.insert('expenses', {
    employeeId: req.employeeId,
    requestId: b.requestId ? Number(b.requestId) : null,
    category,
    merchant: b.merchant || '',
    amount,
    date: b.date || now().slice(0, 10),
    hasInvoice: b.hasInvoice === true,
    rfc: b.rfc || '',
    notes: b.notes || '',
    photo: typeof b.photo === 'string' ? b.photo.slice(0, 900000) : null,
    status: 'pendiente',
    createdAt: now(),
  });
  const updated = db.update('expenses', created.id, { folio: 'GTO-' + String(created.id).padStart(5, '0') });
  logSystem({ action: 'create', entity: 'expense', entityId: created.id, detail: `Gasto ${updated.folio} ${category} (${amount}) vendedor ${req.employeeId}` });
  res.status(201).json({ ...updated, photo: undefined, hasPhoto: !!updated.photo });
});

// Solicitud de emisión de factura (CFDI) — se integra con Aspel al confirmar el pago (fase posterior)
router.get('/invoices', (req, res) => {
  const byId = Object.fromEntries(db.all('clients').map((c) => [c.id, c.name]));
  const items = db.all('invoices', (i) => i.employeeId === req.employeeId)
    .map((i) => ({ ...i, clientName: byId[i.clientId] || i.razonSocial || '—' }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(items);
});

router.post('/invoices', (req, res) => {
  const b = req.body || {};
  let clientId = b.clientId ? Number(b.clientId) : null;
  let amount = Math.max(0, Number(b.amount) || 0);
  let orderId = null;
  if (b.orderId) {
    const o = db.get('orders', b.orderId);
    if (!o || o.employeeId !== req.employeeId) return res.status(404).json({ error: 'Pedido no encontrado' });
    orderId = o.id; clientId = o.clientId; amount = o.total;
  }
  if (clientId) {
    const c = db.get('clients', clientId);
    if (!c || c.assignedTo !== req.employeeId) return res.status(404).json({ error: 'Cliente no encontrado en tu cartera' });
  }
  if (!amount) return res.status(400).json({ error: 'El importe es obligatorio' });
  if (!b.rfc) return res.status(400).json({ error: 'El RFC es obligatorio' });
  const created = db.insert('invoices', {
    employeeId: req.employeeId,
    clientId, orderId,
    rfc: b.rfc,
    razonSocial: b.razonSocial || '',
    usoCfdi: b.usoCfdi || 'G03',
    amount,
    status: 'solicitada',
    uuid: null, emittedAt: null, emittedBy: null,
    createdAt: now(),
  });
  const updated = db.update('invoices', created.id, { folio: 'FAC-' + String(created.id).padStart(5, '0') });
  logSystem({ action: 'create', entity: 'invoice', entityId: created.id, detail: `Factura ${updated.folio} (${amount}) RFC ${b.rfc}` });
  res.status(201).json(updated);
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
