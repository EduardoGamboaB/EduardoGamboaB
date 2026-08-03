import { test } from 'node:test';
import assert from 'node:assert/strict';

import { priceItems, round2, IVA_RATE } from '../src/domain/Pricing.js';
import { Folio, FOLIO_PREFIX } from '../src/domain/Folio.js';
import { recommend } from '../src/domain/Advisor.js';
import { Client } from '../src/domain/Client.js';
import { Quote } from '../src/domain/Quote.js';
import { Order } from '../src/domain/Order.js';
import { mockUuid, normalizeAspelPayment } from '../src/domain/Cfdi.js';
import { DomainError } from '@mallatex/shared/ddd';

// ---------- Pricing ----------

const catalog = new Map([
  [1, { id: 1, sku: 'MS-35', name: 'Malla sombra 35%', unit: 'rollo', price: 100 }],
  [2, { id: 2, sku: 'MA-01', name: 'Malla antigranizo', unit: 'm2', price: 0.1 }],
]);

test('priceItems: subtotal, IVA 16% and total', () => {
  const r = priceItems([{ productId: 1, qty: 3 }], catalog);
  assert.equal(r.subtotal, 300);
  assert.equal(r.iva, 48);
  assert.equal(r.total, 348);
  assert.equal(r.items[0].importe, 300);
  assert.equal(r.items[0].sku, 'MS-35');
});

test('priceItems applies percentage discount per line', () => {
  const r = priceItems([{ productId: 1, qty: 3, discount: 10 }], catalog);
  assert.equal(r.items[0].importe, 270);
  assert.equal(r.subtotal, 270);
  assert.equal(r.iva, round2(270 * IVA_RATE)); // 43.2
  assert.equal(r.total, 313.2);
});

test('priceItems rounds to 2 decimals at each stage', () => {
  const r = priceItems([{ productId: 2, qty: 3 }], catalog); // 0.30
  assert.equal(r.subtotal, 0.3);
  assert.equal(r.iva, 0.05); // round2(0.048)
  assert.equal(r.total, 0.35);
});

test('priceItems clamps qty ≥ 0 and discount to [0,100]; skips unknown products', () => {
  const r = priceItems(
    [
      { productId: 1, qty: -5 },
      { productId: 1, qty: 1, discount: 150 },
      { productId: 999, qty: 2 },
    ],
    catalog
  );
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].importe, 0, 'negative qty clamps to 0');
  assert.equal(r.items[1].importe, 0, 'discount caps at 100%');
  assert.equal(r.total, 0);
});

test('priceItems works with a plain-object index too', () => {
  const byId = { 1: { id: 1, sku: 'X', name: 'X', unit: 'u', price: 50 } };
  const r = priceItems([{ productId: 1, qty: 2 }], byId);
  assert.equal(r.subtotal, 100);
});

test('empty/absent items yield zero totals', () => {
  assert.deepEqual(priceItems([], catalog), { items: [], subtotal: 0, iva: 0, total: 0 });
  assert.deepEqual(priceItems(undefined, catalog), { items: [], subtotal: 0, iva: 0, total: 0 });
});

// ---------- Folio ----------

test('Folio prefixes per document kind, padded to 5 digits', () => {
  assert.equal(Folio.quote(42).value, 'COT-00042');
  assert.equal(Folio.order(7).value, 'PED-00007');
  assert.equal(Folio.expenseRequest(1).value, 'VIA-00001');
  assert.equal(Folio.expense(123).value, 'GTO-00123');
  assert.equal(Folio.invoice(99999).value, 'FAC-99999');
});

test('Folio does not truncate ids beyond 5 digits', () => {
  assert.equal(Folio.quote(123456).value, 'COT-123456');
});

test('Folio.for rejects unknown kinds; toString equals value', () => {
  assert.throws(() => Folio.for('nope', 1), /Tipo de folio desconocido/);
  assert.equal(String(Folio.order(3)), 'PED-00003');
  assert.deepEqual(FOLIO_PREFIX, {
    quote: 'COT', order: 'PED', expenseRequest: 'VIA', expense: 'GTO', invoice: 'FAC',
  });
});

test('Folio is a value object: structural equality', () => {
  assert.equal(Folio.quote(5).equals(Folio.quote(5)), true);
  assert.equal(Folio.quote(5).equals(Folio.order(5)), false);
});

// ---------- Advisor ----------

test('objetivo granizo → categoría antigranizo', () => {
  const r = recommend({ objetivo: 'granizo' });
  assert.equal(r.need, 'granizo');
  assert.equal(r.category, 'antigranizo');
});

test('free text mentioning granizo also lands on antigranizo', () => {
  const r = recommend({ text: 'me preocupa el granizo en primavera' });
  assert.equal(r.category, 'antigranizo');
});

test('berry/vid crops default to antipajaros', () => {
  assert.equal(recommend({ cultivo: 'arándano' }).category, 'antipajaros');
  assert.equal(recommend({ cultivo: 'vid' }).category, 'antipajaros');
});

test('tomate → sombra with default 35% shade', () => {
  const r = recommend({ cultivo: 'tomate' });
  assert.equal(r.category, 'sombra');
  assert.equal(r.shadePct, '35%');
});

test('hot climate raises shade to 50%; vivero to 70%', () => {
  assert.equal(recommend({ cultivo: 'tomate', clima: 'caluroso' }).shadePct, '50%');
  assert.equal(recommend({ cultivo: 'vivero de ornamentales' }).shadePct, '70%');
});

test('insect keywords → antiinsecto', () => {
  assert.equal(recommend({ text: 'mosca blanca y trips' }).category, 'antiinsecto');
});

test('recommend picks the catalog product of the category (by stock)', () => {
  const products = [
    { id: 1, sku: 'AG-1', name: 'Antigranizo A', category: 'antigranizo', stock: 5, price: 10, unit: 'rollo' },
    { id: 2, sku: 'AG-2', name: 'Antigranizo B', category: 'antigranizo', stock: 50, price: 12, unit: 'rollo' },
    { id: 3, sku: 'MS-35', name: 'Sombra', category: 'sombra', stock: 99, price: 8, unit: 'rollo' },
  ];
  const r = recommend({ objetivo: 'granizo' }, products);
  assert.equal(r.recommendation.sku, 'AG-2', 'highest stock wins');
  assert.deepEqual(r.alternatives.map((a) => a.sku), ['AG-1']);
});

test('recommend without matching products returns null recommendation', () => {
  const r = recommend({ objetivo: 'granizo' }, []);
  assert.equal(r.recommendation, null);
  assert.equal(r.title, 'antigranizo');
});

// ---------- Client ----------

test('Client.create requires a name', () => {
  assert.throws(
    () => Client.create({}),
    (e) => e instanceof DomainError && e.code === 'CLIENT_NAME_REQUIRED'
  );
});

test('Client.create defaults to prospecto with stage prospecto and emits event', () => {
  const c = Client.create({ name: 'Rancho X' });
  assert.equal(c.type, 'prospecto');
  assert.equal(c.stage, 'prospecto');
  assert.equal(c.isProspect, true);
  const [ev] = c.pullDomainEvents();
  assert.equal(ev.name, 'ClientCreated');
});

test('Client.create with type cliente gets stage cliente; invalid type falls back', () => {
  assert.equal(Client.create({ name: 'A', type: 'cliente' }).stage, 'cliente');
  assert.equal(Client.create({ name: 'B', type: 'wat' }).type, 'prospecto');
});

test('assignTo coerces to Number and emits ClientAssigned', () => {
  const c = Client.create({ name: 'Rancho X' });
  c.pullDomainEvents();
  c.assignTo('7');
  assert.equal(c.assignedTo, 7);
  const [ev] = c.pullDomainEvents();
  assert.equal(ev.name, 'ClientAssigned');
  assert.equal(ev.payload.employeeId, 7);
  c.assignTo(null);
  assert.equal(c.assignedTo, null);
});

test('advanceOnVisit: prospecto found in field advances to negociacion once', () => {
  const c = Client.create({ name: 'Rancho X' });
  assert.equal(c.advanceOnVisit(true), true);
  assert.equal(c.stage, 'negociacion');
  assert.equal(c.advanceOnVisit(true), false, 'already advanced');
  assert.equal(c.stage, 'negociacion');
});

test('advanceOnVisit does nothing when not found or not a prospect', () => {
  const c = Client.create({ name: 'Rancho X' });
  assert.equal(c.advanceOnVisit(false), false);
  assert.equal(c.stage, 'prospecto');
  const cliente = Client.create({ name: 'Y', type: 'cliente' });
  assert.equal(cliente.advanceOnVisit(true), false);
});

// ---------- Quote & Order ----------

const priced = priceItems([{ productId: 1, qty: 2 }], catalog); // 200 / 32 / 232

test('Quote.create stamps priced totals and emits QuoteCreated', () => {
  const q = Quote.create({ employeeId: 3, clientId: 9, priced });
  assert.equal(q.subtotal, 200);
  assert.equal(q.iva, 32);
  assert.equal(q.total, 232);
  assert.equal(q.status, 'abierta');
  assert.equal(q.employeeId, 3);
  assert.equal(q.clientId, 9);
  const [ev] = q.pullDomainEvents();
  assert.equal(ev.name, 'QuoteCreated');
  assert.equal(ev.payload.total, 232);
});

test('Quote.create rejects empty item lists', () => {
  assert.throws(
    () => Quote.create({ employeeId: 3, priced: { items: [] } }),
    (e) => e instanceof DomainError && e.code === 'QUOTE_EMPTY'
  );
  assert.throws(() => Quote.create({ employeeId: 3 }), (e) => e.code === 'QUOTE_EMPTY');
});

test('Quote.stampFolio produces COT-##### from the sequential id', () => {
  const q = Quote.create({ employeeId: 3, priced });
  assert.equal(q.stampFolio(42), 'COT-00042');
  assert.equal(q.folio, 'COT-00042');
  assert.equal(q.toPlain().folio, 'COT-00042');
});

test('Quote.markConverted flips status', () => {
  const q = Quote.create({ employeeId: 3, priced });
  q.markConverted();
  assert.equal(q.status, 'convertida');
});

test('Order.create stamps totals, keeps quoteId, emits OrderCreated', () => {
  const o = Order.create({ employeeId: 3, clientId: 9, quoteId: 5, priced });
  assert.equal(o.total, 232);
  assert.equal(o.quoteId, 5);
  assert.equal(o.status, 'pendiente');
  const [ev] = o.pullDomainEvents();
  assert.equal(ev.name, 'OrderCreated');
});

test('Order.create without quote sets quoteId null; empty rejected', () => {
  const o = Order.create({ employeeId: 3, priced });
  assert.equal(o.quoteId, null);
  assert.throws(
    () => Order.create({ employeeId: 3, priced: null }),
    (e) => e instanceof DomainError && e.code === 'ORDER_EMPTY'
  );
});

test('Order.stampFolio produces PED-#####', () => {
  const o = Order.create({ employeeId: 3, priced });
  assert.equal(o.stampFolio(7), 'PED-00007');
  assert.equal(o.folio, 'PED-00007');
});

// ---------- Cfdi ----------

test('mockUuid is deterministic and CFDI-shaped (8-4-4-4-12 uppercase hex)', () => {
  const u = mockUuid(5);
  assert.match(u, /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
  assert.equal(mockUuid(5), u, 'same id → same uuid');
  assert.notEqual(mockUuid(6), u, 'different id → different uuid');
  assert.equal(mockUuid('5'), u, 'numeric strings coerce');
});

test('normalizeAspelPayment maps Spanish ERP field names', () => {
  const p = normalizeAspelPayment({
    facturaId: '7',
    folioFactura: 'FAC-00007',
    uuidCfdi: 'ABC',
    monto: '123.45',
    fechaPago: '2026-08-01T00:00:00Z',
    referencia: 'REF-1',
  });
  assert.deepEqual(p, {
    invoiceId: 7,
    folio: 'FAC-00007',
    uuid: 'ABC',
    amount: 123.45,
    paidAt: '2026-08-01T00:00:00Z',
    paymentRef: 'REF-1',
  });
});

test('normalizeAspelPayment prefers canonical names and defaults safely', () => {
  const p = normalizeAspelPayment({ invoiceId: 1, facturaId: 2, amount: 10, monto: 20 });
  assert.equal(p.invoiceId, 1);
  assert.equal(p.amount, 10);

  const empty = normalizeAspelPayment(null);
  assert.equal(empty.invoiceId, null);
  assert.equal(empty.amount, 0);
  assert.equal(empty.paymentRef, '');
  assert.ok(!Number.isNaN(Date.parse(empty.paidAt)), 'paidAt defaults to now');
});
