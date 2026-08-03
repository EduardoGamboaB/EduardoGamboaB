import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AccessPolicy } from '../src/domain/AccessPolicy.js';
import { User, VALID_ROLES } from '../src/domain/User.js';
import { DomainError } from '@mallatex/shared/ddd';

// ---------- AccessPolicy ----------

test('effectiveModules = base ∪ extra − revoked', () => {
  const mods = AccessPolicy.effectiveModules({
    baseModules: ['rh', 'crm', 'mes'],
    extra: ['leads'],
    revoked: ['mes'],
  });
  assert.deepEqual([...mods].sort(), ['crm', 'leads', 'rh']);
});

test('extra does not duplicate modules already in base', () => {
  const mods = AccessPolicy.effectiveModules({ baseModules: ['rh'], extra: ['rh', 'crm'] });
  assert.deepEqual([...mods].sort(), ['crm', 'rh']);
});

test('revoking a module also removes it if granted as extra', () => {
  const mods = AccessPolicy.effectiveModules({ baseModules: [], extra: ['crm'], revoked: ['crm'] });
  assert.deepEqual(mods, []);
});

test('isAdmin returns the whole allModules universe, ignoring revocations', () => {
  const all = ['rh', 'crm', 'mes', 'leads'];
  const mods = AccessPolicy.effectiveModules({
    baseModules: ['rh'],
    revoked: ['rh', 'crm'],
    isAdmin: true,
    allModules: all,
  });
  assert.deepEqual(mods, all);
  assert.notEqual(mods, all, 'must be a copy, not the same array');
});

test('empty inputs produce empty module lists', () => {
  assert.deepEqual(AccessPolicy.effectiveModules({}), []);
  assert.deepEqual(AccessPolicy.effectiveModules({ isAdmin: true }), []);
});

// ---------- User ----------

test('User.create requires name and email', () => {
  assert.throws(
    () => User.create({ email: 'a@b.com' }),
    (e) => e instanceof DomainError && e.code === 'USER_NAME_REQUIRED'
  );
  assert.throws(
    () => User.create({ name: 'Ana' }),
    (e) => e instanceof DomainError && e.code === 'USER_EMAIL_REQUIRED'
  );
});

test('User.create rejects an invalid role', () => {
  assert.throws(
    () => User.create({ name: 'Ana', email: 'a@b.com', role: 'superuser' }),
    (e) => e instanceof DomainError && e.code === 'USER_ROLE_INVALID'
  );
});

test('User.create defaults: role comercial, active true, lowercased email', () => {
  const u = User.create({ name: 'Ana', email: 'Ana@Empresa.COM' });
  assert.equal(u.role, 'comercial');
  assert.equal(u.active, true);
  assert.equal(u.email, 'ana@empresa.com');
  assert.equal(u.isAdmin, false);
});

test('User.create emits a UserCreated domain event', () => {
  const u = User.create({ name: 'Ana', email: 'a@b.com', role: 'admin' });
  const events = u.pullDomainEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].name, 'UserCreated');
  assert.deepEqual(events[0].payload, { email: 'a@b.com', role: 'admin' });
  assert.deepEqual(u.pullDomainEvents(), [], 'pull drains the buffer');
});

test('changeRole accepts valid roles and rejects invalid ones', () => {
  const u = User.create({ name: 'Ana', email: 'a@b.com' });
  u.changeRole('nomina');
  assert.equal(u.role, 'nomina');
  assert.throws(
    () => u.changeRole('hacker'),
    (e) => e instanceof DomainError && e.code === 'USER_ROLE_INVALID'
  );
  assert.equal(u.role, 'nomina', 'role unchanged after rejected change');
});

test('isAdmin reflects the admin role', () => {
  const u = User.create({ name: 'Root', email: 'root@b.com', role: 'admin' });
  assert.equal(u.isAdmin, true);
});

test('deactivate flips active off', () => {
  const u = User.create({ name: 'Ana', email: 'a@b.com' });
  u.deactivate();
  assert.equal(u.active, false);
});

test('toPublic strips passwordHash; toPlain keeps it', () => {
  const u = User.create({ name: 'Ana', email: 'a@b.com', passwordHash: 'salt:hash' });
  assert.equal(u.toPlain().passwordHash, 'salt:hash');
  const pub = u.toPublic();
  assert.equal('passwordHash' in pub, false);
  assert.equal(pub.name, 'Ana');
  assert.equal(pub.email, 'a@b.com');
});

test('VALID_ROLES catalog is the expected set', () => {
  assert.deepEqual(VALID_ROLES, ['admin', 'contador', 'nomina', 'comercial', 'produccion', 'direccion', 'marketing']);
});
