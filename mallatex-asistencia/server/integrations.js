// Capa de integraciones externas — driver conmutable mock | http.
//
// Cada fuente (G3, MES, Aspel) opera en:
//   - mock: lecturas deterministas simuladas (sin credenciales). Es el modo por defecto y el
//           que usa la demo; idéntico contrato de datos que la API real.
//   - http: consulta REAL a la API del sistema externo, con URL/token de variables de entorno.
//
// El objetivo es que pasar a producción NO requiera tocar la lógica de negocio: se define
// <FUENTE>_MODE=http y su URL/token (ver server/config.js y docs/integraciones.md), y la misma
// sincronización (server/connectors.js) y emisión de factura (routes/crm.js) usan datos reales.

import { config } from './config.js';

const INT = config.integrations;

export function integrationMode(source) {
  return INT[source]?.mode === 'http' ? 'http' : 'mock';
}

// Estado de cada conector para el panel del gerente / diagnóstico.
export function integrationsStatus() {
  const rows = [];
  for (const [id, cfg] of Object.entries({ g3: INT.g3, mes: INT.mes, aspel: INT.aspel })) {
    const mode = cfg.mode === 'http' ? 'http' : 'mock';
    const configured = mode === 'mock' ? true : !!(cfg.baseUrl || cfg.cfdiUrl);
    rows.push({ id, mode, configured, baseUrl: mask(cfg.baseUrl || cfg.cfdiUrl || ''), hasToken: !!cfg.token });
  }
  rows.push({ id: 'aspelWebhook', mode: INT.aspel.webhookSecret ? 'seguro' : 'abierto', configured: !!INT.aspel.webhookSecret });
  return rows;
}
function mask(url) { return url ? url.replace(/\/\/([^/@]*@)?/, '//').replace(/([?&](token|key|secret)=)[^&]+/gi, '$1***') : ''; }

// ---------- HTTP helper con timeout ----------
async function httpJson(url, { method = 'GET', token, body } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), INT.timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Respuesta ${res.status} de ${url}`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Tiempo de espera agotado consultando ${url}`);
    throw e;
  } finally { clearTimeout(t); }
}

// ---------- Lecturas de percepciones variables (G3 / MES / Aspel) ----------
// Devuelve cantidades por CÓDIGO de empleado para el rango del periodo. En 'http' consulta la
// API externa; en 'mock' devuelve null para que connectors.js use su lectura simulada.
//   Contrato REST esperado (configurable por URL): GET {baseUrl}?from=YYYY-MM-DD&to=YYYY-MM-DD
//   → { items: [{ employeeCode, cantidad }] }   (el campo de cantidad puede ser km|m2|amount|cantidad)
export async function externalQuantities(source, period) {
  if (integrationMode(source) !== 'http') return null;
  const cfg = INT[source];
  if (!cfg?.baseUrl) throw new Error(`${source.toUpperCase()}_MODE=http pero falta ${source.toUpperCase()}_BASE_URL`);
  const url = `${cfg.baseUrl.replace(/\/$/, '')}?from=${period.startDate}&to=${period.endDate}`;
  const data = await httpJson(url, { token: cfg.token });
  const items = Array.isArray(data.items) ? data.items : [];
  const byCode = {};
  for (const it of items) {
    const code = it.employeeCode || it.code;
    const qty = Number(it.cantidad ?? it.km ?? it.m2 ?? it.amount ?? it.value);
    if (code && Number.isFinite(qty)) byCode[code] = qty;
  }
  return byCode; // { 'MTX013': 640, ... }
}

// ---------- Aspel: timbrado de CFDI ----------
// Emite (timbra) la factura. En 'http' llama al PAC/Aspel; en 'mock' genera un UUID determinista.
export async function aspelTimbrar(invoice, { uuidOverride } = {}) {
  if (uuidOverride) return { uuid: uuidOverride, mode: 'manual' };
  const cfg = INT.aspel;
  if (integrationMode('aspel') === 'http') {
    if (!cfg.cfdiUrl) throw new Error('ASPEL_MODE=http pero falta ASPEL_CFDI_URL');
    const payload = {
      folio: invoice.folio, rfc: invoice.rfc, razonSocial: invoice.razonSocial,
      usoCfdi: invoice.usoCfdi, total: invoice.amount,
    };
    const data = await httpJson(cfg.cfdiUrl, { method: 'POST', token: cfg.token, body: payload });
    if (!data.uuid) throw new Error('Aspel no devolvió UUID del timbre');
    return { uuid: data.uuid, mode: 'http', xml: data.xml, serie: data.serie };
  }
  // mock: UUID determinista y estable por factura (reproducible, sin aleatoriedad).
  return { uuid: mockUuid(invoice.id), mode: 'mock' };
}

// UUID pseudo-CFDI determinista (formato 8-4-4-4-12) derivado del id de la factura.
function mockUuid(id) {
  const seed = (Number(id) || 0) * 2654435761 >>> 0;
  const hex = (n, len) => (n >>> 0).toString(16).padStart(8, '0').slice(0, len).toUpperCase();
  const a = hex(seed, 8), b = hex(seed * 40503, 4), c = hex(seed * 12345 + 1, 4),
    d = hex(seed * 69069, 4), e = (hex(seed * 31, 8) + hex(seed * 131, 8)).slice(0, 12);
  return `${a}-${b}-${c}-${d}-${e}`;
}

// ---------- Aspel: normalización del webhook de pago ----------
// Convierte el cuerpo del webhook (CxC de Aspel) a un formato estable. Acepta varios nombres
// de campo para tolerar la forma exacta del ERP.
export function normalizeAspelPayment(body) {
  const b = body || {};
  const invoiceId = b.invoiceId ?? b.facturaId ?? b.id ?? null;
  const folio = b.folio ?? b.folioFactura ?? null;
  const uuid = b.uuid ?? b.uuidCfdi ?? null;
  const amount = Number(b.amount ?? b.monto ?? b.total ?? 0) || 0;
  const paidAt = b.paidAt ?? b.fechaPago ?? new Date().toISOString();
  const paymentRef = b.paymentRef ?? b.referencia ?? b.folioPago ?? '';
  return { invoiceId: invoiceId != null ? Number(invoiceId) : null, folio, uuid, amount, paidAt, paymentRef };
}

export const ASPEL_WEBHOOK_SECRET = INT.aspel.webhookSecret;
