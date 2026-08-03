import { test } from 'node:test';
import assert from 'node:assert/strict';

// config reads process.env at import time, so the secret MUST be set before
// importing jwt.js (which imports config). Dynamic import below guarantees order.
process.env.JWT_SECRET = 'test-secret-for-unit-tests';

const { hashSecret, verifySecret } = await import('../auth/password.js');
const { signToken, verifyToken, decodeToken } = await import('../auth/jwt.js');

// ---------- password.js ----------

test('hashSecret/verifySecret roundtrip', async () => {
  const stored = await hashSecret('s3cr3t-pin');
  assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(await verifySecret('s3cr3t-pin', stored), true);
});

test('verifySecret returns false for a wrong secret', async () => {
  const stored = await hashSecret('correct-horse');
  assert.equal(await verifySecret('battery-staple', stored), false);
});

test('hashSecret salts: same secret yields different stored values', async () => {
  const a = await hashSecret('same');
  const b = await hashSecret('same');
  assert.notEqual(a, b);
  assert.equal(await verifySecret('same', a), true);
  assert.equal(await verifySecret('same', b), true);
});

test('verifySecret returns false for malformed stored values', async () => {
  assert.equal(await verifySecret('x', null), false);
  assert.equal(await verifySecret('x', ''), false);
  assert.equal(await verifySecret('x', 'no-colon-here'), false);
  // valid shape but truncated hash (length mismatch)
  assert.equal(await verifySecret('x', 'aabbccdd:1234'), false);
});

// ---------- jwt.js ----------

test('signToken/verifyToken roundtrip carries claims and a jti', () => {
  const token = signToken({ sub: 'u-7', role: 'admin', modules: ['rh', 'crm'] });
  const payload = verifyToken(token);
  assert.equal(payload.sub, 'u-7');
  assert.equal(payload.role, 'admin');
  assert.deepEqual(payload.modules, ['rh', 'crm']);
  assert.equal(payload.iss, 'mallatex-plataforma');
  assert.match(payload.jti, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.ok(payload.exp > payload.iat);
});

test('each token gets a unique jti', () => {
  const a = decodeToken(signToken({ sub: 'x' }));
  const b = decodeToken(signToken({ sub: 'x' }));
  assert.notEqual(a.jti, b.jti);
});

test('verifyToken rejects a tampered token', () => {
  const token = signToken({ sub: 'u-7', role: 'comercial' });
  const [h, p, s] = token.split('.');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  payload.role = 'admin'; // privilege escalation attempt
  const forged = [h, Buffer.from(JSON.stringify(payload)).toString('base64url'), s].join('.');
  assert.throws(() => verifyToken(forged), /invalid signature/);
});

test('verifyToken rejects a token signed with another secret', async () => {
  const { default: jwt } = await import('jsonwebtoken');
  const alien = jwt.sign({ sub: 'u-1' }, 'other-secret', { issuer: 'mallatex-plataforma' });
  assert.throws(() => verifyToken(alien), /invalid signature/);
});

test('decodeToken decodes without verifying', () => {
  const token = signToken({ sub: 'u-9' });
  assert.equal(decodeToken(token).sub, 'u-9');
});
