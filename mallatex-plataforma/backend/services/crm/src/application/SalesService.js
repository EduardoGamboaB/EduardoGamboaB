import { DomainError } from '@mallatex/shared/ddd';
import { Client } from '../domain/Client.js';
import { Quote } from '../domain/Quote.js';
import { Order } from '../domain/Order.js';
import { Visit } from '../domain/Visit.js';
import { SalesRoute } from '../domain/SalesRoute.js';
import { Folio } from '../domain/Folio.js';
import { priceItems, round2 } from '../domain/Pricing.js';
import { recommend } from '../domain/Advisor.js';

const EXPENSE_CAT = ['hospedaje', 'alimentos', 'combustible', 'casetas', 'transporte', 'otros'];
const notFound = (msg) => new DomainError(msg, { code: 'NOT_FOUND', status: 404 });
const numId = (x, name = 'id') => {
  const n = Number(x);
  if (!Number.isFinite(n)) throw new DomainError(` inválido`, { code: 'ID_INVALID', status: 400 });
  return n;
};

/**
 * SalesService — casos de uso de la superficie MÓVIL del vendedor. Todas las
 * operaciones se acotan al empleado autenticado (employeeId = JWT sub): cartera,
 * rutas GPS, visitas con evidencia, cotizaciones, pedidos, viáticos, gastos,
 * facturas y objetivos.
 */
export class SalesService {
  constructor({ clientDAO, routeDAO, visitDAO, quoteDAO, orderDAO, productDAO, objectiveDAO, expenseRequestDAO, expenseDAO, invoiceDAO }) {
    this.clientDAO = clientDAO;
    this.routeDAO = routeDAO;
    this.visitDAO = visitDAO;
    this.quoteDAO = quoteDAO;
    this.orderDAO = orderDAO;
    this.productDAO = productDAO;
    this.objectiveDAO = objectiveDAO;
    this.expenseRequestDAO = expenseRequestDAO;
    this.expenseDAO = expenseDAO;
    this.invoiceDAO = invoiceDAO;
  }

  // ---- Asistente técnico -------------------------------------------
  async advisor(input) {
    const products = await this.productDAO.findAll({ active: true });
    return recommend(input || {}, products);
  }

  // ---- Cartera ------------------------------------------------------
  async myClients(employeeId) {
    const items = await this.clientDAO.findAll({ assignedTo: employeeId, active: true }, { order: [['name', 'ASC']] });
    return items.map((c) => c.toPlain());
  }

  /** Verifica que el cliente exista y pertenezca a la cartera del vendedor. */
  async #ownedClient(employeeId, clientId) {
    const c = await this.clientDAO.findById(numId(clientId));
    if (!c || c.assignedTo !== employeeId) throw notFound('Cliente no encontrado en tu cartera');
    return c;
  }

  async clientDetail(employeeId, id) {
    const c = await this.#ownedClient(employeeId, id);
    const visits = await this.visitDAO.findAll(
      { clientId: c.id, employeeId },
      { order: [['ts', 'DESC']], limit: 20 }
    );
    return { ...c.toPlain(), visits: visits.map((v) => v.toPlain()) };
  }

  async createClient(employeeId, body) {
    const client = Client.create({ ...(body || {}), type: 'prospecto', stage: 'prospecto', assignedTo: employeeId });
    const saved = await this.clientDAO.create(client);
    return saved.toPlain();
  }

  // ---- Rutas de visita ---------------------------------------------
  async startRoute(employeeId, body) {
    const open = await this.routeDAO.activeFor(employeeId);
    if (open) return { route: open.toPlain(), created: false }; // ya hay ruta en curso
    const route = SalesRoute.start({ employeeId, ...(body || {}) });
    const saved = await this.routeDAO.create(route);
    return { route: saved.toPlain(), created: true };
  }

  async activeRoute(employeeId) {
    const r = await this.routeDAO.activeFor(employeeId);
    return r ? r.toPlain() : null;
  }

  async trackRoute(employeeId, routeId, body) {
    const r = await this.routeDAO.findById(numId(routeId));
    if (!r || r.employeeId !== employeeId) throw notFound('Ruta no encontrada');
    const pts = Array.isArray(body?.points) ? body.points : body?.lat != null ? [body] : [];
    r.addTrack(pts);
    await this.routeDAO.update(r.id, { track: r.track });
    return { ok: true, points: r.track.length };
  }

  async endRoute(employeeId, routeId) {
    const r = await this.routeDAO.findById(numId(routeId));
    if (!r || r.employeeId !== employeeId) throw notFound('Ruta no encontrada');
    r.end();
    const saved = await this.routeDAO.update(r.id, { status: r.status, endedAt: r.endedAt });
    return saved.toPlain();
  }

  // ---- Visitas ------------------------------------------------------
  async listVisits(employeeId, query = {}) {
    const where = { employeeId };
    if (query.routeId) where.routeId = Number(query.routeId);
    const visits = await this.visitDAO.findAll(where, { order: [['ts', 'DESC']] });
    const names = await this.#clientNameMap(employeeId);
    return visits.map((v) => {
      const p = v.toPlain();
      return { ...p, clientName: names[p.clientId] || '—', photos: undefined, photoCount: (p.photos || []).length };
    });
  }

  async createVisit(employeeId, body) {
    const b = body || {};
    const client = await this.#ownedClient(employeeId, b.clientId);
    const visit = Visit.create({ ...b, employeeId, routeId: b.routeId ? Number(b.routeId) : null });
    const saved = await this.visitDAO.create(visit);
    // Un prospecto localizado avanza de etapa.
    if (client.advanceOnVisit(b.found === true)) {
      await this.clientDAO.update(client.id, { stage: client.stage });
    }
    return { id: saved.id, ok: true, status: saved.status, type: saved.type };
  }

  // ---- Inventario (consulta) ---------------------------------------
  async searchProducts(query = {}) {
    const items = await this.productDAO.search({ q: query.q, category: query.category });
    return items.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      price: Number(p.price),
      stock: Number(p.stock),
      warehouse: p.warehouse,
      specs: p.specs || {},
    }));
  }

  // ---- Cotizaciones -------------------------------------------------
  async listQuotes(employeeId) {
    const quotes = await this.quoteDAO.findAll({ employeeId }, { order: [['createdAt', 'DESC']] });
    const names = await this.#clientNameMap(employeeId);
    return quotes.map((q) => ({ ...q.toPlain(), clientName: names[q.clientId] || '—' }));
  }

  async createQuote(employeeId, body) {
    const b = body || {};
    const client = await this.#ownedClient(employeeId, b.clientId);
    const priced = await this.#price(b.items);
    const quote = Quote.create({ employeeId, clientId: client.id, priced });
    const saved = await this.quoteDAO.create(quote);
    saved.stampFolio();
    const updated = await this.quoteDAO.update(saved.id, { folio: saved.folio });
    return updated.toPlain();
  }

  // ---- Pedidos ------------------------------------------------------
  async listOrders(employeeId) {
    const orders = await this.orderDAO.findAll({ employeeId }, { order: [['createdAt', 'DESC']] });
    const names = await this.#clientNameMap(employeeId);
    return orders.map((o) => ({ ...o.toPlain(), clientName: names[o.clientId] || '—' }));
  }

  async createOrder(employeeId, body) {
    const b = body || {};
    let clientId = b.clientId;
    let priced;
    let sourceQuote = null;
    if (b.quoteId) {
      sourceQuote = await this.quoteDAO.findById(numId(b.quoteId));
      if (!sourceQuote || sourceQuote.employeeId !== employeeId) throw notFound('Cotización no encontrada');
      clientId = sourceQuote.clientId;
      priced = { items: sourceQuote.items, subtotal: sourceQuote.subtotal, iva: sourceQuote.iva, total: sourceQuote.total };
    } else {
      priced = await this.#price(b.items);
    }
    const client = await this.#ownedClient(employeeId, clientId);
    const order = Order.create({ employeeId, clientId: client.id, quoteId: b.quoteId ? Number(b.quoteId) : null, priced });
    const saved = await this.orderDAO.create(order);
    saved.stampFolio();
    const updated = await this.orderDAO.update(saved.id, { folio: saved.folio });
    if (sourceQuote) {
      sourceQuote.markConverted();
      await this.quoteDAO.update(sourceQuote.id, { status: sourceQuote.status });
    }
    await this.#accrueObjective(employeeId, saved.total);
    return updated.toPlain();
  }

  // ---- Viáticos -----------------------------------------------------
  async listExpenseRequests(employeeId) {
    return this.expenseRequestDAO.findAll({ employeeId }, { order: [['createdAt', 'DESC']] });
  }

  async createExpenseRequest(employeeId, body) {
    const b = body || {};
    const amount = Math.max(0, Number(b.amount) || 0);
    if (!b.concept || !amount) throw new DomainError('Concepto y monto son obligatorios', { code: 'EXPENSE_REQ_INVALID' });
    const created = await this.expenseRequestDAO.create({
      employeeId,
      concept: b.concept,
      destination: b.destination || '',
      amount,
      fromDate: b.fromDate || null,
      toDate: b.toDate || null,
      status: 'solicitada',
    });
    return this.expenseRequestDAO.update(created.id, { folio: Folio.expenseRequest(created.id).value });
  }

  // ---- Gastos -------------------------------------------------------
  async listExpenses(employeeId) {
    const items = await this.expenseDAO.findAll({ employeeId }, { order: [['createdAt', 'DESC']] });
    return items.map((e) => ({ ...e, photo: undefined, hasPhoto: !!e.photo }));
  }

  async createExpense(employeeId, body) {
    const b = body || {};
    const amount = Math.max(0, Number(b.amount) || 0);
    if (!amount) throw new DomainError('El monto es obligatorio', { code: 'EXPENSE_INVALID' });
    const category = EXPENSE_CAT.includes(b.category) ? b.category : 'otros';
    if (b.requestId) {
      const vr = await this.expenseRequestDAO.findById(numId(b.requestId));
      if (!vr || Number(vr.employeeId) !== employeeId) throw notFound('Viático no encontrado');
    }
    const created = await this.expenseDAO.create({
      employeeId,
      requestId: b.requestId ? Number(b.requestId) : null,
      category,
      merchant: b.merchant || '',
      amount,
      date: b.date || new Date().toISOString().slice(0, 10),
      hasInvoice: b.hasInvoice === true,
      rfc: b.rfc || '',
      photo: typeof b.photo === 'string' ? b.photo.slice(0, 900000) : null,
      status: 'solicitada',
    });
    const updated = await this.expenseDAO.update(created.id, { folio: Folio.expense(created.id).value });
    return { ...updated, photo: undefined, hasPhoto: !!updated.photo };
  }

  // ---- Facturas -----------------------------------------------------
  async listInvoices(employeeId) {
    const items = await this.invoiceDAO.findAll({ employeeId }, { order: [['createdAt', 'DESC']] });
    const names = await this.#clientNameMap(employeeId);
    return items.map((i) => ({ ...i, clientName: names[i.clientId] || i.razonSocial || '—' }));
  }

  async createInvoice(employeeId, body) {
    const b = body || {};
    let clientId = b.clientId ? Number(b.clientId) : null;
    let amount = Math.max(0, Number(b.amount) || 0);
    let orderId = null;
    if (b.orderId) {
      const o = await this.orderDAO.findById(numId(b.orderId));
      if (!o || o.employeeId !== employeeId) throw notFound('Pedido no encontrado');
      orderId = o.id;
      clientId = o.clientId;
      amount = o.total;
    }
    if (clientId) await this.#ownedClient(employeeId, clientId);
    if (!amount) throw new DomainError('El importe es obligatorio', { code: 'INVOICE_AMOUNT_REQUIRED' });
    if (!b.rfc) throw new DomainError('El RFC es obligatorio', { code: 'INVOICE_RFC_REQUIRED' });
    const created = await this.invoiceDAO.create({
      employeeId,
      clientId,
      orderId,
      rfc: b.rfc,
      razonSocial: b.razonSocial || '',
      usoCfdi: b.usoCfdi || 'G03',
      amount,
      status: 'solicitada',
    });
    return this.invoiceDAO.update(created.id, { folio: Folio.invoice(created.id).value });
  }

  // ---- Objetivos y desempeño ---------------------------------------
  async myObjectives(employeeId) {
    const objs = await this.objectiveDAO.forEmployee(employeeId);
    const current = objs[0] || null;
    const [visitas, cartera, prospectos] = await Promise.all([
      this.visitDAO.count({ employeeId }),
      this.clientDAO.count({ assignedTo: employeeId, active: true }),
      this.clientDAO.count({ assignedTo: employeeId, type: 'prospecto', active: true }),
    ]);
    const target = current ? Number(current.targetAmount) : 0;
    const achieved = current ? Number(current.achievedAmount) : 0;
    return {
      objective: current,
      progressPct: target ? Math.min(100, Math.round((achieved / target) * 100)) : 0,
      kpis: { cartera, prospectos, visitas },
      history: objs,
    };
  }

  // ---- Auxiliares ---------------------------------------------------
  async #price(rawItems) {
    const ids = [...new Set((rawItems || []).map((it) => Number(it.productId)).filter(Boolean))];
    const products = ids.length ? await this.productDAO.findAll({ id: ids }) : [];
    const byId = new Map(products.map((p) => [Number(p.id), p]));
    const priced = priceItems(rawItems, byId);
    if (!priced.items.length) throw new DomainError('Agrega al menos un producto', { code: 'PRICING_EMPTY' });
    return priced;
  }

  async #accrueObjective(employeeId, total) {
    const objs = await this.objectiveDAO.forEmployee(employeeId);
    const obj = objs[0];
    if (obj) {
      await this.objectiveDAO.update(obj.id, {
        achievedAmount: round2((Number(obj.achievedAmount) || 0) + Number(total)),
      });
    }
  }

  async #clientNameMap(employeeId) {
    const clients = await this.clientDAO.findAll({ assignedTo: employeeId });
    return Object.fromEntries(clients.map((c) => [c.id, c.name]));
  }
}
