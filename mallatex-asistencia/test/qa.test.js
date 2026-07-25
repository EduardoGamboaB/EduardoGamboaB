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
