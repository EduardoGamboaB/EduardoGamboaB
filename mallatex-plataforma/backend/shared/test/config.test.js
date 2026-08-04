import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// La barrera del secreto JWT vive en el módulo de config: importarlo con
// NODE_ENV=production y un secreto ausente/débil debe abortar el arranque.
function importConfig(env) {
  const code = "import('@mallatex/shared/config').then(()=>process.exit(0)).catch(()=>process.exit(3))";
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

test('producción SIN JWT_SECRET aborta el arranque', () => {
  const r = importConfig({ NODE_ENV: 'production', JWT_SECRET: '' });
  assert.equal(r.status, 3); // el import lanza y el proceso sale con 3
});

test('producción con secreto débil aborta', () => {
  const r = importConfig({ NODE_ENV: 'production', JWT_SECRET: 'cambia-esto' });
  assert.equal(r.status, 3);
});

test('producción con secreto corto (<24) aborta', () => {
  const r = importConfig({ NODE_ENV: 'production', JWT_SECRET: 'corto-123' });
  assert.equal(r.status, 3);
});

test('producción con secreto fuerte arranca', () => {
  const r = importConfig({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(48) });
  assert.equal(r.status, 0);
});

test('desarrollo arranca aunque falte el secreto (usa default de dev)', () => {
  const r = importConfig({ NODE_ENV: 'development', JWT_SECRET: '' });
  assert.equal(r.status, 0);
});
