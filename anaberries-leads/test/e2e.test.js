// Prueba End-to-End de la jornada completa del stand (navegador real con Playwright).
// Ejecutar:  npm run e2e
// Cubre: autoregistro por QR (landing) → admin del evento → Términos dinámicos →
//        landing con premio → captura del staff → sorteo → dashboard → export CSV.
// Si Playwright/Chromium no está disponible, la prueba se omite (no falla el CI).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 4933;
const PIN = '2026';
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_DIR = path.dirname(new URL(import.meta.url).pathname); // .../test
const PROJECT = path.join(TEST_DIR, '..'); // raíz de anaberries-leads

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* no instalado */ }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let server, DATA_DIR;

async function launchBrowser() {
  // Intenta el binario por defecto de Playwright y, si no, el Chromium del entorno.
  try { return await chromium.launch(); } catch { /* intenta ruta del entorno */ }
  for (const p of ['/opt/pw-browsers/chromium', process.env.CHROMIUM_PATH].filter(Boolean)) {
    try { return await chromium.launch({ executablePath: p }); } catch { /* siguiente */ }
  }
  return null;
}

before(async () => {
  DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ana-e2e-'));
  server = spawn('node', ['server/index.js'], {
    cwd: PROJECT,
    env: { ...process.env, PORT: String(PORT), STAFF_PIN: PIN, ADMIN_EMAIL: 'admin@test.com', ADMIN_PASSWORD: 'admin1234', DATA_DIR, NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) return; } catch { /* aún no */ }
    await wait(100);
  }
  throw new Error('El servidor no arrancó a tiempo');
});

after(() => {
  server?.kill('SIGTERM');
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});

test('E2E · jornada completa del stand', async (t) => {
  if (!chromium) return t.skip('Playwright no está instalado');
  const browser = await launchBrowser();
  if (!browser) return t.skip('Chromium no disponible en este entorno');

  try {
    // ---------- 1) Visitante: autoregistro desde la landing (móvil) ----------
    const visitor = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    // Intercepta la redirección al sitio oficial para no depender de red externa.
    await visitor.route('**://mallatex.com.mx/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>sitio oficial (stub)</body></html>' }));
    await visitor.goto(BASE + '/registro', { waitUntil: 'networkidle' });
    await visitor.fill('[name=nombre]', 'Visitante E2E');
    await visitor.fill('[name=empresa]', 'Agrícola E2E');
    await visitor.selectOption('[name=estado]', 'Jalisco');
    await visitor.fill('[name=telefono]', '5512349876');
    await visitor.fill('[name=email]', 'visitante.e2e@correo.mx');
    await visitor.check('[name=aceptaTerminos]');
    await visitor.check('[name=aceptaPrivacidad]');
    await visitor.click('#btn-enviar');
    await visitor.waitForSelector('#ok-view:not([hidden])', { timeout: 8000 });
    assert.ok(await visitor.isVisible('#ok-view'), 'la landing muestra confirmación');
    // Se pinta el folio de registro generado para el lead.
    await visitor.waitForSelector('#ok-folio-box:not([hidden])', { timeout: 5000 });
    const folio = (await visitor.textContent('#ok-folio')) || '';
    assert.match(folio, /^ANB-[A-Z0-9]{6}$/, 'muestra el folio de registro del lead');
    // Nota de que los datos deben coincidir con el gafete.
    assert.ok(await visitor.isVisible('.gafete-note'), 'muestra la nota del gafete');
    // Enlace de respaldo al sitio oficial visible en la confirmación.
    assert.equal(await visitor.getAttribute('#redir-note a', 'href'), 'https://mallatex.com.mx/', 'ofrece enlace al sitio oficial');
    // Tras el registro exitoso, redirige al sitio oficial de Mallatex (tras el margen para anotar el folio).
    await visitor.waitForURL('**://mallatex.com.mx/**', { timeout: 15000 });
    assert.match(visitor.url(), /mallatex\.com\.mx/, 'redirige al sitio oficial tras el registro');
    await visitor.close();

    // ---------- 2) Staff: inicia sesión + administrar evento ----------
    const staff = await browser.newPage({ viewport: { width: 1240, height: 1000 } });
    await staff.goto(BASE + '/', { waitUntil: 'networkidle' });
    await staff.fill('#login-form [name=email]', 'admin@test.com');
    await staff.fill('#login-form [name=password]', 'admin1234');
    await staff.click('#btn-login');
    await staff.waitForSelector('#app-shell:not(.hidden)', { timeout: 8000 });

    await staff.click('.tab[data-view="evento"]');
    await staff.waitForSelector('#view-evento.is-active', { timeout: 5000 });
    await staff.fill('[name=premio]', 'Rollo de malla antigranizo 4×50 m');
    await staff.fill('[name=tipo]', 'Expo agrícola');
    await staff.fill('[name=fecha]', '2026-08-15');
    await staff.fill('[name=hora]', '17:30');
    await staff.fill('[name=dinamica]', 'Regístrate y participa; el ganador se elige al azar.');
    await staff.click('#btn-evento-guardar');
    await staff.waitForFunction(() => document.querySelector('#evento-msg')?.textContent?.includes('guardado'), { timeout: 8000 });

    // ---------- 3) Términos y Condiciones reflejan el premio ----------
    const terms = await browser.newPage();
    await terms.goto(BASE + '/terminos', { waitUntil: 'networkidle' });
    await terms.waitForFunction(() => document.querySelector('#tyc-premio')?.textContent?.includes('Rollo de malla'), { timeout: 8000 });
    const termsText = await terms.textContent('#tyc-premio');
    assert.match(termsText, /Rollo de malla antigranizo/, 'los Términos muestran el premio configurado');
    await terms.close();

    // ---------- 4) Landing muestra la tarjeta del premio ----------
    const land2 = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await land2.goto(BASE + '/registro', { waitUntil: 'networkidle' });
    await land2.waitForFunction(() => !document.querySelector('#prize-card')?.hidden, { timeout: 8000 });
    assert.ok(await land2.isVisible('#prize-card'), 'la landing muestra la tarjeta del premio');
    await land2.close();

    // ---------- 5) Staff: captura manual de un lead ----------
    await staff.click('.tab[data-view="captura"]');
    await staff.waitForSelector('#view-captura.is-active');
    await staff.fill('[name=nombre]', 'Lead Manual E2E');
    await staff.fill('[name=telefono]', '5577778888');
    await staff.fill('#captador', 'Staff E2E');
    await staff.click('#btn-guardar');
    await staff.waitForFunction(() => document.querySelector('#lead-msg')?.textContent?.includes('guardado'), { timeout: 8000 });

    // ---------- 6) Sorteo: elegir un ganador ----------
    await staff.click('.tab[data-view="sorteo"]');
    await staff.waitForSelector('#view-sorteo.is-active');
    await staff.fill('#premio', 'Rollo de malla antigranizo 4×50 m');
    await staff.click('#btn-sortear');
    await staff.waitForSelector('.reel.winner', { timeout: 8000 });
    const winner = await staff.textContent('.reel.winner');
    assert.ok(winner && winner.length > 0, 'el sorteo anuncia un ganador');

    // ---------- 7) Dashboard: KPIs y tabla ----------
    await staff.click('.tab[data-view="dashboard"]');
    await staff.waitForSelector('#view-dashboard.is-active');
    await staff.waitForFunction(() => {
      const el = document.querySelector('#kpis .kpi .v');
      return el && Number(el.textContent) >= 2; // al menos el autoregistro + captura manual
    }, { timeout: 8000 });
    const totalLeads = await staff.textContent('#kpis .kpi .v');
    assert.ok(Number(totalLeads) >= 2, 'el dashboard cuenta los leads capturados');
    await staff.close();

    // ---------- 8) Exportación CSV con token de sesión ----------
    const lr = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@test.com', password: 'admin1234' }) });
    const token = (await lr.json()).token;
    const csv = await fetch(`${BASE}/api/leads/export.csv?token=${token}`);
    assert.equal(csv.status, 200);
    const body = await csv.text();
    assert.match(body, /Visitante E2E/, 'el CSV incluye el autoregistro');
    assert.match(body, /Lead Manual E2E/, 'el CSV incluye la captura del staff');

    // ---------- 9) Responsive: login y navegación en móvil (390px) sin desbordes ----------
    const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await mob.goto(BASE + '/', { waitUntil: 'networkidle' });
    await mob.fill('#login-form [name=email]', 'admin@test.com');
    await mob.fill('#login-form [name=password]', 'admin1234');
    await mob.click('#btn-login');
    await mob.waitForSelector('#app-shell:not(.hidden)', { timeout: 8000 });
    for (const v of ['sorteo', 'dashboard', 'evento', 'captura']) {
      await mob.click(`.tab[data-view="${v}"]`);
      await mob.waitForSelector(`#view-${v}.is-active`, { timeout: 5000 });
    }
    const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 2, `sin desbordamiento horizontal en móvil (overflow=${overflow}px)`);
    await mob.close();
  } finally {
    await browser.close();
  }
});

test('E2E · CRUD de eventos (crear, finalizar, reabrir, eliminar)', async (t) => {
  if (!chromium) return t.skip('Playwright no está instalado');
  const browser = await launchBrowser();
  if (!browser) return t.skip('Chromium no disponible en este entorno');
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1000 } });
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.fill('#login-form [name=email]', 'admin@test.com');
    await page.fill('#login-form [name=password]', 'admin1234');
    await page.click('#btn-login');
    await page.waitForSelector('#app-shell:not(.hidden)', { timeout: 8000 });

    await page.click('.tab[data-view="evento"]');
    await page.waitForSelector('#view-evento.is-active', { timeout: 5000 });

    // La lista (CRUD) de eventos se muestra.
    await page.waitForSelector('#eventos-tbody tr', { timeout: 5000 });
    const antes = await page.locator('#eventos-tbody tr').count();
    assert.ok(antes >= 1, 'la lista de eventos muestra al menos un evento');

    // Crear un evento.
    await page.click('#btn-evento-nuevo');
    await page.waitForFunction((n) => document.querySelectorAll('#eventos-tbody tr').length > n, antes, { timeout: 8000 });
    assert.ok(await page.isVisible('#eventos-tbody tr.sel'), 'el evento nuevo queda seleccionado en la lista');

    // Finalizar el evento nuevo desde la lista.
    await page.click('#eventos-tbody tr.sel [data-act="finalizar"]');
    await page.waitForFunction(() => document.querySelector('#eventos-tbody tr.sel .est')?.textContent?.includes('Finalizado'), { timeout: 8000 });

    // Reabrirlo.
    await page.click('#eventos-tbody tr.sel [data-act="reabrir"]');
    await page.waitForFunction(() => document.querySelector('#eventos-tbody tr.sel .est')?.textContent?.includes('Vigente'), { timeout: 8000 });

    // Eliminarlo (no tiene leads) → la lista vuelve al conteo original.
    await page.click('#eventos-tbody tr.sel [data-act="eliminar"]');
    await page.waitForFunction((n) => document.querySelectorAll('#eventos-tbody tr').length === n, antes, { timeout: 8000 });
    assert.equal(await page.locator('#eventos-tbody tr').count(), antes, 'el evento se eliminó de la lista');

    await page.close();
  } finally {
    await browser.close();
  }
});

test('E2E · landing: foto del gafete (principal) y manual (secundario)', async (t) => {
  if (!chromium) return t.skip('Playwright no está instalado');
  const browser = await launchBrowser();
  if (!browser) return t.skip('Chromium no disponible en este entorno');
  // PNG 1×1 para simular la foto del gafete (sin depender de OCR real).
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  try {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    await p.route('**://mallatex.com.mx/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }));
    await p.goto(BASE + '/registro', { waitUntil: 'networkidle' });

    // El modo principal es «foto del gafete» y su panel está visible por defecto.
    assert.ok(await p.isVisible('#gafete-panel'), 'el panel del gafete es visible por defecto (principal)');
    assert.ok((await p.getAttribute('.cap-mode[data-mode="gafete"]', 'class')).includes('is-active'), 'gafete es el modo activo por defecto');

    // Cambiar a manual oculta el panel; volver a gafete lo muestra.
    await p.click('.cap-mode[data-mode="manual"]');
    await p.waitForFunction(() => document.getElementById('gafete-panel').hidden === true, null, { timeout: 6000 });
    await p.click('.cap-mode[data-mode="gafete"]');
    await p.waitForFunction(() => document.getElementById('gafete-panel').hidden === false, null, { timeout: 6000 });

    // Subir una imagen del gafete → aparece el botón «Extraer datos» (foto capturada).
    await p.setInputFiles('#cam-file', { name: 'gafete.png', mimeType: 'image/png', buffer: png });
    await p.waitForSelector('#btn-ocr:not([hidden])', { timeout: 5000 });

    // Celular y correo siguen presentes en ambos modos; se llenan y se envía con foto.
    await p.fill('[name=nombre]', 'Lead Gafete E2E');
    await p.fill('[name=telefono]', '5599990000');
    await p.fill('[name=email]', 'gafete.e2e@empresa.com');
    await p.check('[name=aceptaTerminos]');
    await p.check('[name=aceptaPrivacidad]');
    await p.click('#btn-enviar');
    await p.waitForSelector('#ok-view:not([hidden])', { timeout: 8000 });
    assert.match((await p.textContent('#ok-folio')) || '', /^ANB-[A-Z0-9]{6}$/, 'registro con foto genera folio');
    await p.close();

    // El lead quedó como método «gafete» y con foto (tieneFoto) — vía API con sesión admin.
    const lr = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@test.com', password: 'admin1234' }) });
    const token = (await lr.json()).token;
    const leads = await (await fetch(`${BASE}/api/leads`, { headers: { Authorization: 'Bearer ' + token } })).json();
    const lead = leads.items.find((l) => l.email === 'gafete.e2e@empresa.com');
    assert.ok(lead, 'el lead con foto se guardó');
    assert.equal(lead.metodoCaptura, 'gafete', 'el método de captura es gafete');
    assert.equal(lead.tieneFoto, true, 'se guardó la foto del gafete');
  } finally {
    await browser.close();
  }
});
