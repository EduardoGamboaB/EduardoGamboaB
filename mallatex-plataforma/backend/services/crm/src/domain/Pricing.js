/**
 * Pricing — servicio de dominio que calcula las líneas e importes de un
 * documento comercial (cotización o pedido) a partir de los renglones crudos
 * y el catálogo de productos. Es la única fuente de verdad del cálculo de
 * subtotal, IVA (16%) y total, para que cotizaciones y pedidos coincidan.
 */
export const IVA_RATE = 0.16;

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Precia una lista de renglones {productId, qty, discount} contra el catálogo.
 * @param {Array} rawItems  renglones crudos.
 * @param {Map|Object} productById  índice de productos por id.
 * @returns {{items:Array, subtotal:number, iva:number, total:number}}
 */
export function priceItems(rawItems, productById) {
  const lookup = productById instanceof Map ? (id) => productById.get(Number(id)) : (id) => productById[id];
  const items = [];
  let subtotal = 0;
  for (const it of rawItems || []) {
    const p = lookup(it.productId);
    if (!p) continue;
    const price = Number(p.price) || 0;
    const qty = Math.max(0, Number(it.qty) || 0);
    const discount = Math.min(100, Math.max(0, Number(it.discount) || 0));
    const importe = round2(qty * price * (1 - discount / 100));
    subtotal += importe;
    items.push({ productId: p.id, sku: p.sku, name: p.name, unit: p.unit, price, qty, discount, importe });
  }
  const sub = round2(subtotal);
  const iva = round2(sub * IVA_RATE);
  return { items, subtotal: sub, iva, total: round2(sub + iva) };
}
