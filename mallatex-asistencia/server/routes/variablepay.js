// Percepciones variables: conceptos configurables (kilometraje, costura por m²,
// comisiones…) y su captura por periodo. Alimentan la exportación a NOI junto con
// los movimientos calculados por asistencia.

import express from 'express';
import * as db from '../db.js';
import { requireRole, ROLES } from '../auth.js';
import { log } from '../audit.js';
import { getVariableConcepts, computeVariableImporte } from '../noi.js';
import { listSources, SOURCES, syncSource } from '../connectors.js';

const router = express.Router();

const MODES = ['tarifa', 'porcentaje', 'importe'];
const validSource = (s) => (s && SOURCES[s] ? s : 'manual');

// ---------- Fuentes de datos (conectores) ----------
router.get('/variable-sources', (_req, res) => {
  res.json(listSources());
});

// Sincroniza una fuente externa (G3 / MES / Aspel) para un periodo. Simulada en esta
// fase; en producción consultaría la API del sistema externo.
router.post('/variable-sync', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const { source, periodId } = req.body || {};
  if (!source || !periodId) return res.status(400).json({ error: 'source y periodId son obligatorios' });
  try {
    const result = syncSource(source, periodId, req.user.name);
    log(req, { action: 'sync', entity: 'variableEntry', detail: `Sincronización ${result.label}: ${result.created} nueva(s), ${result.updated} actualizada(s)` });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ---------- Catálogo de conceptos variables ----------
router.get('/variable-concepts', (_req, res) => {
  res.json(getVariableConcepts());
});

router.post('/variable-concepts', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.noiNumber) return res.status(400).json({ error: 'Nombre y número de concepto NOI son obligatorios' });
  const modo = MODES.includes(b.modo) ? b.modo : 'tarifa';
  const created = db.insert('variableConcepts', {
    key: (b.key || b.name).toString().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || `concepto_${Date.now()}`,
    name: b.name,
    noiNumber: b.noiNumber,
    tipo: ['P', 'D', 'I'].includes(b.tipo) ? b.tipo : 'P',
    unidad: b.unidad || (modo === 'porcentaje' ? '$ ventas' : 'unidad'),
    modo,
    rate: Number(b.rate) || 0,
    department: b.department || '',
    source: validSource(b.source),
    enabled: b.enabled !== false,
  });
  log(req, { action: 'create', entity: 'variableConcept', entityId: created.id, detail: `Alta de concepto variable ${created.name}` });
  res.status(201).json(created);
});

router.put('/variable-concepts/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  // Si aún no están persistidos, sembrar los conceptos por defecto para poder editarlos
  if (db.all('variableConcepts').length === 0) {
    for (const c of getVariableConcepts()) db.insert('variableConcepts', c);
  }
  const c = db.get('variableConcepts', req.params.id);
  if (!c) return res.status(404).json({ error: 'Concepto no encontrado' });
  const b = req.body || {};
  const patch = {};
  for (const k of ['name', 'noiNumber', 'tipo', 'unidad', 'department', 'enabled']) if (k in b) patch[k] = b[k];
  if ('source' in b) patch.source = validSource(b.source);
  if ('modo' in b && MODES.includes(b.modo)) patch.modo = b.modo;
  if ('rate' in b) patch.rate = Number(b.rate) || 0;
  const updated = db.update('variableConcepts', c.id, patch);
  log(req, { action: 'update', entity: 'variableConcept', entityId: c.id, detail: `Concepto variable ${updated.name}` });
  res.json(updated);
});

router.delete('/variable-concepts/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const c = db.get('variableConcepts', req.params.id);
  if (!c) return res.status(404).json({ error: 'Concepto no encontrado' });
  const inUse = db.all('variableEntries', (v) => v.conceptId === c.id).length;
  if (inUse) return res.status(409).json({ error: `El concepto tiene ${inUse} captura(s) registrada(s); desactívalo en lugar de eliminarlo` });
  db.remove('variableConcepts', c.id);
  log(req, { action: 'delete', entity: 'variableConcept', entityId: c.id, detail: `Baja de concepto variable ${c.name}` });
  res.json({ ok: true });
});

// ---------- Capturas por periodo ----------
router.get('/variable-entries', (req, res) => {
  let items = db.all('variableEntries');
  if (req.query.periodId) items = items.filter((v) => v.periodId === Number(req.query.periodId));
  if (req.query.employeeId) items = items.filter((v) => v.employeeId === Number(req.query.employeeId));
  const empById = Object.fromEntries(db.all('employees').map((e) => [e.id, e]));
  const conceptById = Object.fromEntries(db.all('variableConcepts').map((c) => [c.id, c]));
  items = items.map((v) => {
    const e = empById[v.employeeId] || {};
    const c = conceptById[v.conceptId] || {};
    return {
      ...v,
      employeeName: e.name, employeeCode: e.code, department: e.department,
      conceptName: c.name, conceptKey: c.key, unidad: c.unidad, modo: c.modo, noiNumber: c.noiNumber,
    };
  });
  items.sort((a, b) => (a.conceptName || '').localeCompare(b.conceptName || '') || (a.employeeName || '').localeCompare(b.employeeName || ''));
  res.json(items);
});

function periodOpenOr409(periodId, res) {
  const period = db.get('periods', periodId);
  if (!period) { res.status(404).json({ error: 'Periodo no encontrado' }); return null; }
  if (period.status === 'cerrado') { res.status(409).json({ error: 'El periodo está cerrado; no se pueden capturar percepciones' }); return null; }
  return period;
}

router.post('/variable-entries', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const b = req.body || {};
  if (!b.periodId || !b.employeeId || !b.conceptId) {
    return res.status(400).json({ error: 'periodId, employeeId y conceptId son obligatorios' });
  }
  const period = periodOpenOr409(Number(b.periodId), res);
  if (!period) return;
  const emp = db.get('employees', b.employeeId);
  if (!emp) return res.status(404).json({ error: 'Empleado no encontrado' });
  const concept = db.get('variableConcepts', b.conceptId);
  if (!concept) return res.status(404).json({ error: 'Concepto no encontrado' });
  const cantidad = Number(b.cantidad) || 0;
  const rateOverride = b.rate === '' || b.rate == null ? null : Number(b.rate);
  const importe = computeVariableImporte(concept, cantidad, rateOverride);
  const created = db.insert('variableEntries', {
    periodId: Number(b.periodId),
    employeeId: Number(b.employeeId),
    conceptId: Number(b.conceptId),
    cantidad,
    rate: rateOverride, // null = usa la tarifa del concepto
    importe,
    note: b.note || '',
    source: 'manual',
    createdBy: req.user.name,
    createdAt: new Date().toISOString(),
  });
  log(req, { action: 'create', entity: 'variableEntry', entityId: created.id, detail: `Captura ${concept.name} a ${emp.name}: ${cantidad} ${concept.unidad} → ${importe}` });
  res.status(201).json(created);
});

router.put('/variable-entries/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const v = db.get('variableEntries', req.params.id);
  if (!v) return res.status(404).json({ error: 'Captura no encontrada' });
  if (!periodOpenOr409(v.periodId, res)) return;
  const concept = db.get('variableConcepts', v.conceptId);
  if (!concept) return res.status(404).json({ error: 'Concepto no encontrado' });
  const b = req.body || {};
  const cantidad = 'cantidad' in b ? Number(b.cantidad) || 0 : v.cantidad;
  const rateOverride = 'rate' in b ? (b.rate === '' || b.rate == null ? null : Number(b.rate)) : v.rate;
  const patch = {
    cantidad,
    rate: rateOverride,
    importe: computeVariableImporte(concept, cantidad, rateOverride),
  };
  if ('note' in b) patch.note = b.note;
  const updated = db.update('variableEntries', v.id, patch);
  log(req, { action: 'update', entity: 'variableEntry', entityId: v.id, detail: `Ajuste de captura ${concept.name}` });
  res.json(updated);
});

router.delete('/variable-entries/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR, ROLES.NOMINA), (req, res) => {
  const v = db.get('variableEntries', req.params.id);
  if (!v) return res.status(404).json({ error: 'Captura no encontrada' });
  if (!periodOpenOr409(v.periodId, res)) return;
  db.remove('variableEntries', v.id);
  log(req, { action: 'delete', entity: 'variableEntry', entityId: v.id, detail: 'Captura variable eliminada' });
  res.json({ ok: true });
});

export default router;
