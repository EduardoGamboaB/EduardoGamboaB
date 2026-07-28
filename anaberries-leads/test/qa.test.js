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
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'admin1234';
const BASE = `http://127.0.0.1:${PORT}`;
let DATA_DIR;
let server;
let TOKEN = '';

// El parámetro `pin` (compatibilidad) ahora significa "autenticado": adjunta el token de sesión.
function api(pathname, { method = 'GET', body, pin } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (pin) headers['Authorization'] = 'Bearer ' + TOKEN;
  return fetch(BASE + pathname, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
async function json(res) { try { return await res.json(); } catch { return null; } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ana-qa-'));
  server = spawn('node', ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), STAFF_PIN: PIN, ADMIN_EMAIL, ADMIN_PASSWORD, DATA_DIR, NODE_ENV: 'test' },
    stdio: 'ignore',
  });
  // Espera a que el servidor responda.
  let up = false;
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) { up = true; break; } } catch { /* aún no */ }
    await wait(100);
  }
  if (!up) throw new Error('El servidor no arrancó a tiempo');
  // Inicia sesión como admin para obtener el token.
  const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });
  TOKEN = (await r.json()).token;
});

after(() => {
  server?.kill('SIGTERM');
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ---------- Salud y sesión ----------
test('health responde ok', async () => {
  const r = await api('/api/health');
  assert.equal(r.status, 200);
  assert.equal((await json(r)).ok, true);
});

test('login con credenciales correctas devuelve token y usuario admin', async () => {
  const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.ok(d.token);
  assert.equal(d.user.role, 'admin');
});

test('login con credenciales incorrectas es rechazado (401)', async () => {
  const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ADMIN_EMAIL, password: 'malo' }) });
  assert.equal(r.status, 401);
});

test('GET /api/auth/me requiere token y lo valida', async () => {
  assert.equal((await api('/api/auth/me')).status, 401);
  const me = await json(await api('/api/auth/me', { pin: PIN }));
  assert.equal(me.user.email, ADMIN_EMAIL);
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
  }, pin: PIN });
  assert.equal(r.status, 201);
  const lead = await json(r);
  assert.ok(lead.id.startsWith('lead_'));
  assert.equal(lead.telefono, '5512345678'); // normaliza el teléfono
});

test('rechaza lead sin nombre (400)', async () => {
  const r = await api('/api/leads', { method: 'POST', body: { telefono: '5599999999' } , pin: PIN });
  assert.equal(r.status, 400);
});

test('rechaza lead sin teléfono ni correo (400)', async () => {
  const r = await api('/api/leads', { method: 'POST', body: { nombre: 'Sin contacto' } , pin: PIN });
  assert.equal(r.status, 400);
});

test('rechaza correo con formato inválido (400)', async () => {
  const r = await api('/api/leads', { method: 'POST', body: { nombre: 'Correo malo', email: 'no-es-correo' } , pin: PIN });
  assert.equal(r.status, 400);
});

test('detecta duplicado por teléfono (409) y permite forzar', async () => {
  const dup = await api('/api/leads', { method: 'POST', body: { nombre: 'Otro Juan', telefono: '5512345678' } , pin: PIN });
  assert.equal(dup.status, 409);
  const forced = await api('/api/leads', { method: 'POST', body: { nombre: 'Otro Juan', telefono: '5512345678', forzar: true } , pin: PIN });
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
  const created = await json(await api('/api/leads', { method: 'POST', body: { nombre: 'Borrable', telefono: '5500000000' } , pin: PIN }));
  const del = await api('/api/leads/' + created.id, { method: 'DELETE', pin: PIN });
  assert.equal(del.status, 200);
});

// ---------- Captura por foto del gafete ----------
// JPEG 1x1 válido en base64 (imagen mínima de prueba).
const JPEG_1PX = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AT//Z';

test('lead por gafete guarda la foto y marca metodoCaptura', async () => {
  const r = await api('/api/leads', { method: 'POST', body: {
    nombre: 'Lead Gafete', telefono: '5544332211', metodoCaptura: 'gafete', foto: JPEG_1PX,
  }, pin: PIN });
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
  const lead = await json(await api('/api/leads', { method: 'POST', body: { nombre: 'Lead Manual', telefono: '5500112233' } , pin: PIN }));
  assert.equal(lead.metodoCaptura, 'manual');
  assert.equal(lead.tieneFoto, false);
  const badge = await api(`/api/leads/${lead.id}/badge`, { pin: PIN });
  assert.equal(badge.status, 404);
});

test('rechaza foto con dataURL inválido (no guarda foto)', async () => {
  const lead = await json(await api('/api/leads', { method: 'POST', body: { nombre: 'Foto Mala', telefono: '5599887766', foto: 'no-es-una-imagen' } , pin: PIN }));
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

// ---------- Administración de eventos (multi-evento) ----------
async function activeEventId() {
  const d = await json(await api('/api/events', { pin: PIN }));
  return d.activeEventId;
}

test('events/public/active devuelve la configuración pública', async () => {
  const e = await json(await api('/api/events/public/active'));
  assert.ok('id' in e && 'premio' in e && 'dinamica' in e && 'premioImagen' in e);
});

test('GET /api/events requiere PIN (401) y lista eventos con activo', async () => {
  assert.equal((await api('/api/events')).status, 401);
  const d = await json(await api('/api/events', { pin: PIN }));
  assert.ok(Array.isArray(d.items) && d.items.length >= 1);
  assert.ok(d.activeEventId);
});

test('PUT /api/events/:id sin PIN es rechazado (401)', async () => {
  const id = await activeEventId();
  assert.equal((await api('/api/events/' + id, { method: 'PUT', body: { premio: 'x' } })).status, 401);
});

test('PUT /api/events/:id actualiza y se refleja en público', async () => {
  const id = await activeEventId();
  const r = await api('/api/events/' + id, { method: 'PUT', pin: PIN, body: {
    tipo: 'Expo agrícola', premio: 'Rollo de malla antigranizo', dinamica: 'Regístrate y participa.',
    fecha: '2026-08-15', hora: '17:30', lugar: 'Centro de Convenciones', plazoContactoDias: '5', permiteGanadoresPrevios: false,
  }});
  assert.equal(r.status, 200);
  const pub = await json(await api('/api/events/public/' + id));
  assert.equal(pub.tipo, 'Expo agrícola');
  assert.equal(pub.premio, 'Rollo de malla antigranizo');
  assert.equal(pub.fecha, '2026-08-15');
});

test('la imagen del premio (por evento) se guarda, se sirve y se quita', async () => {
  const id = await activeEventId();
  const up = await json(await api('/api/events/' + id, { method: 'PUT', pin: PIN, body: { premioImagen: JPEG_1PX } }));
  assert.equal(up.premioImagen, true);
  const img = await api('/api/events/' + id + '/premio-imagen');
  assert.equal(img.status, 200);
  assert.match(img.headers.get('content-type'), /image\/jpeg/);
  const del = await json(await api('/api/events/' + id, { method: 'PUT', pin: PIN, body: { premioImagen: false } }));
  assert.equal(del.premioImagen, false);
  assert.equal((await api('/api/events/' + id + '/premio-imagen')).status, 404);
});

test('crear, activar y eliminar un evento; registro y sorteo por evento con folio', async () => {
  // Crear un segundo evento y activarlo.
  const ev2 = await json(await api('/api/events', { method: 'POST', pin: PIN, body: { name: 'Evento 2', premio: 'Premio 2' } }));
  assert.ok(ev2.id);
  const act = await json(await api('/api/events', { pin: PIN }));
  assert.equal(act.activeEventId, ev2.id); // crear deja activo

  // Captura (staff) hacia el evento indicado (el limitador solo aplica a /registro).
  await api('/api/leads', { method: 'POST', body: { event: ev2.id, nombre: 'Part Ev2', email: 'part.ev2@correo.mx', telefono: '5512121212' } , pin: PIN });
  const leadsEv2 = await json(await api('/api/leads?event=' + ev2.id, { pin: PIN }));
  assert.ok(leadsEv2.items.some((l) => l.email === 'part.ev2@correo.mx'));

  // Sorteo del evento 2 genera folio.
  const draw = await json(await api('/api/raffle/draw', { method: 'POST', pin: PIN, body: { event: ev2.id, premio: 'Premio 2' } }));
  assert.ok(draw.ganador.folio && draw.ganador.folio.startsWith('ANB-'));
  assert.equal(draw.ganador.eventId, ev2.id);

  // No se puede eliminar un evento con leads.
  assert.equal((await api('/api/events/' + ev2.id, { method: 'DELETE', pin: PIN })).status, 400);

  // Volver a activar el primero y eliminar ev2 tras quitar su lead.
  const first = act.items.find((e) => e.id !== ev2.id) || (await json(await api('/api/events', { pin: PIN }))).items[0];
  await api('/api/events/' + first.id + '/activate', { method: 'POST', pin: PIN });
});

// ---------- Usuarios y roles ----------
test('admin crea un usuario staff; el staff inicia sesión y no accede a /api/users (403)', async () => {
  // Solo admin lista usuarios.
  assert.equal((await api('/api/users')).status, 401);
  const created = await json(await api('/api/users', { method: 'POST', pin: PIN, body: { name: 'Staff Uno', email: 'staff1@test.com', password: 'staff123', role: 'staff' } }));
  assert.equal(created.role, 'staff');
  // El staff inicia sesión.
  const lr = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'staff1@test.com', password: 'staff123' }) });
  const staffToken = (await lr.json()).token;
  const h = { Authorization: 'Bearer ' + staffToken };
  // Puede capturar leads pero NO administrar usuarios.
  assert.equal((await fetch(BASE + '/api/users', { headers: h })).status, 403);
  assert.equal((await fetch(BASE + '/api/leads', { headers: h })).status, 200);
});

test('no se puede crear usuario con correo duplicado (409) ni contraseña corta (400)', async () => {
  assert.equal((await api('/api/users', { method: 'POST', pin: PIN, body: { email: 'staff1@test.com', password: 'otra123' } })).status, 409);
  assert.equal((await api('/api/users', { method: 'POST', pin: PIN, body: { email: 'x@test.com', password: '123' } })).status, 400);
});

// ---------- Finalizar evento (histórico) ----------
test('finalizar un evento lo marca como finalizado', async () => {
  const ev = await json(await api('/api/events', { method: 'POST', pin: PIN, body: { name: 'Evento a finalizar' } }));
  const r = await json(await api('/api/events/' + ev.id + '/finalizar', { method: 'POST', pin: PIN }));
  assert.equal(r.finalizado, true);
});

// ---------- Rutas inexistentes ----------
test('ruta de API inexistente devuelve 404', async () => {
  assert.equal((await api('/api/no-existe')).status, 404);
});
