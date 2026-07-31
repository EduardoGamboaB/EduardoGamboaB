// Suite de QA — pruebas de integración de extremo a extremo sobre la API real.
// Levanta el servidor en un puerto de pruebas, con datos demo recién sembrados,
// y valida el flujo operativo completo: acceso, roles, catálogos, sincronización,
// revisión/corrección, incidencias, horas extra, cierre de periodo y exportación NOI.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_FILE = path.join(ROOT, 'data', 'db.json');
const PORT = process.env.QA_PORT || 3999;
const BASE = `http://localhost:${PORT}`;

let child;
const tokens = {};

function req(method, p, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(BASE + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
async function json(method, p, opts) { const r = await req(method, p, opts); return { status: r.status, data: await r.json().catch(() => null) }; }

before(async () => {
  // Datos limpios: el servidor siembra automáticamente al arrancar con base vacía
  if (fs.existsSync(DB_FILE)) fs.rmSync(DB_FILE);
  child = spawn('node', ['server/index.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  // Esperar readiness
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch {}
    await new Promise((res) => setTimeout(res, 250));
  }
  // Iniciar sesión con los tres roles
  for (const [role, email] of [['admin', 'admin@mallatex.mx'], ['contador', 'contabilidad@mallatex.mx'], ['nomina', 'nomina@mallatex.mx']]) {
    const { data } = await json('POST', '/api/auth/login', { body: { email, password: 'mallatex2026' } });
    tokens[role] = data.token;
  }
});

after(() => { if (child) child.kill('SIGKILL'); });

// ---------------------------------------------------------------------------

test('salud del servicio responde', async () => {
  const r = await fetch(BASE + '/api/health');
  const d = await r.json();
  assert.equal(d.ok, true);
});

test('producción: cabeceras de seguridad presentes', async () => {
  const r = await fetch(BASE + '/api/health');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.ok(r.headers.get('content-security-policy'), 'hay CSP');
  assert.ok(/camera=\(self\)/.test(r.headers.get('permissions-policy') || ''), 'permite cámara sólo en el sitio');
  assert.equal(r.headers.get('x-powered-by'), null, 'no expone x-powered-by');
});

test('producción: límite de intentos de acceso (429)', async () => {
  // Identificador único: no afecta a las cuentas reales.
  const body = { email: `bruteforce-${Date.now()}@test.mx`, password: 'x' };
  let sawTooMany = false;
  for (let i = 0; i < 20; i++) {
    const { status } = await json('POST', '/api/auth/login', { body });
    if (status === 429) { sawTooMany = true; break; }
  }
  assert.ok(sawTooMany, 'tras varios intentos fallidos responde 429');
});

test('acceso: credenciales válidas devuelven token y datos de usuario', async () => {
  assert.ok(tokens.admin && tokens.contador && tokens.nomina);
  const { data } = await json('GET', '/api/auth/me', { token: tokens.nomina });
  assert.equal(data.user.role, 'nomina');
  assert.equal(data.roleLabel, 'Responsable de nómina');
});

test('acceso: credenciales inválidas son rechazadas (401)', async () => {
  const { status } = await json('POST', '/api/auth/login', { body: { email: 'admin@mallatex.mx', password: 'incorrecta' } });
  assert.equal(status, 401);
});

test('seguridad: sin token responde 401', async () => {
  const { status } = await json('GET', '/api/employees');
  assert.equal(status, 401);
});

test('roles: nómina NO puede administrar usuarios (403)', async () => {
  const { status } = await json('GET', '/api/users', { token: tokens.nomina });
  assert.equal(status, 403);
});

test('roles: administrador SÍ puede listar usuarios', async () => {
  const { status, data } = await json('GET', '/api/users', { token: tokens.admin });
  assert.equal(status, 200);
  assert.ok(Array.isArray(data) && data.length >= 3);
  assert.ok(!('password' in data[0]), 'la contraseña no debe exponerse');
});

test('catálogo: hay 13 empleados demo mapeados a NOI', async () => {
  const { data } = await json('GET', '/api/employees?active=true', { token: tokens.nomina });
  assert.equal(data.length, 13);
  assert.ok(data.every((e) => e.noiKey), 'todo empleado tiene clave NOI');
});

test('empleados: alta, edición y baja (con validación)', async () => {
  // alta inválida
  const bad = await json('POST', '/api/employees', { token: tokens.contador, body: { name: 'Sin clave' } });
  assert.equal(bad.status, 400);
  // alta válida
  const { status, data: emp } = await json('POST', '/api/employees', { token: tokens.contador, body: { code: 'QA100', name: 'Empleado QA', department: 'Pruebas', dailySalary: 400 } });
  assert.equal(status, 201);
  // edición
  const upd = await json('PUT', `/api/employees/${emp.id}`, { token: tokens.contador, body: { position: 'Tester' } });
  assert.equal(upd.data.position, 'Tester');
  // baja
  const del = await json('DELETE', `/api/employees/${emp.id}`, { token: tokens.contador });
  assert.equal(del.status, 200);
});

test('horarios: existen turnos con reglas de tolerancia y retardo', async () => {
  const { data } = await json('GET', '/api/schedules', { token: tokens.nomina });
  assert.ok(data.length >= 3);
  assert.ok(data.every((s) => 'toleranceMinutes' in s && 'lateAfterMinutes' in s));
});

test('checador: sincronización idempotente no duplica el mismo rango', async () => {
  const dev = (await json('GET', '/api/devices', { token: tokens.nomina })).data[0];
  const r = await json('POST', `/api/devices/${dev.id}/sync`, { token: tokens.nomina, body: { startDate: '2026-07-01', endDate: '2026-07-22' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.createdCount, 0, 'el rango ya sincronizado no genera checadas nuevas');
});

test('asistencia: reproceso y clasificación por reglas', async () => {
  const rp = await json('POST', '/api/attendance/reprocess', { token: tokens.nomina, body: { start: '2026-07-01', end: '2026-07-22' } });
  assert.equal(rp.status, 200);
  assert.ok(rp.data.count > 0);
  const att = (await json('GET', '/api/attendance?start=2026-07-16&end=2026-07-22', { token: tokens.nomina })).data;
  assert.ok(att.length > 0);
  const estatuses = new Set(att.map((a) => a.status));
  assert.ok(estatuses.has('asistencia'), 'debe haber asistencias');
});

test('asistencia: corrección manual exige motivo y queda en bitácora', async () => {
  const att = (await json('GET', '/api/attendance?start=2026-07-16&end=2026-07-16', { token: tokens.nomina })).data;
  const row = att[0];
  // sin motivo → 400
  const noReason = await json('PUT', `/api/attendance/${row.id}`, { token: tokens.nomina, body: { status: 'justificada' } });
  assert.equal(noReason.status, 400);
  // con motivo → 200 y marcado como manual
  const ok = await json('PUT', `/api/attendance/${row.id}`, { token: tokens.nomina, body: { status: 'justificada', reason: 'QA: ajuste de prueba' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.manualStatus, true);
  // bitácora registra la corrección
  const audit = (await json('GET', '/api/audit?entity=attendance&action=correct', { token: tokens.admin })).data;
  assert.ok(audit.some((a) => (a.detail || '').includes('QA: ajuste de prueba')));
});

test('incidencias: alta pendiente y autorización refleja en asistencia', async () => {
  const emp = (await json('GET', '/api/employees?active=true', { token: tokens.nomina })).data[0];
  const created = await json('POST', '/api/incidents', { token: tokens.nomina, body: { employeeId: emp.id, type: 'permiso_goce', startDate: '2026-07-16', endDate: '2026-07-16', reason: 'QA permiso' } });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'pendiente');
  // nómina no puede autorizar (rol) — autoriza contador
  const auth = await json('POST', `/api/incidents/${created.data.id}/authorize`, { token: tokens.contador });
  assert.equal(auth.status, 200);
  assert.equal(auth.data.status, 'autorizada');
  // la asistencia de ese día ahora es permiso
  const att = (await json('GET', `/api/attendance?start=2026-07-16&end=2026-07-16&employeeId=${emp.id}`, { token: tokens.nomina })).data;
  assert.equal(att[0].status, 'permiso');
});

test('horas extra: autorización con horas ajustadas', async () => {
  const pend = (await json('GET', '/api/overtime?status=pendiente&start=2026-07-16&end=2026-07-31', { token: tokens.nomina })).data;
  assert.ok(pend.length > 0, 'debe haber tiempo extra por autorizar');
  const o = pend[0];
  const auth = await json('POST', `/api/overtime/${o.id}/authorize`, { token: tokens.contador, body: { authorizedMinutes: 60, type: 'ordinario' } });
  assert.equal(auth.status, 200);
  assert.equal(auth.data.status, 'autorizada');
  assert.equal(auth.data.authorizedMinutes, 60);
});

test('percepciones variables: catálogo demo y capturas del periodo', async () => {
  const concepts = (await json('GET', '/api/variable-concepts', { token: tokens.nomina })).data;
  assert.ok(concepts.find((c) => c.key === 'km_conductor' && c.modo === 'tarifa'), 'concepto de kilometraje');
  assert.ok(concepts.find((c) => c.key === 'costura_m2' && c.modo === 'tarifa'), 'concepto de costura por m²');
  assert.ok(concepts.find((c) => c.key === 'comision_ventas' && c.modo === 'porcentaje'), 'concepto de comisión');
  const entries = (await json('GET', '/api/variable-entries?periodId=2', { token: tokens.nomina })).data;
  assert.ok(entries.length >= 5, 'hay capturas demo del periodo');
  const comision = entries.find((e) => e.conceptKey === 'comision_ventas');
  assert.ok(comision && comision.importe > 0, 'la comisión tiene importe calculado');
});

test('percepciones variables: captura, override de tarifa y reflejo en NOI', async () => {
  const emp = (await json('GET', '/api/employees?active=true', { token: tokens.nomina })).data.find((e) => e.code === 'MTX013');
  const km = (await json('GET', '/api/variable-concepts', { token: tokens.nomina })).data.find((c) => c.key === 'km_conductor');
  // captura: 100 km × 2.5 = 250
  const created = await json('POST', '/api/variable-entries', { token: tokens.nomina, body: { periodId: 2, employeeId: emp.id, conceptId: km.id, cantidad: 100 } });
  assert.equal(created.status, 201);
  assert.equal(created.data.importe, 250);
  // edición con tarifa distinta (excepción por empleado): 100 km × 3 = 300
  const upd = await json('PUT', `/api/variable-entries/${created.data.id}`, { token: tokens.nomina, body: { rate: 3 } });
  assert.equal(upd.data.importe, 300);
  // aparece en la vista previa de movimientos NOI del periodo
  const prev = (await json('GET', '/api/periods/2/noi/preview', { token: tokens.contador })).data;
  assert.ok(prev.movements.some((m) => m.noiNumber === km.noiNumber && m.employeeId === emp.id), 'el movimiento variable llega a NOI');
  // limpieza para no alterar el resto del flujo
  const del = await json('DELETE', `/api/variable-entries/${created.data.id}`, { token: tokens.nomina });
  assert.equal(del.status, 200);
});

test('percepciones variables: un concepto con capturas no se elimina (409)', async () => {
  const inUse = (await json('GET', '/api/variable-concepts', { token: tokens.contador })).data.find((c) => c.key === 'comision_ventas');
  const del = await json('DELETE', `/api/variable-concepts/${inUse.id}`, { token: tokens.contador });
  assert.equal(del.status, 409);
});

test('percepciones variables: fuentes de datos y sincronización simulada (upsert)', async () => {
  const sources = (await json('GET', '/api/variable-sources', { token: tokens.nomina })).data;
  for (const id of ['g3', 'mes', 'aspel']) assert.ok(sources.find((s) => s.id === id && s.external), `fuente ${id}`);
  // sincroniza G3 (kilometraje, área Reparto → MTX013)
  const r = await json('POST', '/api/variable-sync', { token: tokens.nomina, body: { source: 'g3', periodId: 2 } });
  assert.equal(r.status, 200);
  assert.ok(r.data.created + r.data.updated >= 1, 'sincroniza al menos una lectura');
  const g3Count = () => (json('GET', '/api/variable-entries?periodId=2', { token: tokens.nomina }).then((x) => x.data.filter((e) => e.source === 'g3').length));
  const before = await g3Count();
  assert.ok(before >= 1, 'hay capturas con origen G3');
  // re-sincronizar no duplica (upsert por externalId)
  await json('POST', '/api/variable-sync', { token: tokens.nomina, body: { source: 'g3', periodId: 2 } });
  assert.equal(await g3Count(), before, 're-sincronizar no duplica');
});

test('periodo: no se cierra con pendientes salvo forzado', async () => {
  const blocked = await json('POST', '/api/periods/2/close', { token: tokens.contador, body: {} });
  assert.equal(blocked.status, 409);
  assert.ok(blocked.data.pending);
});

test('NOI: exportación bloqueada con pendientes (409)', async () => {
  const r = await req('GET', '/api/periods/2/noi/export?format=txt', { token: tokens.contador });
  assert.equal(r.status, 409);
});

test('flujo completo: autorizar todo, cerrar y exportar NOI', async () => {
  // autorizar incidencias pendientes
  for (const i of (await json('GET', '/api/incidents?status=pendiente', { token: tokens.contador })).data) {
    await json('POST', `/api/incidents/${i.id}/authorize`, { token: tokens.contador });
  }
  // autorizar horas extra pendientes del periodo
  for (const o of (await json('GET', '/api/overtime?status=pendiente&start=2026-07-16&end=2026-07-31', { token: tokens.contador })).data) {
    await json('POST', `/api/overtime/${o.id}/authorize`, { token: tokens.contador, body: {} });
  }
  // cerrar
  const close = await json('POST', '/api/periods/2/close', { token: tokens.contador, body: {} });
  assert.equal(close.status, 200);
  assert.equal(close.data.status, 'cerrado');
  // corrección bloqueada en periodo cerrado
  const att = (await json('GET', '/api/attendance?start=2026-07-16&end=2026-07-16', { token: tokens.nomina })).data;
  const locked = await json('PUT', `/api/attendance/${att[0].id}`, { token: tokens.nomina, body: { status: 'falta', reason: 'x' } });
  assert.equal(locked.status, 409);
  // exportar TXT
  const exp = await req('GET', '/api/periods/2/noi/export?format=txt', { token: tokens.contador });
  assert.equal(exp.status, 200);
  const body = await exp.text();
  assert.match(body, /CLAVE\|CONCEPTO\|TIPO/);
  assert.match(body, /MTX\d+\|\d+\|[PDI]\|/);
});

test('NOI: los conceptos están mapeados y son configurables', async () => {
  const concepts = (await json('GET', '/api/noi/concepts', { token: tokens.contador })).data;
  assert.ok(concepts.find((c) => c.key === 'falta' && c.tipo === 'D'));
  assert.ok(concepts.find((c) => c.key === 'bono_puntualidad' && c.tipo === 'P'));
});

test('percepciones variables: periodo cerrado rechaza captura (409)', async () => {
  // El periodo 2 quedó cerrado por el flujo completo anterior.
  const km = (await json('GET', '/api/variable-concepts', { token: tokens.nomina })).data.find((c) => c.key === 'km_conductor');
  const emp = (await json('GET', '/api/employees?active=true', { token: tokens.nomina })).data[0];
  const r = await json('POST', '/api/variable-entries', { token: tokens.nomina, body: { periodId: 2, employeeId: emp.id, conceptId: km.id, cantidad: 50 } });
  assert.equal(r.status, 409);
});

test('campo: catálogo de sitios con geocerca (admin)', async () => {
  const sites = (await json('GET', '/api/sites', { token: tokens.contador })).data;
  assert.ok(sites.length >= 3, 'hay sitios sembrados');
  assert.ok(sites.find((s) => s.name === 'Obra Norte' && s.radiusMeters > 0));
});

test('campo: check-in de empleado con geocerca dentro y fuera', async () => {
  const login = await json('POST', '/api/auth/login', { body: { code: 'MTX013', pin: '1234' } });
  assert.equal(login.status, 200, 'el empleado de campo inicia sesión');
  const et = login.data.token;
  const sites = (await json('GET', '/api/field/sites', { token: et })).data;
  const obra = sites.find((s) => s.name === 'Obra Norte');
  assert.ok(obra, 'el empleado ve sus sitios permitidos');
  // Dentro de la geocerca
  const inside = await json('POST', '/api/field/checkin', { token: et, body: { siteId: obra.id, lat: obra.lat, lng: obra.lng, type: 'entrada' } });
  assert.equal(inside.status, 201);
  assert.equal(inside.data.withinGeofence, true);
  assert.equal(inside.data.distanceMeters, 0);
  assert.equal(inside.data.type, 'entrada');
  // Fuera de la geocerca → se registra pero se marca la bandera
  const outside = await json('POST', '/api/field/checkin', { token: et, body: { siteId: obra.id, lat: 20.0, lng: -103.0, type: 'salida' } });
  assert.equal(outside.status, 201);
  assert.equal(outside.data.withinGeofence, false);
  assert.ok(outside.data.distanceMeters > 1000);
  assert.ok(outside.data.flags.includes('fuera_de_geocerca'));
  // Queda registrado como checada de campo
  const mine = (await json('GET', '/api/field/checkins', { token: et })).data;
  assert.ok(mine.length >= 2);
});

test('campo: exige ubicación y es sólo para empleados', async () => {
  const login = await json('POST', '/api/auth/login', { body: { code: 'MTX013', pin: '1234' } });
  const et = login.data.token;
  const noLoc = await json('POST', '/api/field/checkin', { token: et, body: { type: 'entrada' } });
  assert.equal(noLoc.status, 400);
  // Un administrativo NO puede usar el endpoint de campo (es del portal del empleado)
  const asAdmin = await json('POST', '/api/field/checkin', { token: tokens.contador, body: { lat: 20, lng: -103 } });
  assert.equal(asAdmin.status, 403);
});

test('CRM ventas: cartera, ruta, visita y desempeño del vendedor', async () => {
  const login = await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } });
  assert.equal(login.status, 200);
  const et = login.data.token;
  const clients = (await json('GET', '/api/sales/my-clients', { token: et })).data;
  assert.ok(clients.length >= 2, 'el vendedor tiene cartera asignada');
  // alta de prospecto en campo
  const prospect = await json('POST', '/api/sales/clients', { token: et, body: { name: 'Prospecto QA', cultivo: 'Tomate' } });
  assert.equal(prospect.status, 201);
  assert.ok(prospect.data.assignedTo, 'el prospecto queda asignado al vendedor');
  // inicia ruta
  const route = await json('POST', '/api/sales/routes/start', { token: et, body: { lat: 20.68, lng: -103.42 } });
  assert.equal(route.status, 201);
  // registra visita con evidencia, estatus y tipo
  const visit = await json('POST', '/api/sales/visits', { token: et, body: { clientId: clients[0].id, routeId: route.data.id, type: 'seguimiento', status: 'realizada', found: true, lat: 20.68, lng: -103.42, notes: 'QA', photos: ['data:image/png;base64,AAAA'] } });
  assert.equal(visit.status, 201);
  assert.equal(visit.data.type, 'seguimiento');
  // agrega puntos al recorrido
  const track = await json('POST', `/api/sales/routes/${route.data.id}/track`, { token: et, body: { points: [{ lat: 20.69, lng: -103.43 }, { lat: 20.70, lng: -103.44 }] } });
  assert.ok(track.data.points >= 3);
  // desempeño (objetivo del trimestre)
  const perf = (await json('GET', '/api/sales/objectives/me', { token: et })).data;
  assert.ok(perf.objective && perf.objective.targetAmount > 0);
  assert.ok(perf.progressPct > 0 && perf.kpis.cartera >= 2);
  // finaliza ruta
  const end = await json('POST', `/api/sales/routes/${route.data.id}/end`, { token: et });
  assert.equal(end.data.status, 'finalizada');
});

test('CRM ventas: inventario, cotización y pedido', async () => {
  const et = (await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } })).data.token;
  const products = (await json('GET', '/api/sales/products', { token: et })).data;
  assert.ok(products.length >= 5 && products[0].price > 0, 'hay inventario');
  const client = (await json('GET', '/api/sales/my-clients', { token: et })).data[0];
  const quote = await json('POST', '/api/sales/quotes', { token: et, body: { clientId: client.id, items: [{ productId: products[0].id, qty: 100 }, { productId: products[1].id, qty: 50, discount: 10 }] } });
  assert.equal(quote.status, 201);
  assert.ok(quote.data.total > 0 && quote.data.folio.startsWith('COT-'));
  const order = await json('POST', '/api/sales/orders', { token: et, body: { quoteId: quote.data.id } });
  assert.equal(order.status, 201);
  assert.ok(order.data.folio.startsWith('PED-'));
  assert.equal(order.data.total, quote.data.total);
  const quotes = (await json('GET', '/api/sales/quotes', { token: et })).data;
  assert.equal(quotes.find((q) => q.id === quote.data.id).status, 'convertida');
});

test('CRM ventas: asistente técnico recomienda malla', async () => {
  const et = (await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } })).data.token;
  const granizo = (await json('POST', '/api/sales/advisor', { token: et, body: { cultivo: 'Manzana', clima: 'templado', objetivo: 'granizo' } })).data;
  assert.equal(granizo.category, 'antigranizo');
  assert.ok(granizo.recommendation && granizo.recommendation.sku);
  const sombra = (await json('POST', '/api/sales/advisor', { token: et, body: { cultivo: 'vivero ornamental', clima: 'caluroso' } })).data;
  assert.equal(sombra.category, 'sombra');
  assert.ok(sombra.shadePct, 'sugiere porcentaje de sombreo');
});

test('CRM ventas: el gerente asigna cartera; el vendedor no accede a la admin', async () => {
  const c = await json('POST', '/api/crm/clients', { token: tokens.contador, body: { name: 'Cliente Central QA', type: 'cliente' } });
  assert.equal(c.status, 201);
  const emp = (await json('GET', '/api/employees?active=true', { token: tokens.contador })).data.find((e) => e.code === 'MTX010');
  const assign = await json('POST', '/api/crm/assign', { token: tokens.contador, body: { employeeId: emp.id, clientIds: [c.data.id] } });
  assert.equal(assign.data.assigned, 1);
  // seguridad: la administración de CRM es sólo para personal administrativo
  const vendorToken = (await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } })).data.token;
  const denied = await json('GET', '/api/crm/clients', { token: vendorToken });
  assert.equal(denied.status, 403);
});

test('Administrativo: el vendedor solicita viáticos y el gerente los aprueba', async () => {
  const et = (await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } })).data.token;
  const req = await json('POST', '/api/sales/expense-requests', { token: et, body: { concept: 'Viaje QA', destination: 'León', amount: 3000, fromDate: '2026-08-01', toDate: '2026-08-02' } });
  assert.equal(req.status, 201);
  assert.ok(/^VIA-\d{5}$/.test(req.data.folio), 'genera folio VIA');
  assert.equal(req.data.status, 'solicitado');
  // el gerente ve la solicitud y la aprueba
  const pending = (await json('GET', '/api/crm/expense-requests?status=solicitado', { token: tokens.contador })).data;
  assert.ok(pending.find((r) => r.id === req.data.id));
  const dec = await json('POST', `/api/crm/expense-requests/${req.data.id}/decision`, { token: tokens.contador, body: { decision: 'aprobado', note: 'OK' } });
  assert.equal(dec.data.status, 'aprobado');
});

test('Administrativo: comprobación de gastos con evidencia y aprobación', async () => {
  const et = (await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } })).data.token;
  const gto = await json('POST', '/api/sales/expenses', { token: et, body: { category: 'alimentos', merchant: 'Rest. QA', amount: 480.5, hasInvoice: false, photo: 'data:image/png;base64,AAAA' } });
  assert.equal(gto.status, 201);
  assert.ok(/^GTO-\d{5}$/.test(gto.data.folio));
  assert.equal(gto.data.hasPhoto, true);
  assert.equal(gto.data.photo, undefined, 'no expone la imagen en la lista');
  // el gerente consulta la evidencia y aprueba
  const photo = (await json('GET', `/api/crm/expenses/${gto.data.id}/photo`, { token: tokens.contador })).data;
  assert.ok(photo.photo && photo.photo.startsWith('data:image'), 'la evidencia es recuperable por el gerente');
  const dec = await json('POST', `/api/crm/expenses/${gto.data.id}/decision`, { token: tokens.contador, body: { decision: 'aprobado' } });
  assert.equal(dec.data.status, 'aprobado');
});

test('Administrativo: solicitud de factura desde pedido y emisión (Aspel)', async () => {
  const et = (await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } })).data.token;
  const products = (await json('GET', '/api/sales/products', { token: et })).data;
  const client = (await json('GET', '/api/sales/my-clients', { token: et })).data[0];
  const order = await json('POST', '/api/sales/orders', { token: et, body: { clientId: client.id, items: [{ productId: products[0].id, qty: 30 }] } });
  const inv = await json('POST', '/api/sales/invoices', { token: et, body: { orderId: order.data.id, rfc: 'XAXX010101000', razonSocial: 'Cliente QA', usoCfdi: 'G03' } });
  assert.equal(inv.status, 201);
  assert.ok(/^FAC-\d{5}$/.test(inv.data.folio));
  assert.equal(inv.data.amount, order.data.total, 'hereda el importe del pedido');
  assert.equal(inv.data.status, 'solicitada');
  // sin RFC se rechaza
  const bad = await json('POST', '/api/sales/invoices', { token: et, body: { orderId: order.data.id } });
  assert.equal(bad.status, 400);
  // el gerente emite el CFDI (punto de integración Aspel)
  const emit = await json('POST', `/api/crm/invoices/${inv.data.id}/emit`, { token: tokens.contador, body: {} });
  assert.equal(emit.data.status, 'emitida');
  assert.ok(emit.data.uuid, 'asigna UUID al timbrar');
  // no se puede emitir dos veces
  const again = await json('POST', `/api/crm/invoices/${inv.data.id}/emit`, { token: tokens.contador, body: {} });
  assert.equal(again.status, 409);
});

test('Integraciones: estado de conectores (mock por defecto)', async () => {
  const st = (await json('GET', '/api/crm/integrations/status', { token: tokens.contador })).data;
  for (const id of ['g3', 'mes', 'aspel']) assert.ok(st.find((s) => s.id === id && s.mode === 'mock'), `conector ${id} en mock`);
});

test('Integraciones: timbrado Aspel genera UUID con formato CFDI', async () => {
  const et = (await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } })).data.token;
  const inv = await json('POST', '/api/sales/invoices', { token: et, body: { rfc: 'XAXX010101000', amount: 5000 } });
  const emit = await json('POST', `/api/crm/invoices/${inv.data.id}/emit`, { token: tokens.contador, body: {} });
  assert.equal(emit.data.timbreMode, 'mock');
  assert.match(emit.data.uuid, /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/, 'UUID con formato CFDI');
});

test('Integraciones: webhook de pago Aspel marca pagada y genera comisión', async () => {
  const et = (await json('POST', '/api/auth/login', { body: { code: 'MTX006', pin: '1234' } })).data.token;
  const emp = (await json('GET', '/api/employees?active=true', { token: tokens.contador })).data.find((e) => e.code === 'MTX006');
  // la comisión se contabiliza en el periodo ABIERTO en que cae el pago
  const period = (await json('POST', '/api/periods', { token: tokens.contador, body: { name: 'Periodo comisión QA', startDate: '2026-08-01', endDate: '2026-08-15' } })).data;
  const inv = await json('POST', '/api/sales/invoices', { token: et, body: { rfc: 'XAXX010101000', amount: 100000 } });
  await json('POST', `/api/crm/invoices/${inv.data.id}/emit`, { token: tokens.contador, body: {} });
  // Aspel confirma el pago (webhook sin sesión; en pruebas no hay secreto configurado)
  const pay = await json('POST', '/api/integrations/aspel/payment', { token: null, body: { invoiceId: inv.data.id, amount: 100000, paymentRef: 'PAGO-QA-1' } });
  assert.equal(pay.status, 200);
  assert.equal(pay.data.invoice.status, 'pagada');
  assert.equal(pay.data.commission.status, 'creada');
  assert.equal(pay.data.commission.importe, 3000, 'comisión = 3% de 100,000');
  assert.equal(pay.data.commission.periodId, period.id, 'se contabiliza en el periodo abierto');
  // la comisión aparece como percepción variable del vendedor con origen aspel
  const entries = (await json('GET', `/api/variable-entries?periodId=${period.id}`, { token: tokens.contador })).data;
  const entry = entries.find((v) => v.externalId === `aspel-invoice-${inv.data.id}`);
  assert.ok(entry && entry.employeeId === emp.id && entry.source === 'aspel', 'comisión asignada al vendedor');
  // idempotente: re-notificar el pago no duplica
  const again = await json('POST', '/api/integrations/aspel/payment', { token: null, body: { invoiceId: inv.data.id, amount: 100000 } });
  assert.equal(again.data.commission.status, 'actualizada');
  const entries2 = (await json('GET', `/api/variable-entries?periodId=${period.id}`, { token: tokens.contador })).data;
  assert.equal(entries2.filter((v) => v.externalId === `aspel-invoice-${inv.data.id}`).length, 1, 'no duplica la comisión');
});

test('Integraciones: webhook con factura inexistente responde 404', async () => {
  const r = await json('POST', '/api/integrations/aspel/payment', { token: null, body: { invoiceId: 999999, amount: 10 } });
  assert.equal(r.status, 404);
});
