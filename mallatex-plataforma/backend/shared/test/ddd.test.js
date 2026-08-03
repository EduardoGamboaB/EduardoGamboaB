import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Result, DomainError } from '../ddd/Result.js';
import { Entity, ValueObject } from '../ddd/Entity.js';
import { AggregateRoot, DomainEvent } from '../ddd/AggregateRoot.js';

// ---------- Result ----------

test('Result.ok is success and carries the value', () => {
  const r = Result.ok(42);
  assert.equal(r.isSuccess, true);
  assert.equal(r.isFailure, false);
  assert.equal(r.error, null);
  assert.equal(r.getValue(), 42);
});

test('Result.fail is failure and carries the error', () => {
  const r = Result.fail('boom');
  assert.equal(r.isSuccess, false);
  assert.equal(r.isFailure, true);
  assert.equal(r.error, 'boom');
});

test('Result.getValue throws on a failed result', () => {
  const r = Result.fail('nope');
  assert.throws(() => r.getValue(), /No se puede obtener el valor/);
});

test('Result constructor rejects success with error and failure without error', () => {
  assert.throws(() => new Result(true, 'err', null), /no puede contener un error/);
  assert.throws(() => new Result(false, null, null), /debe contener un error/);
});

test('Result.combine returns first failure', () => {
  const bad = Result.fail('first-bad');
  const combined = Result.combine([Result.ok(1), bad, Result.fail('second-bad')]);
  assert.equal(combined, bad);
  assert.equal(combined.error, 'first-bad');
});

test('Result.combine of all-success returns ok', () => {
  const combined = Result.combine([Result.ok(1), Result.ok(2)]);
  assert.equal(combined.isSuccess, true);
  assert.equal(combined.getValue(), undefined);
});

test('Result.combine of empty list returns ok', () => {
  assert.equal(Result.combine([]).isSuccess, true);
});

// ---------- DomainError ----------

test('DomainError defaults: code DOMAIN_ERROR, status 400', () => {
  const e = new DomainError('algo salió mal');
  assert.equal(e.message, 'algo salió mal');
  assert.equal(e.name, 'DomainError');
  assert.equal(e.code, 'DOMAIN_ERROR');
  assert.equal(e.status, 400);
  assert.equal(e.details, null);
  assert.ok(e instanceof Error);
});

test('DomainError carries custom code/status/details', () => {
  const e = new DomainError('conflicto', { code: 'X_CONFLICT', status: 409, details: { a: 1 } });
  assert.equal(e.code, 'X_CONFLICT');
  assert.equal(e.status, 409);
  assert.deepEqual(e.details, { a: 1 });
});

// ---------- Entity ----------

test('Entity equality is identity-based (same id equals)', () => {
  const a = new Entity('id-1');
  const b = new Entity('id-1');
  const c = new Entity('id-2');
  assert.equal(a.equals(b), true);
  assert.equal(a.equals(c), false);
  assert.equal(a.equals(a), true);
});

test('Entity equals rejects null and non-entities', () => {
  const a = new Entity('id-1');
  assert.equal(a.equals(null), false);
  assert.equal(a.equals(undefined), false);
  assert.equal(a.equals({ id: 'id-1' }), false);
});

test('Entity generates a uuid when no id is given', () => {
  const a = new Entity();
  assert.match(a.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.notEqual(new Entity().id, a.id);
});

// ---------- ValueObject ----------

test('ValueObject equality is structural', () => {
  const a = new ValueObject({ x: 1, y: 'z' });
  const b = new ValueObject({ x: 1, y: 'z' });
  const c = new ValueObject({ x: 2, y: 'z' });
  assert.equal(a.equals(b), true);
  assert.equal(a.equals(c), false);
  assert.equal(a.equals(null), false);
  assert.equal(a.equals({ props: { x: 1, y: 'z' } }), false);
});

test('ValueObject props are frozen', () => {
  const a = new ValueObject({ x: 1 });
  assert.ok(Object.isFrozen(a.props));
});

// ---------- AggregateRoot / DomainEvent ----------

test('AggregateRoot accumulates and pulls domain events', () => {
  class Agg extends AggregateRoot {}
  const agg = new Agg('agg-1');
  assert.deepEqual(agg.domainEvents, []);

  const ev1 = new DomainEvent('Uno', { a: 1 });
  const ev2 = new DomainEvent('Dos');
  agg.addDomainEvent(ev1);
  agg.addDomainEvent(ev2);
  assert.equal(agg.domainEvents.length, 2);

  const pulled = agg.pullDomainEvents();
  assert.deepEqual(pulled, [ev1, ev2]);
  // pulling clears the buffer
  assert.deepEqual(agg.domainEvents, []);
  assert.deepEqual(agg.pullDomainEvents(), []);
});

test('domainEvents getter returns a copy, not the internal list', () => {
  class Agg extends AggregateRoot {}
  const agg = new Agg();
  agg.addDomainEvent(new DomainEvent('Uno'));
  const copy = agg.domainEvents;
  copy.push(new DomainEvent('Dos'));
  assert.equal(agg.domainEvents.length, 1);
});

test('DomainEvent carries name, payload and occurredAt', () => {
  const ev = new DomainEvent('PedidoLiberado', { code: 'X' });
  assert.equal(ev.name, 'PedidoLiberado');
  assert.deepEqual(ev.payload, { code: 'X' });
  assert.ok(ev.occurredAt instanceof Date);
  assert.deepEqual(new DomainEvent('Sin').payload, {});
});

test('AggregateRoot is an Entity (identity equality)', () => {
  class Agg extends AggregateRoot {}
  const a = new Agg('same');
  const b = new Agg('same');
  assert.ok(a instanceof Entity);
  assert.equal(a.equals(b), true);
});
