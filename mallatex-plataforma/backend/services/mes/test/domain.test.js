import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ProductionOrder } from '../src/domain/ProductionOrder.js';
import { Merma } from '../src/domain/Merma.js';
import { Roll, ESTADOS_ROLLO } from '../src/domain/Roll.js';
import { PROCESOS_PRODUCCION, CATEGORIAS_MATERIAL, ESTADOS_PEDIDO } from '../src/domain/constants.js';
import { DomainError } from '@mallatex/shared/ddd';

// ---------- ProductionOrder: create invariants ----------

test('create requires a code', () => {
  assert.throws(
    () => ProductionOrder.create({}),
    (e) => e instanceof DomainError && e.code === 'ORDER_CODE_REQUIRED'
  );
});

test('create rejects an estado outside the catalog', () => {
  assert.throws(
    () => ProductionOrder.create({ code: 'P-1', estado: 'volando' }),
    (e) => e instanceof DomainError && e.code === 'ORDER_ESTADO_INVALID'
  );
  // every catalog estado is accepted
  for (const estado of ESTADOS_PEDIDO) {
    assert.equal(ProductionOrder.create({ code: 'P-1', estado }).estado, estado);
  }
});

test('create rejects a negative meta', () => {
  assert.throws(
    () => ProductionOrder.create({ code: 'P-1', meta: -1 }),
    (e) => e instanceof DomainError && e.code === 'ORDER_META_INVALID'
  );
});

test('create defaults: cobranza-pendiente, pago no confirmado, pendientes = meta', () => {
  const o = ProductionOrder.create({ code: 'P-1', meta: 10 });
  assert.equal(o.estado, 'cobranza-pendiente');
  assert.equal(o.pagoConfirmado, false);
  assert.equal(o.pendientes, 10);
  assert.equal(o.terminados, 0);
  const [ev] = o.pullDomainEvents();
  assert.equal(ev.name, 'PedidoRegistrado');
  assert.equal(ev.payload.code, 'P-1');
});

// ---------- Cobranza gate (MT-PC-003) ----------

test('liberarPedido without pagoConfirmado throws a 409 DomainError', () => {
  const o = ProductionOrder.create({ code: 'P-1', meta: 10 });
  assert.throws(
    () => o.liberarPedido(),
    (e) => e instanceof DomainError && e.code === 'ORDER_COBRANZA_PENDIENTE' && e.status === 409
  );
  assert.equal(o.estado, 'cobranza-pendiente', 'order stays pending');
});

test('confirmarPago then liberarPedido succeeds and emits PedidoLiberado', () => {
  const o = ProductionOrder.create({ code: 'P-1', meta: 10 });
  o.pullDomainEvents();
  o.confirmarPago().liberarPedido();
  assert.equal(o.pagoConfirmado, true);
  assert.equal(o.estado, 'liberado');
  const names = o.pullDomainEvents().map((e) => e.name);
  assert.deepEqual(names, ['PagoConfirmado', 'PedidoLiberado']);
});

test('liberarPedido rejects an already produced order', () => {
  const done = ProductionOrder.create({ code: 'P-1', estado: 'terminado', pagoConfirmado: true });
  assert.throws(() => done.liberarPedido(), (e) => e.code === 'ORDER_ALREADY_DONE' && e.status === 409);
  const delivered = ProductionOrder.create({ code: 'P-2', estado: 'entregado', pagoConfirmado: true });
  assert.throws(() => delivered.liberarPedido(), (e) => e.code === 'ORDER_ALREADY_DONE');
});

test('marcarMaterialEgresado requires payment and advances from liberado', () => {
  const o = ProductionOrder.create({ code: 'P-1' });
  assert.throws(() => o.marcarMaterialEgresado(), (e) => e.code === 'ORDER_COBRANZA_PENDIENTE');
  o.confirmarPago().liberarPedido().marcarMaterialEgresado();
  assert.equal(o.materialEgresado, true);
  assert.equal(o.estado, 'material-egresado');
});

// ---------- avanzarProceso ----------

test('avanzarProceso walks the route and ends in terminado', () => {
  const o = ProductionOrder.create({
    code: 'P-1',
    procesos: ['corte', 'costura'],
    pagoConfirmado: true,
    estado: 'liberado',
  });
  o.pullDomainEvents();

  o.avanzarProceso();
  assert.equal(o.procesoActual, 'corte');
  assert.equal(o.estado, 'en-produccion');

  o.avanzarProceso();
  assert.equal(o.procesoActual, 'costura');

  o.avanzarProceso(); // past the last process
  assert.equal(o.procesoActual, null);
  assert.equal(o.estado, 'terminado');

  const names = o.pullDomainEvents().map((e) => e.name);
  assert.deepEqual(names, ['ProcesoAvanzado', 'ProcesoAvanzado', 'PedidoTerminado']);
});

test('avanzarProceso requires payment and a defined route', () => {
  const noPay = ProductionOrder.create({ code: 'P-1', procesos: ['corte'] });
  assert.throws(() => noPay.avanzarProceso(), (e) => e.code === 'ORDER_COBRANZA_PENDIENTE' && e.status === 409);

  const noRoute = ProductionOrder.create({ code: 'P-2', pagoConfirmado: true });
  assert.throws(() => noRoute.avanzarProceso(), (e) => e.code === 'ORDER_SIN_RUTA' && e.status === 409);
});

// ---------- registrarTerminados / progreso ----------

test('registrarTerminados updates pendientes and auto-terminates at meta', () => {
  const o = ProductionOrder.create({ code: 'P-1', meta: 10, pagoConfirmado: true, estado: 'en-produccion' });
  o.pullDomainEvents();

  o.registrarTerminados(4);
  assert.equal(o.terminados, 4);
  assert.equal(o.hechas, 4);
  assert.equal(o.pendientes, 6);
  assert.equal(o.estado, 'en-produccion');
  assert.equal(o.progreso, 40);

  o.registrarTerminados(6);
  assert.equal(o.terminados, 10);
  assert.equal(o.pendientes, 0);
  assert.equal(o.estado, 'terminado');
  assert.equal(o.progreso, 100);

  const names = o.pullDomainEvents().map((e) => e.name);
  assert.deepEqual(names, ['TerminadosRegistrados', 'TerminadosRegistrados', 'PedidoTerminado']);
});

test('registrarTerminados rejects invalid quantities', () => {
  const o = ProductionOrder.create({ code: 'P-1', meta: 10 });
  for (const bad of [0, -3, NaN, 'x']) {
    assert.throws(() => o.registrarTerminados(bad), (e) => e.code === 'ORDER_QTY_INVALID');
  }
});

test('registrarTerminados cannot exceed the meta', () => {
  const o = ProductionOrder.create({ code: 'P-1', meta: 5 });
  o.registrarTerminados(3);
  assert.throws(
    () => o.registrarTerminados(3),
    (e) => e instanceof DomainError && e.code === 'ORDER_META_EXCEDIDA' && e.status === 409
  );
  assert.equal(o.terminados, 3, 'state unchanged after rejection');
});

test('progreso is 0 without meta and caps at 100', () => {
  assert.equal(ProductionOrder.create({ code: 'P-1' }).progreso, 0);
  const o = ProductionOrder.create({ code: 'P-2', meta: 3, terminados: 2 });
  assert.equal(o.progreso, 67);
  assert.equal(ProductionOrder.create({ code: 'P-3', meta: 3, terminados: 3 }).progreso, 100);
});

test('toPublic includes progreso; toPlain does not', () => {
  const o = ProductionOrder.create({ code: 'P-1', meta: 4, terminados: 1 });
  assert.equal(o.toPublic().progreso, 25);
  assert.equal('progreso' in o.toPlain(), false);
});

// ---------- Merma ----------

test('Merma.create rejects an invalid categoria', () => {
  assert.throws(
    () => Merma.create({ metros: 1, categoria: 'reciclable' }),
    (e) => e instanceof DomainError && e.code === 'MERMA_CATEGORIA_INVALID'
  );
});

test('Merma.create rejects negative metros', () => {
  assert.throws(
    () => Merma.create({ metros: -2, categoria: 'defecto' }),
    (e) => e instanceof DomainError && e.code === 'MERMA_METROS_INVALID'
  );
});

test('Merma.create accepts every catalog categoria', () => {
  assert.deepEqual(CATEGORIAS_MATERIAL, ['prima', 'sobrante', 'defecto', 'desperdicio']);
  for (const categoria of CATEGORIAS_MATERIAL) {
    const m = Merma.create({ metros: '3', categoria });
    assert.equal(m.categoria, categoria);
    assert.equal(m.metros, 3, 'metros coerced to Number');
  }
});

// ---------- Roll ----------

test('Roll.create requires code and a valid estado', () => {
  assert.throws(() => Roll.create({}), (e) => e.code === 'ROLL_CODE_REQUIRED');
  assert.throws(
    () => Roll.create({ code: 'R-1', estado: 'perdido' }),
    (e) => e.code === 'ROLL_ESTADO_INVALID'
  );
  assert.deepEqual(ESTADOS_ROLLO, ['almacen', 'reservado', 'en-linea']);
});

test('escanearEnLinea moves the roll to en-linea, marks it started, links order', () => {
  const r = Roll.create({ code: 'R-1' });
  assert.equal(r.estado, 'almacen');
  assert.equal(r.empezado, false);

  r.escanearEnLinea(77);
  assert.equal(r.estado, 'en-linea');
  assert.equal(r.empezado, true);
  assert.equal(r.orderId, 77);
});

test('escanearEnLinea without orderId keeps the existing link', () => {
  const r = Roll.create({ code: 'R-1', orderId: 5, estado: 'reservado' });
  r.escanearEnLinea();
  assert.equal(r.orderId, 5);
  assert.equal(r.estado, 'en-linea');
});

test('MES process catalog is the documented one', () => {
  assert.deepEqual(PROCESOS_PRODUCCION, ['corte', 'perforacion', 'costura', 'embobinado']);
});
