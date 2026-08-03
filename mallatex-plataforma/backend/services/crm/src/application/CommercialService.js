import { DomainError } from '@mallatex/shared/ddd';
import { Client } from '../domain/Client.js';

const notFound = (msg) => new DomainError(msg, { code: 'NOT_FOUND', status: 404 });
const DECISIONS = ['aprobado', 'rechazado'];

/**
 * CommercialService — casos de uso de la superficie WEB del gerente comercial:
 * cartera y asignación de clientes, objetivos de venta, revisión de viáticos y
 * gastos, y facturación (emisión/cancelación). No se acota a un vendedor: el
 * gerente ve toda la operación comercial.
 */
export class CommercialService {
  constructor({ clientDAO, visitDAO, objectiveDAO, expenseRequestDAO, expenseDAO, invoiceDAO, employeeDAO, integrationService }) {
    this.clientDAO = clientDAO;
    this.visitDAO = visitDAO;
    this.objectiveDAO = objectiveDAO;
    this.expenseRequestDAO = expenseRequestDAO;
    this.expenseDAO = expenseDAO;
    this.invoiceDAO = invoiceDAO;
    this.employeeDAO = employeeDAO;
    this.integration = integrationService;
  }

  // ---- Clientes -----------------------------------------------------
  async listClients(query = {}) {
    const where = {};
    if (query.active === 'true') where.active = true;
    if (query.assignedTo) where.assignedTo = Number(query.assignedTo);
    if (query.type) where.type = query.type;
    const clients = await this.clientDAO.findAll(where, { order: [['name', 'ASC']] });
    const names = await this.#employeeNameMap();
    return clients.map((c) => ({ ...c.toPlain(), assignedToName: names[c.assignedTo] || null }));
  }

  async createClient(body) {
    const client = Client.create({ ...(body || {}), type: body?.type === 'prospecto' ? 'prospecto' : 'cliente' });
    const saved = await this.clientDAO.create(client);
    return saved.toPlain();
  }

  async updateClient(id, body) {
    const c = await this.clientDAO.findById(Number(id));
    if (!c) throw notFound('Cliente no encontrado');
    const b = body || {};
    const patch = {};
    for (const k of ['name', 'type', 'stage', 'contactName', 'phone', 'email', 'address', 'cultivo', 'notes', 'active']) {
      if (k in b) patch[k] = b[k];
    }
    for (const k of ['lat', 'lng']) if (k in b) patch[k] = b[k] != null ? Number(b[k]) : null;
    if ('assignedTo' in b) patch.assignedTo = b.assignedTo ? Number(b.assignedTo) : null;
    const updated = await this.clientDAO.update(c.id, patch);
    return updated.toPlain();
  }

  /** Asigna una lista de clientes a un vendedor. */
  async assign(body) {
    const { employeeId, clientIds } = body || {};
    if (!employeeId || !Array.isArray(clientIds)) {
      throw new DomainError('employeeId y clientIds son obligatorios', { code: 'ASSIGN_INVALID' });
    }
    const emp = await this.employeeDAO.findById(Number(employeeId));
    if (!emp) throw notFound('Vendedor no encontrado');
    let assigned = 0;
    for (const id of clientIds) {
      const c = await this.clientDAO.findById(Number(id));
      if (c) {
        c.assignTo(employeeId);
        await this.clientDAO.update(c.id, { assignedTo: c.assignedTo });
        assigned += 1;
      }
    }
    return { ok: true, assigned };
  }

  async clientVisits(id) {
    const visits = await this.visitDAO.findAll({ clientId: Number(id) }, { order: [['ts', 'DESC']] });
    return visits.map((v) => {
      const p = v.toPlain();
      return { ...p, photos: undefined, photoCount: (p.photos || []).length };
    });
  }

  // ---- Objetivos ----------------------------------------------------
  async listObjectives(query = {}) {
    const where = {};
    if (query.employeeId) where.employeeId = Number(query.employeeId);
    if (query.period) where.period = query.period;
    return this.objectiveDAO.findAll(where);
  }

  async upsertObjective(body) {
    const b = body || {};
    if (!b.employeeId || !b.period || b.targetAmount == null) {
      throw new DomainError('employeeId, period y targetAmount son obligatorios', { code: 'OBJECTIVE_INVALID' });
    }
    const existing = await this.objectiveDAO.findOne({ employeeId: Number(b.employeeId), period: b.period });
    const data = {
      employeeId: Number(b.employeeId),
      period: b.period,
      targetAmount: Number(b.targetAmount),
      achievedAmount: Number(b.achievedAmount) || 0,
    };
    if (existing) {
      const updated = await this.objectiveDAO.update(existing.id, data);
      return { objective: updated, created: false };
    }
    const created = await this.objectiveDAO.create(data);
    return { objective: created, created: true };
  }

  // ---- Viáticos -----------------------------------------------------
  async listExpenseRequests(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    const items = await this.expenseRequestDAO.findAll(where, { order: [['createdAt', 'DESC']] });
    const names = await this.#employeeNameMap();
    return items.map((r) => ({ ...r, employeeName: names[r.employeeId] || `#${r.employeeId}` }));
  }

  async decideExpenseRequest(id, body, actorName) {
    const r = await this.expenseRequestDAO.findById(Number(id));
    if (!r) throw notFound('Solicitud no encontrada');
    const decision = DECISIONS.includes(body?.decision) ? body.decision : null;
    if (!decision) throw new DomainError('decision debe ser aprobado o rechazado', { code: 'DECISION_INVALID' });
    return this.expenseRequestDAO.update(r.id, { status: decision, decidedBy: actorName || 'Gerente' });
  }

  // ---- Gastos -------------------------------------------------------
  async listExpenses(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = Number(query.employeeId);
    const items = await this.expenseDAO.findAll(where, { order: [['createdAt', 'DESC']] });
    const names = await this.#employeeNameMap();
    return items.map((e) => ({ ...e, employeeName: names[e.employeeId] || `#${e.employeeId}`, photo: undefined, hasPhoto: !!e.photo }));
  }

  async expensePhoto(id) {
    const e = await this.expenseDAO.findById(Number(id));
    if (!e || !e.photo) throw notFound('Sin evidencia');
    return { photo: e.photo };
  }

  async decideExpense(id, body, actorName) {
    const e = await this.expenseDAO.findById(Number(id));
    if (!e) throw notFound('Gasto no encontrado');
    const decision = DECISIONS.includes(body?.decision) ? body.decision : null;
    if (!decision) throw new DomainError('decision debe ser aprobado o rechazado', { code: 'DECISION_INVALID' });
    const updated = await this.expenseDAO.update(e.id, { status: decision });
    return { ...updated, photo: undefined, hasPhoto: !!updated.photo, decidedBy: actorName || 'Gerente' };
  }

  // ---- Facturación --------------------------------------------------
  async listInvoices(query = {}) {
    const where = {};
    if (query.status) where.status = query.status;
    const items = await this.invoiceDAO.findAll(where, { order: [['createdAt', 'DESC']] });
    const [empNames, cliNames] = await Promise.all([this.#employeeNameMap(), this.#clientNameMap()]);
    return items.map((i) => ({
      ...i,
      employeeName: empNames[i.employeeId] || (i.employeeId ? `#${i.employeeId}` : '—'),
      clientName: cliNames[i.clientId] || i.razonSocial || '—',
    }));
  }

  /** Emite (timbra) la factura: sella un CFDI mock y la marca como emitida. */
  async emitInvoice(id, body, actorName) {
    const i = await this.invoiceDAO.findById(Number(id));
    if (!i) throw notFound('Factura no encontrada');
    if (i.status === 'emitida' || i.status === 'pagada') {
      throw new DomainError('La factura ya fue emitida', { code: 'INVOICE_ALREADY_EMITTED', status: 409 });
    }
    const timbre = await this.integration.timbrar(i, { uuidOverride: body?.uuid });
    // La tabla invoices no almacena quién emite; el actor queda en la bitácora HTTP.
    return this.invoiceDAO.update(i.id, { status: 'emitida', uuid: timbre.uuid });
  }

  async cancelInvoice(id) {
    const i = await this.invoiceDAO.findById(Number(id));
    if (!i) throw notFound('Factura no encontrada');
    return this.invoiceDAO.update(i.id, { status: 'cancelada' });
  }

  integrationsStatus() {
    return this.integration.status();
  }

  // ---- Auxiliares ---------------------------------------------------
  async #employeeNameMap() {
    const emps = await this.employeeDAO.findAll();
    return Object.fromEntries(emps.map((e) => [e.id, e.name]));
  }

  async #clientNameMap() {
    const clients = await this.clientDAO.findAll();
    return Object.fromEntries(clients.map((c) => [c.id, c.name]));
  }
}
