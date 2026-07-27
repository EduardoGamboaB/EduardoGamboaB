// QA automatizado — pruebas de la API (captura, sorteo, dashboard, acceso).
// Arranca el servidor en un puerto y directorio de datos temporales y ejerce los endpoints.
// Ejecutar:  npm test

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const PORT = 4519;
const PIN = '2026';
const BASE = `http://127.0.0.1:${PORT}`;
let DATA_DIR;
let server;

function api(pathname, { method = 'GET', body, pin } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (pin) headers['x-staff-pin'] = pin;
  return fetch(BASE + pathname, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
async function json(res) { try { return await res.json(); } catch { return null; } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ana-qa-'));
  server = spawn('node', ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), STAFF_PIN: PIN, DATA_DIR, NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  // Espera a que el servidor responda.
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) return; } catch { /* aún no */ }
    await wait(100);
  }
  throw new Error('El servidor no arrancó a tiempo');
});

after(() => {
  server?.kill('SIGTERM');
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ---------- Salud y acceso ----------
test('health responde ok', async () => {
  const r = await api('/api/health');
  assert.equal(r.status, 200);
  assert.equal((await json(r)).ok, true);
});

test('access indica que se requiere PIN y no autoriza sin él', async () => {
  const info = await json(await api('/api/access'));
  assert.equal(info.pinRequired, true);
  assert.equal(info.authorized, false);
});

test('access autoriza con el PIN correcto', async () => {
  const info = await json(await api('/api/access', { pin: PIN }));
  assert.equal(info.authorized, true);
});

// ---------- Metadatos ----------
test('meta expone catálogos de interés y fuente', async () => {
  const meta = await json(await api('/api/leads/meta'));
  assert.ok(Array.isArray(meta.intereses) && meta.intereses.length > 0);
  assert.ok(meta.intereses.includes('Malla antigranizo'));
  assert.ok(Array.isArray(meta.fuentes) && meta.fuentes.includes('Stand'));
});

// ---------- Captura de leads ----------
test('crea un lead válido (201)', async () => {
  const r = await api('/api/leads', { method: 'POST', body: {
    nombre: 'Juan Pérez', empresa: 'Agrícola del Valle', telefono: '55 1234 5678',
    interes: 'Malla antigranizo', fuente: 'Stand', consentimiento: true, capturadoPor: 'Ana',
  }});
  assert.equal(r.status, 201);
  const lead = await json(r);
  assert.ok(lead.id.startsWith('lead_'));
  assert.equal(lead.telefono, '5512345678'); // normaliza el teléfono
});

test('rechaza lead sin nombre (400)', async () => {
  const r = await api('/api/leads', { method: 'POST', body: { telefono: '5599999999' } });
  assert.equal(r.status, 400);
});

test('rechaza lead sin teléfono ni correo (400)', async () => {
  const r = await api('/api/leads', { method: 'POST', body: { nombre: 'Sin contacto' } });
  assert.equal(r.status, 400);
});

test('rechaza correo con formato inválido (400)', async () => {
  const r = await api('/api/leads', { method: 'POST', body: { nombre: 'Correo malo', email: 'no-es-correo' } });
  assert.equal(r.status, 400);
});

test('detecta duplicado por teléfono (409) y permite forzar', async () => {
  const dup = await api('/api/leads', { method: 'POST', body: { nombre: 'Otro Juan', telefono: '5512345678' } });
  assert.equal(dup.status, 409);
  const forced = await api('/api/leads', { method: 'POST', body: { nombre: 'Otro Juan', telefono: '5512345678', forzar: true } });
  assert.equal(forced.status, 201);
});

test('el listado de leads requiere PIN (401)', async () => {
  const r = await api('/api/leads');
  assert.equal(r.status, 401);
});

test('el listado de leads funciona con PIN y filtra por búsqueda', async () => {
  const all = await json(await api('/api/leads', { pin: PIN }));
  assert.ok(all.total >= 2);
  const filtered = await json(await api('/api/leads?q=valle', { pin: PIN }));
  assert.ok(filtered.items.every((l) => JSON.stringify(l).toLowerCase().includes('valle')));
});

test('exporta CSV con cabecera y filas', async () => {
  const r = await api('/api/leads/export.csv', { pin: PIN });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/csv/);
  const body = await r.text();
  assert.ok(body.includes('nombre,empresa'));
  assert.ok(body.includes('Juan Pérez'));
});

// ---------- Dashboard ----------
test('stats devuelve KPIs y agregados', async () => {
  const s = await json(await api('/api/stats', { pin: PIN }));
  assert.ok(s.total >= 2);
  assert.equal(typeof s.tasaConsentimiento, 'number');
  assert.ok(Array.isArray(s.porInteres));
  assert.ok(Array.isArray(s.timeline));
});

test('stats requiere PIN (401)', async () => {
  assert.equal((await api('/api/stats')).status, 401);
});

// ---------- Sorteo ----------
test('eligible cuenta participantes', async () => {
  const e = await json(await api('/api/raffle/eligible', { pin: PIN }));
  assert.ok(e.total >= 1);
});

test('draw selecciona un ganador y lo registra', async () => {
  const r = await api('/api/raffle/draw', { method: 'POST', pin: PIN, body: { premio: 'Rollo de malla antigranizo' } });
  assert.equal(r.status, 201);
  const { ganador } = await json(r);
  assert.ok(ganador.leadId);
  assert.equal(ganador.premio, 'Rollo de malla antigranizo');
  const winners = await json(await api('/api/raffle/winners', { pin: PIN }));
  assert.ok(winners.items.some((w) => w.id === ganador.id));
});

test('draw sin PIN es rechazado (401)', async () => {
  assert.equal((await api('/api/raffle/draw', { method: 'POST', body: {} })).status, 401);
});

test('evitar repetidos reduce el pool tras un ganador', async () => {
  const antes = (await json(await api('/api/raffle/eligible?repetidos=1', { pin: PIN }))).total;
  const conRepes = (await json(await api('/api/raffle/eligible?repetidos=0', { pin: PIN }))).total;
  assert.ok(antes <= conRepes); // al evitar repetidos hay igual o menos elegibles
});

test('anular un sorteo lo elimina del historial', async () => {
  const { ganador } = await json(await api('/api/raffle/draw', { method: 'POST', pin: PIN, body: { premio: 'Premio temporal' } }));
  const del = await api('/api/raffle/winners/' + ganador.id, { method: 'DELETE', pin: PIN });
  assert.equal(del.status, 200);
  const winners = await json(await api('/api/raffle/winners', { pin: PIN }));
  assert.ok(!winners.items.some((w) => w.id === ganador.id));
});

// ---------- Eliminación de leads ----------
test('elimina un lead por id', async () => {
  const created = await json(await api('/api/leads', { method: 'POST', body: { nombre: 'Borrable', telefono: '5500000000' } }));
  const del = await api('/api/leads/' + created.id, { method: 'DELETE', pin: PIN });
  assert.equal(del.status, 200);
});

// ---------- Captura por foto del gafete ----------
// JPEG 1x1 válido en base64 (imagen mínima de prueba).
const JPEG_1PX = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AT//Z';

test('lead por gafete guarda la foto y marca metodoCaptura', async () => {
  const r = await api('/api/leads', { method: 'POST', body: {
    nombre: 'Lead Gafete', telefono: '5544332211', metodoCaptura: 'gafete', foto: JPEG_1PX,
  }});
  assert.equal(r.status, 201);
  const lead = await json(r);
  assert.equal(lead.metodoCaptura, 'gafete');
  assert.equal(lead.tieneFoto, true);

  // La foto se sirve solo con PIN.
  const sinPin = await api(`/api/leads/${lead.id}/badge`);
  assert.equal(sinPin.status, 401);
  const conPin = await api(`/api/leads/${lead.id}/badge`, { pin: PIN });
  assert.equal(conPin.status, 200);
  assert.match(conPin.headers.get('content-type'), /image\/jpeg/);
});

test('lead manual no tiene foto (metodoCaptura manual, badge 404)', async () => {
  const lead = await json(await api('/api/leads', { method: 'POST', body: { nombre: 'Lead Manual', telefono: '5500112233' } }));
  assert.equal(lead.metodoCaptura, 'manual');
  assert.equal(lead.tieneFoto, false);
  const badge = await api(`/api/leads/${lead.id}/badge`, { pin: PIN });
  assert.equal(badge.status, 404);
});

test('rechaza foto con dataURL inválido (no guarda foto)', async () => {
  const lead = await json(await api('/api/leads', { method: 'POST', body: { nombre: 'Foto Mala', telefono: '5599887766', foto: 'no-es-una-imagen' } }));
  assert.equal(lead.tieneFoto, false);
});

// ---------- Landing pública y páginas legales ----------
test('las páginas públicas responden HTML (registro, legales, qr)', async () => {
  for (const ruta of ['/registro', '/terminos', '/aviso-privacidad', '/qr']) {
    const r = await fetch(BASE + ruta);
    assert.equal(r.status, 200, `ruta ${ruta}`);
    assert.match(r.headers.get('content-type'), /text\/html/, `ruta ${ruta}`);
  }
});

// ---------- Autoregistro (landing) ----------
test('autoregistro válido crea lead con fuente y consentimientos', async () => {
  const r = await api('/api/leads/registro', { method: 'POST', body: {
    nombre: 'Visitante QR', email: 'visitante.qr@correo.mx', telefono: '55 6677 8899',
    interes: 'Malla sombra', aceptaTerminos: true, aceptaPrivacidad: true,
  }});
  assert.equal(r.status, 201);
  assert.equal((await json(r)).ok, true);
  // Verifica en el listado (personal).
  const lista = await json(await api('/api/leads?q=visitante.qr', { pin: PIN }));
  const lead = lista.items[0];
  assert.equal(lead.fuente, 'Autoregistro (QR)');
  assert.equal(lead.metodoCaptura, 'autoregistro');
  assert.equal(lead.aceptaTerminos, true);
  assert.equal(lead.aceptaPrivacidad, true);
  assert.equal(lead.consentimiento, true);
});

test('autoregistro sin aceptar términos/privacidad es rechazado (400)', async () => {
  const r = await api('/api/leads/registro', { method: 'POST', body: {
    nombre: 'Sin Consentimiento', email: 'sc@correo.mx', telefono: '5511112222', aceptaTerminos: false, aceptaPrivacidad: true,
  }});
  assert.equal(r.status, 400);
});

test('autoregistro con correo inválido es rechazado (400)', async () => {
  const r = await api('/api/leads/registro', { method: 'POST', body: {
    nombre: 'Correo Malo', email: 'no-es-correo', telefono: '5511112222', aceptaTerminos: true, aceptaPrivacidad: true,
  }});
  assert.equal(r.status, 400);
});

test('autoregistro con celular de menos de 10 dígitos es rechazado (400)', async () => {
  const r = await api('/api/leads/registro', { method: 'POST', body: {
    nombre: 'Cel Corto', email: 'cc@correo.mx', telefono: '123', aceptaTerminos: true, aceptaPrivacidad: true,
  }});
  assert.equal(r.status, 400);
});

test('autoregistro con honeypot lleno es rechazado (400)', async () => {
  const r = await api('/api/leads/registro', { method: 'POST', body: {
    nombre: 'Bot', email: 'bot@correo.mx', telefono: '5511112222', website: 'http://spam', aceptaTerminos: true, aceptaPrivacidad: true,
  }});
  assert.equal(r.status, 400);
});

test('autoregistro duplicado responde amistoso (200, yaRegistrado)', async () => {
  const r = await api('/api/leads/registro', { method: 'POST', body: {
    nombre: 'Visitante QR Otra Vez', email: 'visitante.qr@correo.mx', telefono: '5500009999', aceptaTerminos: true, aceptaPrivacidad: true,
  }});
  assert.equal(r.status, 200);
  assert.equal((await json(r)).yaRegistrado, true);
});

test('el limitador de tasa del autoregistro devuelve 429 ante ráfagas', async () => {
  // Dispara muchas solicitudes (honeypot para no crear leads) y espera al menos un 429.
  let got429 = false;
  for (let i = 0; i < 75; i++) {
    const r = await api('/api/leads/registro', { method: 'POST', body: { website: 'x', nombre: 'r', email: 'r@r.mx', telefono: '5511112222', aceptaTerminos: true, aceptaPrivacidad: true } });
    if (r.status === 429) { got429 = true; break; }
  }
  assert.equal(got429, true);
});

// ---------- Administración del evento ----------
test('event/public devuelve la configuración pública', async () => {
  const e = await json(await api('/api/event/public'));
  assert.ok('premio' in e && 'dinamica' in e && 'fecha' in e && 'premioImagen' in e);
});

test('GET /api/event (completo) requiere PIN (401)', async () => {
  assert.equal((await api('/api/event')).status, 401);
});

test('PUT /api/event sin PIN es rechazado (401)', async () => {
  assert.equal((await api('/api/event', { method: 'PUT', body: { premio: 'x' } })).status, 401);
});

test('PUT /api/event con PIN actualiza los datos y se reflejan en público', async () => {
  const r = await api('/api/event', { method: 'PUT', pin: PIN, body: {
    tipo: 'Expo agrícola', premio: 'Rollo de malla antigranizo', dinamica: 'Regístrate y participa.',
    fecha: '2026-08-15', hora: '17:30', lugar: 'Centro de Convenciones', plazoContactoDias: '5',
  }});
  assert.equal(r.status, 200);
  const pub = await json(await api('/api/event/public'));
  assert.equal(pub.tipo, 'Expo agrícola');
  assert.equal(pub.premio, 'Rollo de malla antigranizo');
  assert.equal(pub.fecha, '2026-08-15');
  assert.equal(pub.plazoContactoDias, '5');
});

test('la imagen del premio se guarda y se sirve; luego se puede quitar', async () => {
  const up = await json(await api('/api/event', { method: 'PUT', pin: PIN, body: { premioImagen: JPEG_1PX } }));
  assert.equal(up.premioImagen, true);
  const img = await api('/api/event/premio-imagen', { pin: PIN });
  assert.equal(img.status, 200);
  assert.match(img.headers.get('content-type'), /image\/jpeg/);
  const del = await json(await api('/api/event', { method: 'PUT', pin: PIN, body: { premioImagen: false } }));
  assert.equal(del.premioImagen, false);
  assert.equal((await api('/api/event/premio-imagen')).status, 404);
});

// ---------- Rutas inexistentes ----------
test('ruta de API inexistente devuelve 404', async () => {
  assert.equal((await api('/api/no-existe')).status, 404);
});
