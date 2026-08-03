import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createLoginRateLimiter } from '../http/rateLimit.js';

function makeReq(email = 'a@b.com', ip = '1.2.3.4') {
  return { body: { email }, ip };
}

function makeRes() {
  const res = {
    headers: {},
    statusCode: null,
    body: null,
    set(k, v) { this.headers[k] = v; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

test('guard passes while failures are under max', () => {
  const rl = createLoginRateLimiter({ max: 3 });
  const req = makeReq();
  for (let i = 0; i < 2; i++) rl.fail(req);

  const res = makeRes();
  let nextCalled = false;
  rl.guard(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);
});

test('guard responds 429 after max failures', () => {
  const rl = createLoginRateLimiter({ max: 3, windowMs: 60_000 });
  const req = makeReq();
  for (let i = 0; i < 3; i++) rl.fail(req);

  const res = makeRes();
  let nextCalled = false;
  rl.guard(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.code, 'RATE_LIMITED');
  assert.ok(res.body.retryAfterSeconds > 0);
  assert.ok(Number(res.headers['Retry-After']) > 0);
});

test('succeed() clears the counter for the key', () => {
  const rl = createLoginRateLimiter({ max: 2 });
  const req = makeReq();
  rl.fail(req);
  rl.fail(req);

  // saturated
  const blocked = makeRes();
  rl.guard(req, blocked, () => { throw new Error('should not pass'); });
  assert.equal(blocked.statusCode, 429);

  rl.succeed(req);
  const res = makeRes();
  let nextCalled = false;
  rl.guard(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('keys are per ip+identifier: another user/ip is not blocked', () => {
  const rl = createLoginRateLimiter({ max: 1 });
  rl.fail(makeReq('victim@x.com', '9.9.9.9'));

  const otherEmail = makeRes();
  let passed = false;
  rl.guard(makeReq('other@x.com', '9.9.9.9'), otherEmail, () => { passed = true; });
  assert.equal(passed, true);

  const otherIp = makeRes();
  passed = false;
  rl.guard(makeReq('victim@x.com', '8.8.8.8'), otherIp, () => { passed = true; });
  assert.equal(passed, true);

  const same = makeRes();
  rl.guard(makeReq('victim@x.com', '9.9.9.9'), same, () => { throw new Error('should not pass'); });
  assert.equal(same.statusCode, 429);
});

test('email key is case-insensitive', () => {
  const rl = createLoginRateLimiter({ max: 1 });
  rl.fail(makeReq('User@X.com'));
  const res = makeRes();
  rl.guard(makeReq('user@x.com'), res, () => { throw new Error('should not pass'); });
  assert.equal(res.statusCode, 429);
});

test('failures outside the window are pruned', () => {
  const rl = createLoginRateLimiter({ max: 1, windowMs: 50 });
  const req = makeReq();
  rl.fail(req);
  const t0 = Date.now();
  while (Date.now() - t0 < 60) { /* busy-wait past the window */ }
  const res = makeRes();
  let nextCalled = false;
  rl.guard(req, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
