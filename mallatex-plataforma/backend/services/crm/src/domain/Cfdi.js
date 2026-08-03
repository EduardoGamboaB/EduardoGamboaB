/**
 * Cfdi — utilidades de dominio para el timbrado (mock) de facturas y la
 * normalización del webhook de pago de Aspel. El timbrado real vive en la
 * integración externa; aquí se genera un UUID determinista para la demo, de
 * forma que un mismo id de factura produce siempre el mismo folio fiscal.
 */

// UUID pseudo-CFDI determinista (formato 8-4-4-4-12) derivado del id de factura.
export function mockUuid(id) {
  const seed = ((Number(id) || 0) * 2654435761) >>> 0;
  const hex = (n, len) => (n >>> 0).toString(16).padStart(8, '0').slice(0, len).toUpperCase();
  const a = hex(seed, 8);
  const b = hex(seed * 40503, 4);
  const c = hex(seed * 12345 + 1, 4);
  const d = hex(seed * 69069, 4);
  const e = (hex(seed * 31, 8) + hex(seed * 131, 8)).slice(0, 12);
  return `${a}-${b}-${c}-${d}-${e}`;
}

/**
 * Normaliza el cuerpo del webhook de pago (CxC de Aspel) a un formato estable.
 * Tolera varios nombres de campo para acomodar la forma exacta del ERP.
 */
export function normalizeAspelPayment(body) {
  const b = body || {};
  const invoiceId = b.invoiceId ?? b.facturaId ?? b.id ?? null;
  const folio = b.folio ?? b.folioFactura ?? null;
  const uuid = b.uuid ?? b.uuidCfdi ?? null;
  const amount = Number(b.amount ?? b.monto ?? b.total ?? 0) || 0;
  const paidAt = b.paidAt ?? b.fechaPago ?? new Date().toISOString();
  const paymentRef = b.paymentRef ?? b.referencia ?? b.folioPago ?? '';
  return {
    invoiceId: invoiceId != null ? Number(invoiceId) : null,
    folio,
    uuid,
    amount,
    paidAt,
    paymentRef,
  };
}
