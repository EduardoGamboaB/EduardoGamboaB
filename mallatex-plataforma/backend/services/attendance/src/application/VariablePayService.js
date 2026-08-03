import { DomainError } from '@mallatex/shared/ddd';
import { defaultVariableConcepts, computeVariableImporte } from '../domain/NoiExport.js';

const MODES = ['tarifa', 'porcentaje', 'importe'];
const SOURCES = { manual: 'Captura manual', g3: 'GPS G3 (rutas/kilometraje)', mes: 'MES (producción)', aspel: 'Aspel SAE (ventas)' };
const validSource = (s) => (s && SOURCES[s] ? s : 'manual');

/**
 * VariablePayService — conceptos de percepción variable (kilometraje, costura
 * por m², comisiones…) y su captura por periodo. Alimentan la exportación a NOI
 * junto con los movimientos calculados por asistencia.
 */
export class VariablePayService {
  constructor({ variableConceptDAO, variableEntryDAO, periodDAO, employeeDAO, audit }) {
    this.variableConceptDAO = variableConceptDAO;
    this.variableEntryDAO = variableEntryDAO;
    this.periodDAO = periodDAO;
    this.employeeDAO = employeeDAO;
    this.audit = audit;
  }

  // ---------- Conceptos ----------
  async listConcepts() {
    const stored = await this.variableConceptDAO.findAll();
    return stored.length ? stored : defaultVariableConcepts();
  }

  /** Siembra los conceptos por defecto si aún no hay ninguno persistido. */
  async #seedIfEmpty() {
    if ((await this.variableConceptDAO.count()) === 0) {
      for (const c of defaultVariableConcepts()) await this.variableConceptDAO.create(c);
    }
  }

  async createConcept(body, userName) {
    if (!body.name || !body.noiNumber) throw new DomainError('Nombre y número de concepto NOI son obligatorios', { code: 'VC_INVALID' });
    const modo = MODES.includes(body.modo) ? body.modo : 'tarifa';
    const key = (body.key || body.name).toString().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || `concepto_${Date.now()}`;
    const created = await this.variableConceptDAO.create({
      key,
      name: body.name,
      noiNumber: Number(body.noiNumber) || null,
      tipo: ['P', 'D', 'I'].includes(body.tipo) ? body.tipo : 'P',
      unidad: body.unidad || (modo === 'porcentaje' ? '$ ventas' : 'unidad'),
      modo,
      rate: Number(body.rate) || 0,
      department: body.department || '',
      source: validSource(body.source),
      enabled: body.enabled !== false,
    });
    await this.audit?.record({ action: 'create', entity: 'variableConcept', entityId: String(created.id), userName });
    return created;
  }

  async updateConcept(id, body = {}) {
    await this.#seedIfEmpty();
    const c = await this.variableConceptDAO.findById(id);
    if (!c) throw new DomainError('Concepto no encontrado', { code: 'VC_NOT_FOUND', status: 404 });
    const patch = {};
    for (const k of ['name', 'tipo', 'unidad', 'department', 'enabled']) if (k in body) patch[k] = body[k];
    if ('noiNumber' in body) patch.noiNumber = Number(body.noiNumber) || null;
    if ('source' in body) patch.source = validSource(body.source);
    if ('modo' in body && MODES.includes(body.modo)) patch.modo = body.modo;
    if ('rate' in body) patch.rate = Number(body.rate) || 0;
    return this.variableConceptDAO.update(id, patch);
  }

  async deleteConcept(id) {
    const c = await this.variableConceptDAO.findById(id);
    if (!c) throw new DomainError('Concepto no encontrado', { code: 'VC_NOT_FOUND', status: 404 });
    const inUse = await this.variableEntryDAO.count({ conceptId: id });
    if (inUse) throw new DomainError(`El concepto tiene ${inUse} captura(s) registrada(s); desactívalo en lugar de eliminarlo`, { code: 'VC_IN_USE', status: 409 });
    await this.variableConceptDAO.delete(id);
    return { ok: true };
  }

  // ---------- Capturas ----------
  async listEntries({ periodId, employeeId } = {}) {
    const where = {};
    if (periodId) where.periodId = Number(periodId);
    if (employeeId) where.employeeId = Number(employeeId);
    const [items, employees, concepts] = await Promise.all([
      this.variableEntryDAO.findAll(where),
      this.employeeDAO.findAll(),
      this.variableConceptDAO.findAll(),
    ]);
    const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
    const conceptById = Object.fromEntries(concepts.map((c) => [c.id, c]));
    return items.map((v) => {
      const e = empById[v.employeeId] || {};
      const c = conceptById[v.conceptId] || {};
      return { ...v, employeeName: e.name, employeeCode: e.code, department: e.department, conceptName: c.name, conceptKey: c.key, unidad: c.unidad, modo: c.modo, noiNumber: c.noiNumber };
    });
  }

  async #openPeriodOr409(periodId) {
    const period = await this.periodDAO.findById(periodId);
    if (!period) throw new DomainError('Periodo no encontrado', { code: 'PERIOD_NOT_FOUND', status: 404 });
    if (period.status === 'cerrado') throw new DomainError('El periodo está cerrado; no se pueden capturar percepciones', { code: 'PERIOD_CLOSED', status: 409 });
    return period;
  }

  async createEntry(body, userName) {
    if (!body.periodId || !body.employeeId || !body.conceptId) throw new DomainError('periodId, employeeId y conceptId son obligatorios', { code: 'VE_INVALID' });
    await this.#openPeriodOr409(Number(body.periodId));
    const emp = await this.employeeDAO.findById(body.employeeId);
    if (!emp) throw new DomainError('Empleado no encontrado', { code: 'EMP_NOT_FOUND', status: 404 });
    const concept = await this.variableConceptDAO.findById(body.conceptId);
    if (!concept) throw new DomainError('Concepto no encontrado', { code: 'VC_NOT_FOUND', status: 404 });
    const cantidad = Number(body.cantidad) || 0;
    const rateOverride = body.rate === '' || body.rate == null ? null : Number(body.rate);
    const importe = computeVariableImporte(concept, cantidad, rateOverride);
    const created = await this.variableEntryDAO.create({
      periodId: Number(body.periodId),
      employeeId: Number(body.employeeId),
      conceptId: Number(body.conceptId),
      cantidad,
      rate: rateOverride,
      importe,
      note: body.note || '',
      source: 'manual',
      createdBy: userName || null,
    });
    await this.audit?.record({ action: 'create', entity: 'variableEntry', entityId: String(created.id), userName });
    return created;
  }

  async updateEntry(id, body = {}) {
    const v = await this.variableEntryDAO.findById(id);
    if (!v) throw new DomainError('Captura no encontrada', { code: 'VE_NOT_FOUND', status: 404 });
    await this.#openPeriodOr409(v.periodId);
    const concept = await this.variableConceptDAO.findById(v.conceptId);
    if (!concept) throw new DomainError('Concepto no encontrado', { code: 'VC_NOT_FOUND', status: 404 });
    const cantidad = 'cantidad' in body ? Number(body.cantidad) || 0 : Number(v.cantidad) || 0;
    const rateOverride = 'rate' in body ? (body.rate === '' || body.rate == null ? null : Number(body.rate)) : v.rate;
    const patch = { cantidad, rate: rateOverride, importe: computeVariableImporte(concept, cantidad, rateOverride) };
    if ('note' in body) patch.note = body.note;
    return this.variableEntryDAO.update(id, patch);
  }

  async deleteEntry(id) {
    const v = await this.variableEntryDAO.findById(id);
    if (!v) throw new DomainError('Captura no encontrada', { code: 'VE_NOT_FOUND', status: 404 });
    await this.#openPeriodOr409(v.periodId);
    await this.variableEntryDAO.delete(id);
    return { ok: true };
  }

  // ---------- Sincronización de fuentes externas (mock) ----------
  listSources() {
    return Object.entries(SOURCES).map(([key, label]) => ({ key, label }));
  }

  /**
   * Sincroniza una fuente externa (G3 / MES / Aspel) para un periodo. Mock de
   * esta fase: genera capturas deterministas por empleado del departamento del
   * concepto y las upserta por external_id. En producción consultaría la API
   * del sistema externo. TODO: reemplazar por conectores reales (server/connectors.js).
   */
  async syncVariable(source, periodId, userName) {
    const src = validSource(source);
    if (src === 'manual') throw new DomainError('Selecciona una fuente externa (g3|mes|aspel)', { code: 'SOURCE_INVALID' });
    const period = await this.#openPeriodOr409(Number(periodId));
    await this.#seedIfEmpty();
    const concepts = (await this.variableConceptDAO.findAll()).filter((c) => c.source === src && c.enabled !== false);
    const employees = await this.employeeDAO.active();
    let created = 0, updated = 0;

    for (const concept of concepts) {
      const targets = concept.department ? employees.filter((e) => e.department === concept.department) : employees;
      for (const emp of targets) {
        // Cantidad determinista (mock) derivada de la clave del empleado y el concepto.
        const seed = (String(emp.code).replace(/\D/g, '') || '0').slice(-3);
        const cantidad = Math.max(1, (Number(seed) % 40) + 5);
        const importe = computeVariableImporte(concept, cantidad, null);
        const externalId = `${src}:${period.id}:${concept.id}:${emp.id}`;
        const existing = await this.variableEntryDAO.findOne({ externalId });
        const payload = {
          periodId: period.id, employeeId: emp.id, conceptId: concept.id,
          cantidad, rate: null, importe, note: `Sincronizado de ${SOURCES[src]}`,
          source: src, externalId, createdBy: userName || null, syncedAt: new Date(),
        };
        if (existing) { await this.variableEntryDAO.update(existing.id, payload); updated++; }
        else { await this.variableEntryDAO.create(payload); created++; }
      }
    }
    await this.audit?.record({ action: 'sync', entity: 'variableEntry', userName, detail: { source: src, created, updated } });
    return { source: src, label: SOURCES[src], created, updated, mode: concepts[0]?.modo || 'tarifa' };
  }
}
