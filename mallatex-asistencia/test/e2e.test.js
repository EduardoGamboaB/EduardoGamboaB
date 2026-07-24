// Pruebas funcionales end-to-end (navegador real con Playwright).
// Recorren la aplicación como lo haría un usuario: persona administrativa,
// portal del empleado, seguridad entre personas y kiosco.
//
// Ejecutar:  npm run e2e
// Requiere Playwright y un navegador Chromium. Si no está disponible, la suite
// se omite automáticamente (para no romper `npm test` en entornos sin navegador).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const PORT = process.env.E2E_PORT || 3998;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';

let chromium = null, browser = null, child = null, available = false;

async function launchBrowser() {
  const mod = await import('playwright').catch(() => null);
  if (!mod) return null;
  chromium = mod.chromium;
  const opts = { args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] };
  if (fs.existsSync(CHROMIUM)) opts.executablePath = CHROMIUM;
  try { return await chromium.launch(opts); } catch { return null; }
}

before(async () => {
  if (fs.existsSync(DB_FILE)) fs.rmSync(DB_FILE);
  child = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  browser = await launchBrowser();
  available = !!browser;
  if (!available) console.log('   (Playwright/Chromium no disponible: suite E2E omitida)');
});

after(async () => {
  if (browser) await browser.close();
  if (child) child.kill('SIGKILL');
});

// Crea una página nueva y recolecta errores de página (JS no capturado).
async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 940 }, permissions: ['camera'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, errors };
}
async function loginAdmin(page, email = 'admin@mallatex.mx') {
  await page.goto(BASE);
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', 'mallatex2026');
  await page.click('button[type=submit]');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 8000 });
}
async function loginEmployee(page, code = 'MTX001', pin = '1234') {
  await page.goto(BASE);
  await page.click('#persona-seg button[data-persona=empleado]');
  await page.fill('input[name=code]', code);
  await page.fill('input[name=pin]', pin);
  await page.click('button[type=submit]');
  await page.waitForSelector('#app:not(.hidden)', { timeout: 8000 });
}
async function go(page, hash) { await page.evaluate((k) => (location.hash = k), hash); await page.waitForTimeout(650); }

// ---------------------------------------------------------------------------

test('administrativo: todas las vistas cargan sin errores de página', async (t) => {
  if (!available) { t.skip('navegador no disponible'); return; }
  const { page, errors } = await newPage();
  await loginAdmin(page);
  const views = [
    ['dashboard', '.kpi'], ['attendance', 'table.tbl tbody tr'], ['incidents', 'table.tbl tbody tr'],
    ['overtime', 'table.tbl tbody tr'], ['periods', 'table.tbl tbody tr'], ['rh-indicadores', '.kpi'],
    ['rh-recibos', '.card'], ['rh-vacaciones', 'table.tbl tbody tr'], ['rh-tickets', 'table.tbl tbody tr'],
    ['employees', 'table.tbl tbody tr'], ['schedules', '.card'], ['checador', 'table.tbl tbody tr'],
    ['users', 'table.tbl tbody tr'], ['audit', 'table.tbl tbody tr'],
  ];
  for (const [hash, sel] of views) {
    await go(page, hash);
    const n = await page.$$eval(sel, (e) => e.length).catch(() => 0);
    assert.ok(n > 0, `la vista ${hash} debe mostrar contenido (${sel})`);
  }
  assert.deepEqual(errors, [], 'no debe haber errores de página en el área administrativa');
  await page.context().close();
});

test('administrativo: flujo de nómina completo hasta exportar NOI', async (t) => {
  if (!available) { t.skip('navegador no disponible'); return; }
  const { page } = await newPage();
  await loginAdmin(page, 'contabilidad@mallatex.mx');
  // Corregir un día de asistencia (con motivo obligatorio)
  await go(page, 'attendance');
  await page.click('table.tbl tbody tr:first-child button:has-text("Corregir")');
  await page.fill('.modal textarea', 'Ajuste E2E');
  await page.click('.modal button:has-text("Guardar corrección")');
  await page.waitForTimeout(500);
  assert.ok(await page.$('text=✎ manual'), 'el registro corregido queda marcado como manual');
  // Autorizar incidencias y horas extra vía API (rápido) usando el token de sesión
  await page.evaluate(async () => {
    const t = localStorage.getItem('mtx_token');
    const H = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' };
    for (const i of await (await fetch('/api/incidents?status=pendiente', { headers: H })).json())
      await fetch(`/api/incidents/${i.id}/authorize`, { method: 'POST', headers: H });
    const ot = await (await fetch('/api/overtime?status=pendiente&start=2026-07-16&end=2026-07-31', { headers: H })).json();
    for (const o of ot) await fetch(`/api/overtime/${o.id}/authorize`, { method: 'POST', headers: H, body: '{}' });
  });
  // Generar recibos, cerrar periodo y exportar NOI
  await go(page, 'rh-recibos');
  await page.click('button:has-text("Generar recibos")');
  const dlg = await page.$('.modal button:has-text("Generar")'); if (dlg) await dlg.click();
  await page.waitForTimeout(600);
  const recibos = await page.$$eval('table.tbl tbody tr', (e) => e.length).catch(() => 0);
  assert.ok(recibos >= 12, 'se generan recibos del periodo');
  const res = await page.evaluate(async () => {
    const t = localStorage.getItem('mtx_token');
    const H = { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' };
    const close = await fetch('/api/periods/2/close', { method: 'POST', headers: H, body: '{}' });
    const exp = await fetch('/api/periods/2/noi/export?format=txt', { headers: H });
    return { close: close.status, exp: exp.status, body: await exp.text() };
  });
  assert.equal(res.close, 200, 'el periodo se cierra');
  assert.equal(res.exp, 200, 'la interfaz NOI se exporta');
  assert.match(res.body, /CLAVE\|CONCEPTO\|TIPO/, 'el archivo NOI tiene el encabezado esperado');
  await page.context().close();
});

test('portal del empleado: asistencia, solicitud de vacaciones y ticket', async (t) => {
  if (!available) { t.skip('navegador no disponible'); return; }
  const { page, errors } = await newPage();
  await loginEmployee(page);
  await go(page, 'portal-asistencia');
  assert.ok(await page.$$eval('.kpi', (e) => e.length).then((n) => n > 0), 'Mi asistencia muestra indicadores');
  // Solicitar vacaciones
  await go(page, 'portal-vacaciones');
  await page.click('button:has-text("+ Nueva solicitud")');
  await page.fill('.modal input[type=date] >> nth=0', '2026-09-01');
  await page.fill('.modal input[type=date] >> nth=1', '2026-09-03');
  await page.click('.modal button:has-text("Enviar solicitud")');
  await page.waitForTimeout(600);
  const solicitudes = await page.$$eval('table.tbl tbody tr', (e) => e.length).catch(() => 0);
  assert.ok(solicitudes >= 1, 'la solicitud queda registrada');
  // Crear un ticket
  await go(page, 'portal-tickets');
  await page.click('button:has-text("+ Nuevo ticket")');
  await page.fill('.modal input', 'Ticket E2E');
  await page.fill('.modal textarea', 'Mensaje de prueba E2E');
  await page.click('.modal button:has-text("Enviar")');
  await page.waitForTimeout(600);
  const tickets = await page.$$eval('table.tbl tbody tr', (e) => e.length).catch(() => 0);
  assert.ok(tickets >= 1, 'el ticket queda creado');
  assert.deepEqual(errors, [], 'no debe haber errores de página en el portal');
  await page.context().close();
});

test('seguridad: el empleado no puede acceder a la API administrativa', async (t) => {
  if (!available) { t.skip('navegador no disponible'); return; }
  const { page } = await newPage();
  await loginEmployee(page);
  const codes = await page.evaluate(async () => {
    const t = localStorage.getItem('mtx_token');
    const H = { Authorization: 'Bearer ' + t };
    const a = await fetch('/api/employees', { headers: H });
    const b = await fetch('/api/rh/indicators', { headers: H });
    const c = await fetch('/api/portal/me', { headers: H });
    return { emp: a.status, rh: b.status, portal: c.status };
  });
  assert.equal(codes.emp, 403, 'empleado bloqueado en /api/employees');
  assert.equal(codes.rh, 403, 'empleado bloqueado en /api/rh');
  assert.equal(codes.portal, 200, 'empleado accede a su propio portal');
  await page.context().close();
});

test('kiosco: registro manual muestra confirmación', async (t) => {
  if (!available) { t.skip('navegador no disponible'); return; }
  const { page } = await newPage();
  await page.goto(BASE + '/kiosk');
  await page.waitForTimeout(1200);
  await page.click('#manualLink');
  await page.click('.emp:first-child');
  await page.waitForTimeout(1500);
  assert.ok(await page.$('.confirm.show'), 'el kiosco muestra la confirmación de acceso');
  await page.context().close();
});
