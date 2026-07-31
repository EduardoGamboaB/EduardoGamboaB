// Webhooks de integraciones externas (sin sesión de usuario; autenticados por secreto).
//
// Aspel (CxC) llama a /api/integrations/aspel/payment cuando CAE EL PAGO de una factura.
// Al confirmarse el pago: se marca la factura como 'pagada' y se genera la BASE DE COMISIÓN
// del vendedor como percepción variable del periodo abierto (concepto fuente 'aspel'),
// de forma idempotente por externalId. Así el pago real dispara la comisión en NOI.

import express from 'express';
import * as db from '../db.js';
import { config } from '../config.js';
import { logSystem } from '../audit.js';
import { computeVariableImporte } from '../noi.js';
import { normalizeAspelPayment, ASPEL_WEBHOOK_SECRET } from '../integrations.js';

const router = express.Router();
const now = () => new Date().toISOString();

// Valida el secreto compartido del webhook. Si hay secreto configurado, es obligatorio.
// Si no lo hay, sólo se permite fuera de producción (para la demo); en producción se exige.
function authWebhook(req, res, next) {
  const provided = req.get('x-webhook-secret') || req.query.secret || '';
  if (ASPEL_WEBHOOK_SECRET) {
    if (provided !== ASPEL_WEBHOOK_SECRET) return res.status(401).json({ error: 'Secreto de webhook inválido' });
    return next();
  }
  if (config.isProd) return res.status(403).json({ error: 'Configura ASPEL_WEBHOOK_SECRET para habilitar el webhook en producción' });
  return next();
}

router.post('/aspel/payment', authWebhook, (req, res) => {
  const p = normalizeAspelPayment(req.body);
  const invoice = p.invoiceId ? db.get('invoices', p.invoiceId)
    : p.folio ? db.find('invoices', (i) => i.folio === p.folio)
    : p.uuid ? db.find('invoices', (i) => i.uuid === p.uuid) : null;
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada (envía invoiceId, folio o uuid)' });

  const paidInvoice = db.update('invoices', invoice.id, {
    status: 'pagada', paidAt: p.paidAt || now(), paymentRef: p.paymentRef || '', paidAmount: p.amount || invoice.amount,
  });

  // Genera la base de comisión del vendedor en el periodo abierto (idempotente).
  const commission = generateCommission(invoice, p.amount || invoice.amount);
  logSystem({ action: 'payment', entity: 'invoice', entityId: invoice.id, detail: `Pago de factura ${invoice.folio} (${paidInvoice.paidAmount}) · comisión: ${commission.status}` });
  res.json({ ok: true, invoice: { id: paidInvoice.id, folio: paidInvoice.folio, status: paidInvoice.status }, commission });
});

function generateCommission(invoice, amount) {
  if (!invoice.employeeId) return { status: 'sin_vendedor' };
  const concept = db.find('variableConcepts', (c) => (c.source === 'aspel') && c.enabled !== false);
  if (!concept) return { status: 'sin_concepto' };
  const period = db.find('periods', (pr) => pr.status === 'abierto');
  if (!period) return { status: 'sin_periodo_abierto' };
  const base = Number(amount) || 0;
  const importe = computeVariableImporte(concept, base, null);
  const externalId = `aspel-invoice-${invoice.id}`;
  const existing = db.find('variableEntries', (v) => v.externalId === externalId);
  const data = { cantidad: base, importe, source: 'aspel', syncedAt: now() };
  if (existing) {
    db.update('variableEntries', existing.id, data);
    return { status: 'actualizada', entryId: existing.id, base, importe };
  }
  const created = db.insert('variableEntries', {
    periodId: period.id, employeeId: invoice.employeeId, conceptId: concept.id,
    rate: null, note: `Comisión por pago de factura ${invoice.folio}`,
    externalId, createdBy: 'Aspel (webhook)', createdAt: now(), ...data,
  });
  return { status: 'creada', entryId: created.id, periodId: period.id, base, importe };
}

export default router;
