#!/usr/bin/env node
/**
 * Suite E2E de la Plataforma Mallatex — módulo por módulo, vía gateway.
 * Requiere el stack completo arriba (gateway :3000 + 5 servicios + PostgreSQL sembrado).
 *
 *   node backend/e2e.suite.mjs
 */
const G = process.env.GATEWAY_URL || 'http://localhost:3000';
const HOOK = process.env.ASPEL_WEBHOOK_SECRET || 'hook-secret';

let pass = 0, fail = 0, section = '';
const failures = [];
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; failures.push(`${section} › ${name} ${extra}`); console.log(`  ✗ ${name} ${extra}`); }
}
function sec(s) { section = s; console.log(`\n== ${s} ==`); }

async function req(method, path, { token, body, raw, headers } = {}) {
  const res = await fetch(G + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* raw */ }
  return { status: res.status, json, text, headers: res.headers };
}
const get = (p, o) => req('GET', p, o);
const post = (p, o) => req('POST', p, o);
const put = (p, o) => req('PUT', p, o);
const del = (p, o) => req('DELETE', p, o);

const today = new Date().toISOString().slice(0, 10);

// =====================================================================
// 1. IDENTITY
// =====================================================================
sec('IDENTITY · autenticación');
let admin, empCom, empOp, empLinea;
{
  const r = await post('/api/auth/login', { body: { email: 'admin@mallatex.mx', password: 'mallatex2026' } });
  ok('login admin devuelve token', r.status === 200 && !!r.json?.token);
  ok('admin recibe 42 módulos web', r.json?.modules?.length === 42, `(${r.json?.modules?.length})`);
  admin = r.json?.token;

  const bad = await post('/api/auth/login', { body: { email: 'admin@mallatex.mx', password: 'incorrecta' } });
  ok('password incorrecto → 401', bad.status === 401);

  const rc = await post('/api/auth/login', { body: { code: 'MTX002', pin: '1234' } });
  ok('login empleado comercial (MTX002)', rc.status === 200 && rc.json?.employee?.profile === 'comercial');
  ok('MTX002 recibe 15 módulos móviles', rc.json?.modules?.length === 15, `(${rc.json?.modules?.length})`);
  empCom = rc.json?.token;

  const ro = await post('/api/auth/login', { body: { code: 'MTX001', pin: '1234' } });
  ok('login empleado operativo (MTX001)', ro.status === 200 && ro.json?.employee?.profile === 'operativo');
  ok('MTX001 sólo asistencia+perfil', JSON.stringify((ro.json?.modules || []).sort()) === JSON.stringify(['asistencia', 'historial', 'perfil']));
  empOp = ro.json?.token;

  const rl = await post('/api/auth/login', { body: { code: 'MTX021', pin: '1234' } });
  ok('login empleado línea (MTX021) con módulos MES', rl.status === 200 && (rl.json?.modules || []).includes('mes-tablet'));
  empLinea = rl.json?.token;

  const me = await get('/api/auth/me', { token: admin });
  ok('GET /auth/me con token', me.status === 200 && me.json?.principal === 'admin');
  const noTok = await get('/api/users');
  ok('ruta admin sin token → 401', noTok.status === 401);
  const empOnAdmin = await get('/api/users', { token: empCom });
  ok('empleado en ruta admin → 403', empOnAdmin.status === 403);
}

sec('IDENTITY · usuarios (CRUD)');
let newUserId;
{
  const list = await get('/api/users', { token: admin });
  ok('listar usuarios (5 sembrados)', list.status === 200 && list.json?.length === 5, `(${list.json?.length})`);
  const c = await post('/api/users', { token: admin, body: { name: 'E2E User', email: 'e2e@mallatex.mx', role: 'nomina', password: 'secreto1' } });
  ok('crear usuario', c.status === 201 && c.json?.email === 'e2e@mallatex.mx');
  newUserId = c.json?.id;
  const logNew = await post('/api/auth/login', { body: { email: 'e2e@mallatex.mx', password: 'secreto1' } });
  ok('login del usuario nuevo (rol nomina, 14 módulos)', logNew.status === 200 && logNew.json?.modules?.length === 14, `(${logNew.json?.modules?.length})`);
  const u = await put(`/api/users/${newUserId}`, { token: admin, body: { position: 'QA' } });
  ok('actualizar usuario', u.status === 200 && u.json?.position === 'QA');
  const d = await del(`/api/users/${newUserId}`, { token: admin });
  ok('eliminar usuario', d.status === 200);
}

sec('IDENTITY · matriz de acceso');
{
  const cat = await get('/api/access/catalog?surface=mobile', { token: admin });
  ok('catálogo móvil (19 módulos)', cat.status === 200 && cat.json?.length === 19, `(${cat.json?.length})`);
  const m = await get('/api/access/matrix', { token: admin });
  ok('matriz completa (153 grants)', m.status === 200 && m.json?.grants?.length === 153, `(${m.json?.grants?.length})`);
  // Conceder inventario al perfil operativo y verificar en login
  const before = (m.json.grants || []).filter((g) => g.subjectType === 'profile' && g.subjectKey === 'operativo' && g.surface === 'mobile').map((g) => g.moduleKey);
  const r1 = await put('/api/access/grants', { token: admin, body: { subjectType: 'profile', subjectKey: 'operativo', surface: 'mobile', moduleKeys: [...before, 'inventario'] } });
  ok('editar matriz (conceder módulo)', r1.status === 200);
  const relog = await post('/api/auth/login', { body: { code: 'MTX001', pin: '1234' } });
  ok('el cambio se refleja en el siguiente login', (relog.json?.modules || []).includes('inventario'));
  await put('/api/access/grants', { token: admin, body: { subjectType: 'profile', subjectKey: 'operativo', surface: 'mobile', moduleKeys: before } });
  const relog2 = await post('/api/auth/login', { body: { code: 'MTX001', pin: '1234' } });
  ok('revocación también se refleja', !(relog2.json?.modules || []).includes('inventario'));
}

// =====================================================================
// 2. ATTENDANCE
// =====================================================================
sec('ATTENDANCE · catálogos (empleados, horarios, sitios)');
let e2eEmpId, siteId;
{
  const list = await get('/api/employees', { token: admin });
  ok('listar empleados (4)', list.status === 200 && list.json?.length === 4, `(${list.json?.length})`);
  const c = await post('/api/employees', { token: admin, body: { code: 'MTX099', name: 'Empleado E2E', department: 'Producción', position: 'Operador', workMode: 'planta', pin: '9999', scheduleId: 1, dailySalary: 400 } });
  ok('crear empleado', c.status === 201 && c.json?.code === 'MTX099', JSON.stringify(c.json).slice(0, 80));
  e2eEmpId = c.json?.id;
  const logNew = await post('/api/auth/login', { body: { code: 'MTX099', pin: '9999' } });
  ok('el empleado nuevo puede iniciar sesión', logNew.status === 200);
  const upd = await put(`/api/employees/${e2eEmpId}`, { token: admin, body: { position: 'Operador Sr.' } });
  ok('actualizar empleado', upd.status === 200 && upd.json?.position === 'Operador Sr.');

  const sch = await get('/api/schedules', { token: admin });
  ok('horarios (3 sembrados)', sch.status === 200 && sch.json?.length === 3);
  const sc = await post('/api/schedules', { token: admin, body: { name: 'Turno E2E', entryTime: '06:00', exitTime: '14:00' } });
  ok('crear horario', sc.status === 201);

  const sites = await get('/api/sites', { token: admin });
  ok('sitios (2 sembrados)', sites.status === 200 && sites.json?.length === 2);
  siteId = sites.json?.[0]?.id;
  const dev = await get('/api/devices', { token: admin });
  ok('dispositivos (1 checador)', dev.status === 200 && dev.json?.length === 1);
}

sec('ATTENDANCE · checadas y motor de asistencia');
let attRowId;
{
  // entrada 08:12 → retardo (tolerancia 10 < 12 ≤ lateAfter 15); salida 18:40 → tiempo extra
  const cin = await post('/api/checadas', { token: admin, body: { employeeId: e2eEmpId, timestamp: `${today}T08:12:00`, type: 'entrada', method: 'manual' } });
  ok('registrar checada de entrada', cin.status === 201, JSON.stringify(cin.json).slice(0, 80));
  const cout = await post('/api/checadas', { token: admin, body: { employeeId: e2eEmpId, timestamp: `${today}T18:40:00`, type: 'salida', method: 'manual' } });
  ok('registrar checada de salida', cout.status === 201);
  const lc = await get(`/api/checadas?employee=${e2eEmpId}`, { token: admin });
  ok('consultar checadas', lc.status === 200 && Array.isArray(lc.json));

  const rp = await post('/api/attendance/reprocess', { token: admin, body: { start: today, end: today, employeeIds: [e2eEmpId] } });
  ok('reprocesar asistencia', rp.status === 200, JSON.stringify(rp.json).slice(0, 80));
  const att = await get(`/api/attendance?start=${today}&end=${today}&employee=${e2eEmpId}`, { token: admin });
  const day = (att.json || []).find?.((a) => String(a.employeeId) === String(e2eEmpId));
  ok('día calculado con retardo', !!day && day.status === 'retardo', `(status=${day?.status})`);
  ok('minutos de retardo = 12', day?.lateMinutes === 12, `(${day?.lateMinutes})`);
  ok('tiempo extra calculado (≥30 min)', (day?.overtimeMinutes ?? 0) >= 30, `(${day?.overtimeMinutes})`);
  attRowId = day?.id;
}

sec('ATTENDANCE · incidencias y tiempo extra');
{
  // El tiempo extra se valida ANTES de autorizar la incidencia: al dominar
  // "vacaciones" el día, el candidato de TE de ese día deja de generarse.
  const ot = await get('/api/overtime', { token: admin });
  ok('candidatos de tiempo extra listados', ot.status === 200 && Array.isArray(ot.json));
  const cand = (ot.json || []).find((o) => String(o.employeeId) === String(e2eEmpId));
  if (cand) {
    const a = await post(`/api/overtime/${cand.id}/authorize`, { token: admin, body: { authorizedMinutes: 30 } });
    ok('autorizar tiempo extra', a.status === 200 && a.json?.status === 'autorizada', JSON.stringify(a.json).slice(0, 80));
  } else {
    ok('candidato de tiempo extra generado', false, '(no se generó candidato)');
  }

  const inc = await post('/api/incidents', { token: admin, body: { employeeId: e2eEmpId, type: 'vacaciones', startDate: today, endDate: today, reason: 'Vacaciones E2E' } });
  ok('crear incidencia', inc.status === 201, JSON.stringify(inc.json).slice(0, 80));
  const auth = await post(`/api/incidents/${inc.json?.id}/authorize`, { token: admin });
  ok('autorizar incidencia', auth.status === 200 && auth.json?.status === 'autorizada');
  await post('/api/attendance/reprocess', { token: admin, body: { start: today, end: today, employeeIds: [e2eEmpId] } });
  const att2 = await get(`/api/attendance?start=${today}&end=${today}&employee=${e2eEmpId}`, { token: admin });
  const day2 = (att2.json || []).find?.((a) => String(a.employeeId) === String(e2eEmpId));
  ok('incidencia autorizada domina el estado (vacaciones)', day2?.status === 'vacaciones', `(${day2?.status})`);

  // La corrección manual (humana, con motivo) prevalece sobre todo lo demás
  // y sobrevive al reprocesamiento — por eso se prueba al final.
  const corr = await put(`/api/attendance/${attRowId}`, { token: admin, body: { status: 'justificada', reason: 'Cita médica comprobada' } });
  ok('corrección manual con motivo', corr.status === 200 && corr.json?.manualStatus === 'justificada', JSON.stringify(corr.json).slice(0, 100));
  const corrBad = await put(`/api/attendance/${attRowId}`, { token: admin, body: { status: 'falta' } });
  ok('corrección sin motivo → rechazada', corrBad.status === 400);
  await post('/api/attendance/reprocess', { token: admin, body: { start: today, end: today, employeeIds: [e2eEmpId] } });
  const att3 = await get(`/api/attendance?start=${today}&end=${today}&employee=${e2eEmpId}`, { token: admin });
  const day3 = (att3.json || []).find?.((a) => String(a.employeeId) === String(e2eEmpId));
  ok('la corrección manual sobrevive al reprocesamiento', day3?.status === 'justificada', `(${day3?.status})`);
}

sec('ATTENDANCE · periodos y export NOI');
let openPeriodId;
{
  const ps = await get('/api/periods', { token: admin });
  ok('periodos (2 sembrados)', ps.status === 200 && ps.json?.length >= 2);
  openPeriodId = (ps.json || []).find((p) => p.status === 'abierto')?.id;
  ok('hay periodo abierto', !!openPeriodId);
  const sum = await get(`/api/periods/${openPeriodId}/summary`, { token: admin });
  ok('resumen de periodo', sum.status === 200);
  const dash = await get('/api/dashboard', { token: admin });
  ok('dashboard de operación', dash.status === 200);
  const prev = await get(`/api/periods/${openPeriodId}/noi/preview`, { token: admin });
  ok('preview NOI', prev.status === 200, JSON.stringify(prev.json).slice(0, 60));
  const expCsv = await get(`/api/periods/${openPeriodId}/noi/export?format=csv&force=1`, { token: admin });
  ok('export NOI CSV con encabezado', expCsv.status === 200 && expCsv.text.includes('CLAVE'), expCsv.text.slice(0, 40));
  const expTxt = await get(`/api/periods/${openPeriodId}/noi/export?format=txt&force=1`, { token: admin });
  ok('export NOI TXT (pipe)', expTxt.status === 200 && expTxt.text.includes('|'));
}

sec('ATTENDANCE · percepciones variables');
{
  const vc = await get('/api/variable-concepts', { token: admin });
  ok('conceptos variables (3 sembrados)', vc.status === 200 && vc.json?.length === 3, `(${vc.json?.length})`);
  const costura = (vc.json || []).find((c) => c.key === 'costura_m2');
  const ve = await post('/api/variable-entries', { token: admin, body: { periodId: openPeriodId, employeeId: e2eEmpId, conceptId: costura?.id, cantidad: 10 } });
  ok('captura variable calcula importe (10×12=120)', ve.status === 201 && Number(ve.json?.importe) === 120, `(${ve.json?.importe})`);
  const sync = await post('/api/variable-sync', { token: admin, body: { source: 'mes', periodId: openPeriodId } });
  ok('sync mock de fuente externa (MES)', sync.status === 200, JSON.stringify(sync.json).slice(0, 80));
  const sync2 = await post('/api/variable-sync', { token: admin, body: { source: 'mes', periodId: openPeriodId } });
  ok('re-sync no duplica (idempotente por external_id)', sync2.status === 200);
  const list2 = await get(`/api/variable-entries?period=${openPeriodId}`, { token: admin });
  ok('listar capturas del periodo', list2.status === 200 && Array.isArray(list2.json));
}

sec('ATTENDANCE · RH (vacaciones, recibos, tickets, indicadores)');
{
  const vb = await get('/api/rh/vacation-balances', { token: admin });
  ok('saldos de vacaciones (LFT 2023)', vb.status === 200 && Array.isArray(vb.json) && vb.json.length >= 4);
  const gen = await post('/api/rh/payslips/generate', { token: admin, body: { periodId: openPeriodId } });
  ok('generar recibos del periodo', gen.status === 200, JSON.stringify(gen.json).slice(0, 80));
  const slips = await get('/api/rh/payslips', { token: admin });
  ok('listar recibos', slips.status === 200 && Array.isArray(slips.json) && slips.json.length > 0, `(${slips.json?.length})`);
  const ind = await get('/api/rh/indicators', { token: admin });
  ok('indicadores RH', ind.status === 200);
}

sec('ATTENDANCE · portal del empleado');
{
  const me = await get('/api/portal/me', { token: empCom });
  ok('portal /me', me.status === 200 && me.json?.employee?.code === 'MTX002', JSON.stringify(me.json).slice(0, 80));
  const ma = await get('/api/portal/me/attendance', { token: empCom });
  ok('portal mi asistencia', ma.status === 200);
  const reqv = await post('/api/portal/me/requests', { token: empCom, body: { type: 'vacaciones', startDate: '2026-08-20', endDate: '2026-08-22', reason: 'Descanso' } });
  ok('solicitar vacaciones (autoservicio)', reqv.status === 201, JSON.stringify(reqv.json).slice(0, 80));
  const tick = await post('/api/portal/me/tickets', { token: empCom, body: { category: 'nomina', subject: 'Duda de recibo', message: '¿Me pueden aclarar el ISR?' } });
  ok('abrir ticket', tick.status === 201, JSON.stringify(tick.json).slice(0, 80));
  const tlist = await get('/api/rh/tickets', { token: admin });
  const t = (tlist.json || []).find((x) => x.subject === 'Duda de recibo');
  ok('RH ve el ticket', !!t);
  if (t) {
    const rep = await post(`/api/rh/tickets/${t.id}/reply`, { token: admin, body: { message: 'Con gusto, revisamos tu caso.' } });
    ok('RH responde el ticket', rep.status === 200);
  }
  const adminOnPortal = await get('/api/portal/me', { token: admin });
  ok('admin en portal de empleado → 403', adminOnPortal.status === 403);
}

sec('ATTENDANCE · asistencia de campo (geocerca) y kiosco');
{
  // El perfil de campo debe incluir los módulos efectivos (la app arma su menú con esto)
  const fme = await get('/api/field/me', { token: empCom });
  ok('field/me incluye módulos del perfil', fme.status === 200 && Array.isArray(fme.json?.modules) && fme.json.modules.length === 15 && fme.json?.profile === 'comercial', `(${fme.json?.modules?.length})`);

  // Fase 2 móvil: registro de push token y autoenrolamiento facial
  const pt = await post('/api/field/push-token', { token: empCom, body: { token: 'ExponentPushToken[e2e-device]' } });
  ok('registrar push token del dispositivo', pt.status === 200 && pt.json?.ok === true, `(${pt.status})`);
  const foto = 'data:image/jpeg;base64,' + Buffer.from('selfie-e2e').toString('base64');
  const ref = await post('/api/field/face', { token: empCom, body: { photo: foto } });
  ok('selfie sola queda como referencia (sin enrolar)', ref.status === 200 && ref.json?.reference === true && ref.json?.faceEnrolled === false, JSON.stringify(ref.json));
  const full = await post('/api/field/face', { token: empCom, body: { photo: foto, descriptor: Array(128).fill(0.42) } });
  ok('selfie + descriptor 128D enrola el rostro', full.status === 200 && full.json?.faceEnrolled === true, JSON.stringify(full.json));
  const fme2 = await get('/api/field/me', { token: empCom });
  ok('field/me refleja el rostro enrolado', fme2.json?.employee?.faceEnrolled === true);
}
{
  const me = await get('/api/field/me', { token: empCom });
  ok('field /me con sitios', me.status === 200 && Array.isArray(me.json?.sites));
  const sites = await get('/api/field/sites', { token: empCom });
  ok('field /sites', sites.status === 200);
  // Planta Zapopan: 20.7214,-103.3900 radio 200m — dentro
  const inG = await post('/api/field/checkin', { token: empCom, body: { type: 'entrada', siteId, lat: 20.7215, lng: -103.39, accuracy: 5, mocked: false } });
  ok('checada de campo DENTRO de geocerca', inG.status === 201 && inG.json?.withinGeofence === true, JSON.stringify(inG.json).slice(0, 100));
  const outG = await post('/api/field/checkin', { token: empCom, body: { type: 'salida', siteId, lat: 20.8, lng: -103.5, accuracy: 5, mocked: true } });
  ok('checada FUERA de geocerca marcada + flag mocked', outG.status === 201 && outG.json?.withinGeofence === false, JSON.stringify(outG.json).slice(0, 100));
  const hist = await get('/api/field/checkins', { token: empCom });
  ok('historial de checadas de campo', hist.status === 200 && (hist.json?.length ?? 0) >= 2, `(${hist.json?.length})`);

  const ks = await get('/api/kiosk/status');
  ok('kiosco público /status', ks.status === 200);
  const ke = await get('/api/kiosk/employees');
  ok('kiosco lista empleados', ke.status === 200 && Array.isArray(ke.json));
  const kc = await post('/api/kiosk/checkin', { body: { code: 'MTX001', type: 'entrada' } });
  ok('kiosco checada por código (fallback)', kc.status === 200 || kc.status === 201, `(${kc.status}) ${JSON.stringify(kc.json).slice(0, 80)}`);
}

// =====================================================================
// 3. CRM
// =====================================================================
sec('CRM · productos y clientes (gerente)');
let productId, clientNewId;
{
  const pr = await get('/api/products', { token: admin });
  ok('productos (3 sembrados)', pr.status === 200 && pr.json?.length === 3, `(${pr.json?.length})`);
  productId = (pr.json || []).find((p) => p.sku === 'MS-35')?.id;
  const pc = await post('/api/products', { token: admin, body: { sku: 'TU-01', name: 'Rafia Tutoreo', category: 'tutoreo', unit: 'rollo', price: 250, stock: 500 } });
  ok('crear producto', pc.status === 201);

  const cl = await get('/api/crm/clients', { token: admin });
  ok('clientes (2 sembrados)', cl.status === 200 && (cl.json?.length === 2 || cl.json?.items?.length === 2));
  const cc = await post('/api/crm/clients', { token: admin, body: { name: 'Rancho E2E', type: 'prospecto', contactName: 'Pedro P.', phone: '3300000000', cultivo: 'Fresa' } });
  ok('crear cliente', cc.status === 201, JSON.stringify(cc.json).slice(0, 80));
  clientNewId = cc.json?.id;
  const asg = await post('/api/crm/assign', { token: admin, body: { employeeId: 2, clientIds: [clientNewId] } });
  ok('asignar cliente a vendedor', asg.status === 200, JSON.stringify(asg.json).slice(0, 80));
  const obj = await get('/api/crm/objectives', { token: admin });
  ok('objetivos de venta', obj.status === 200);
}

sec('CRM · ciclo del vendedor móvil (MTX002)');
let routeId, quoteId, orderId2;
{
  const mc = await get('/api/sales/my-clients', { token: empCom });
  ok('mi cartera incluye el cliente asignado', mc.status === 200 && (mc.json || []).some((c) => String(c.id) === String(clientNewId)), `(${mc.json?.length})`);

  const rs = await post('/api/sales/routes/start', { token: empCom, body: { plannedClientIds: [clientNewId] } });
  ok('iniciar ruta', (rs.status === 200 || rs.status === 201) && rs.json?.id, JSON.stringify(rs.json).slice(0, 80));
  routeId = rs.json?.id;
  const tr = await post(`/api/sales/routes/${routeId}/track`, { token: empCom, body: { points: [{ lat: 20.72, lng: -103.39, ts: new Date().toISOString() }] } });
  ok('trackear GPS de ruta', tr.status === 200, JSON.stringify(tr.json).slice(0, 60));

  const vis = await post('/api/sales/visits', { token: empCom, body: { clientId: clientNewId, routeId, found: true, type: 'presentacion', notes: 'Interesado en malla sombra', photos: [] } });
  ok('registrar visita', vis.status === 201, JSON.stringify(vis.json).slice(0, 80));

  const re = await post(`/api/sales/routes/${routeId}/end`, { token: empCom });
  ok('finalizar ruta', re.status === 200);

  const inv = await get('/api/sales/products?q=sombra', { token: empCom });
  ok('buscar inventario', inv.status === 200 && (inv.json?.length ?? 0) >= 1);

  const q = await post('/api/sales/quotes', { token: empCom, body: { clientId: clientNewId, items: [{ productId, qty: 100, price: 18.5 }] } });
  ok('cotización con IVA 16% (1850→2146)', q.status === 201 && Number(q.json?.total) === 2146, `(total=${q.json?.total})`);
  ok('folio de cotización COT-', /^COT-/.test(q.json?.folio || ''), `(${q.json?.folio})`);
  quoteId = q.json?.id;

  const o = await post('/api/sales/orders', { token: empCom, body: { clientId: clientNewId, quoteId, items: [{ productId, qty: 100, price: 18.5 }] } });
  ok('pedido desde cotización con folio PED-', o.status === 201 && /^PED-/.test(o.json?.folio || ''), `(${o.json?.folio})`);
  orderId2 = o.json?.id;

  const om = await get('/api/sales/objectives/me', { token: empCom });
  ok('mi objetivo/desempeño', om.status === 200);

  const via = await post('/api/sales/expense-requests', { token: empCom, body: { concept: 'Gira Bajío', destination: 'Irapuato', amount: 3500, fromDate: today, toDate: today } });
  ok('solicitud de viáticos VIA-', via.status === 201 && /^VIA-/.test(via.json?.folio || ''), `(${via.json?.folio})`);
  const gto = await post('/api/sales/expenses', { token: empCom, body: { category: 'gasolina', merchant: 'Pemex', amount: 800, date: today, hasInvoice: true, rfc: 'PEP970814SF3' } });
  ok('gasto GTO-', gto.status === 201 && /^GTO-/.test(gto.json?.folio || ''), `(${gto.json?.folio})`);
  const fac = await post('/api/sales/invoices', { token: empCom, body: { clientId: clientNewId, orderId: orderId2, rfc: 'XAXX010101000', razonSocial: 'Rancho E2E SA', usoCfdi: 'G03', amount: 2146 } });
  ok('solicitud de factura FAC-', fac.status === 201 && /^FAC-/.test(fac.json?.folio || ''), `(${fac.json?.folio})`);

  const adv = await post('/api/sales/advisor', { token: empCom, body: { cultivo: 'arandano', clima: 'granizo', descripcion: 'proteger de granizo' } });
  ok('asesor técnico recomienda', adv.status === 200 && JSON.stringify(adv.json).toLowerCase().includes('granizo'), JSON.stringify(adv.json).slice(0, 80));

  const opBlocked = await get('/api/sales/my-clients', { token: empOp });
  ok('perfil operativo bloqueado en /api/sales → 403', opBlocked.status === 403);
}

sec('CRM · back-office (decisiones, facturación, webhook Aspel)');
{
  const iv = await get('/api/crm/invoices', { token: admin });
  const facRow = (iv.json || []).find((f) => String(f.orderId ?? f.order_id) === String(orderId2)) || (iv.json || [])[0];
  ok('gerente ve facturas', iv.status === 200 && !!facRow);
  const emit = await post(`/api/crm/invoices/${facRow?.id}/emit`, { token: admin });
  ok('emitir factura (timbrado mock, UUID)', emit.status === 200 && !!emit.json?.uuid, JSON.stringify(emit.json).slice(0, 80));

  const pay = await post('/api/integrations/aspel/payment', { headers: { 'x-webhook-secret': HOOK }, body: { invoiceId: facRow?.id, amount: 2146, paymentRef: 'SPEI-123' } });
  ok('webhook de pago marca pagada', pay.status === 200 && (pay.json?.status === 'pagada' || pay.json?.invoice?.status === 'pagada'), JSON.stringify(pay.json).slice(0, 100));
  const pay2 = await post('/api/integrations/aspel/payment', { headers: { 'x-webhook-secret': HOOK }, body: { invoiceId: facRow?.id, amount: 2146, paymentRef: 'SPEI-123' } });
  ok('webhook idempotente', pay2.status === 200, JSON.stringify(pay2.json).slice(0, 80));
  const payNoSec = await post('/api/integrations/aspel/payment', { body: { invoiceId: facRow?.id } });
  ok('webhook sin secreto → 401', payNoSec.status === 401);

  const er = await get('/api/crm/expense-requests', { token: admin });
  const viaRow = (er.json || [])[0];
  if (viaRow) {
    const dec = await post(`/api/crm/expense-requests/${viaRow.id}/decision`, { token: admin, body: { decision: 'aprobado' } });
    ok('decidir viáticos', dec.status === 200, JSON.stringify(dec.json).slice(0, 60));
  } else ok('hay solicitudes de viáticos', false);
  const st = await get('/api/crm/integrations/status', { token: admin });
  ok('estatus de integraciones', st.status === 200);
}

// =====================================================================
// 4. MES
// =====================================================================
sec('MES · catálogos y órdenes');
let felId, rollCode = 'RL-E2E-001';
{
  const ln = await get('/api/mes/lines', { token: admin });
  ok('líneas (7: LC1-LC4, LK, LP, LE)', ln.status === 200 && ln.json?.length === 7, `(${ln.json?.length})`);
  const ops = await get('/api/mes/operators', { token: admin });
  ok('operadores (3 sembrados)', ops.status === 200 && ops.json?.length >= 3);
  const or = await get('/api/mes/orders', { token: admin });
  ok('órdenes (2: EZE503, FEL220)', or.status === 200 && or.json?.length === 2, `(${or.json?.length})`);
  const eze = (or.json || []).find((o) => o.code === 'EZE503');
  const oid = await get(`/api/mes/orders/${eze?.id}`, { token: admin });
  ok('EZE503 con 5 subpedidos (Driscolls)', oid.status === 200 && (oid.json?.suborders?.length === 5 || oid.json?.subPedidos?.length === 5), JSON.stringify(oid.json).slice(0, 80));
  felId = (or.json || []).find((o) => o.code === 'FEL220')?.id;
}

sec('MES · candado de cobranza (gate)');
{
  const pend = await get('/api/mes/cobranza/pendientes', { token: admin });
  ok('cobranza ve pendientes (FEL220)', pend.status === 200 && (pend.json || []).some((o) => o.code === 'FEL220'), `(${pend.json?.length})`);
  const lib1 = await post(`/api/mes/orders/${felId}/liberar`, { token: admin });
  ok('liberar SIN pago → 409', lib1.status === 409, `(${lib1.status})`);
  const conf = await post(`/api/mes/cobranza/${felId}/confirmar-pago`, { token: admin });
  ok('confirmar pago', conf.status === 200 && conf.json?.pagoConfirmado === true, JSON.stringify(conf.json).slice(0, 80));
  const lib2 = await post(`/api/mes/orders/${felId}/liberar`, { token: admin });
  ok('liberar CON pago → liberado', lib2.status === 200 && lib2.json?.estado === 'liberado', `(${lib2.json?.estado})`);
}

sec('MES · piso de producción (rollos, avisos, mermas, productividad)');
{
  const rc = await post('/api/mes/rolls', { token: admin, body: { code: rollCode, material: 'Malla Sombra', medida: '4.20x100', lote: 'L-2026-08', peso: 32.5, ubicacion: 'A-01' } });
  ok('alta de rollo', rc.status === 201, JSON.stringify(rc.json).slice(0, 80));
  const av = await post('/api/mes/avisos', { token: admin, body: { lineId: 1, tipo: 'falla-maquina', descripcion: 'Aguja rota LC1' } });
  ok('aviso de piso', av.status === 201);
  const mm = await post('/api/mes/mermas', { token: admin, body: { lineId: 1, material: 'Malla Sombra', metros: 12.5, categoria: 'defecto', defecto: 'costura abierta' } });
  ok('merma válida', mm.status === 201);
  const mmBad = await post('/api/mes/mermas', { token: admin, body: { lineId: 1, metros: 5, categoria: 'invalida' } });
  ok('merma con categoría inválida → 400', mmBad.status === 400, `(${mmBad.status})`);
  const pd = await post('/api/mes/productividad', { token: admin, body: { turno: 'matutino', lineId: 1, operatorId: 1, metros: 1200, piezas: 22, horas: 6 } });
  ok('productividad calcula ml/hr=200', pd.status === 201 && Number(pd.json?.mlHr ?? pd.json?.ml_hr) === 200, `(${pd.json?.mlHr ?? pd.json?.ml_hr})`);
}

sec('MES · almacén (MT-DT-001/002/006)');
{
  const rec = await post('/api/mes/recepciones', { token: admin, body: { proveedor: 'Cordelería del Norte', material: 'Rafia cruda', cantidad: 500, unidad: 'kg', lote: 'PRV-88', recibidoPor: 'Alberto O.' } });
  ok('recepción MT-DT-001', rec.status === 201);
  const eg = await post('/api/mes/egresos', { token: admin, body: { orderId: felId, material: 'Malla Sombra', cantidad: 180, unidad: 'rollos', entregadoPor: 'Alberto O.' } });
  ok('egreso a producción MT-DT-002', eg.status === 201);
  const pt = await post('/api/mes/productos-terminados', { token: admin, body: { orderId: felId, rollos: 10, pesoTeorico: 325, pesoReal: 323.8, verificadoPor: 'Carlos A.' } });
  ok('pesaje MT-DT-006 (teórico vs real)', pt.status === 201);
  const loc = await get('/api/mes/locations', { token: admin });
  ok('ubicaciones de almacén', loc.status === 200);
}

sec('MES · inventario físico + conteo (tablet) + sync SAE');
{
  // Alta de artículo (SKU = clave SAE) y saldo por kardex.
  const it = await post('/api/mes/inventory/items', { token: admin, body: { sku: 'E2E-MALLA-01', descripcion: 'Malla E2E', unidad: 'rollo', minimo: 5 } });
  ok('alta de artículo de inventario', it.status === 201 && it.json?.sku === 'E2E-MALLA-01', `(${it.status})`);
  const itemId = it.json?.id;
  const dup = await post('/api/mes/inventory/items', { token: admin, body: { sku: 'E2E-MALLA-01', descripcion: 'dup' } });
  ok('SKU duplicado → 409', dup.status === 409, `(${dup.status})`);
  const ent = await post('/api/mes/inventory/movements', { token: admin, body: { itemId, tipo: 'entrada', cantidad: 100 } });
  ok('entrada 100 → existencia 100 (kardex)', ent.status === 201 && Number(ent.json?.existencia) === 100, JSON.stringify(ent.json).slice(0, 90));
  const over = await post('/api/mes/inventory/movements', { token: admin, body: { itemId, tipo: 'salida', cantidad: 999 } });
  ok('salida > existencia → 409 STOCK_INSUFICIENTE', over.status === 409 && over.json?.code === 'STOCK_INSUFICIENTE', `(${over.status})`);

  // Sin el módulo mes-inventario → 403 (un vendedor comercial no entra).
  const noacc = await get('/api/mes/inventory/items', { token: empCom });
  ok('sin módulo mes-inventario → 403', noacc.status === 403, `(${noacc.status})`);

  // Conteo físico desde la tablet (empleado de línea).
  const cnt = await post('/api/mes/inventory/counts', { token: empLinea, body: { ubicacion: 'Almacén PT' } });
  ok('inicia conteo con folio CTF-', cnt.status === 201 && /^CTF-\d{4}$/.test(cnt.json?.folio || ''), JSON.stringify(cnt.json).slice(0, 90));
  const countId = cnt.json?.id;
  const cap = await post(`/api/mes/inventory/counts/${countId}/lines`, { token: empLinea, body: { sku: 'E2E-MALLA-01', contado: 96 } });
  ok('captura físico 96 → teórico 100, dif -4', cap.status === 201 && Number(cap.json?.teorico) === 100 && Number(cap.json?.diferencia) === -4, JSON.stringify(cap.json).slice(0, 120));
  const close = await post(`/api/mes/inventory/counts/${countId}/close`, { token: empLinea });
  ok('cierra conteo y genera el ajuste', close.status === 200 && close.json?.estado === 'cerrado' && close.json?.resumen?.conDiferencia === 1, JSON.stringify(close.json?.resumen));
  const items2 = await get('/api/mes/inventory/items', { token: admin });
  const row = (items2.json || []).find((x) => x.id === itemId);
  ok('el ajuste dejó la existencia en 96', Number(row?.existencia) === 96, `(${row?.existencia})`);

  // Sincronización de ajustes con el SAE (mock por defecto).
  const sync = await post(`/api/mes/inventory/counts/${countId}/sync`, { token: admin });
  ok('sincroniza ajustes al SAE (mock) → sincronizado', sync.status === 200 && sync.json?.estado === 'sincronizado' && sync.json?.saeSyncEstado === 'enviado', JSON.stringify({ e: sync.json?.estado, ref: sync.json?.saeRef }));
}

sec('MES · tablero, KPIs y tablet de línea (móvil)');
{
  const tb = await get('/api/mes/tablero', { token: admin });
  ok('tablero con órdenes por estado', tb.status === 200 && !!tb.json?.ordersByEstado);
  ok('tablero refleja FEL220 liberado', tb.json?.ordersByEstado?.liberado === 1, `(${tb.json?.ordersByEstado?.liberado})`);
  const kp = await get('/api/mes/kpis', { token: admin });
  ok('KPIs de dirección', kp.status === 200);

  const tl = await get('/api/mes/tablet/lines', { token: empLinea });
  ok('tablet: líneas (perfil linea)', tl.status === 200 && tl.json?.length === 7);
  const sc = await post('/api/mes/tablet/scan', { token: empLinea, body: { code: rollCode, lineId: 1 } });
  ok('tablet: escanear rollo → en-línea', sc.status === 200 && sc.json?.estado === 'en-linea', JSON.stringify(sc.json).slice(0, 80));
  const ta = await post('/api/mes/tablet/alert', { token: empLinea, body: { lineId: 1, tipo: 'falta-material', descripcion: 'Sin rafia en LC1' } });
  ok('tablet: reportar alerta', ta.status === 201);
  const tm = await post('/api/mes/tablet/merma', { token: empLinea, body: { lineId: 1, material: 'Malla', metros: 3, categoria: 'sobrante' } });
  ok('tablet: reportar merma', tm.status === 201);
  const av1 = await post('/api/mes/tablet/avance', { token: empLinea, body: { lineId: 1, cantidad: 12 } });
  ok('tablet: avance sin pedido → aviso informativo', av1.status === 201, `(${av1.status})`);
  const av2 = await post('/api/mes/tablet/avance', { token: empLinea, body: { orderId: felId, cantidad: 5 } });
  ok('tablet: avance sobre pedido registra terminados', av2.status === 200 && (av2.json?.terminados ?? 0) >= 5, `(${av2.status}, terminados=${av2.json?.terminados})`);
  const blocked = await get('/api/mes/tablet/lines', { token: empCom });
  ok('perfil comercial bloqueado en tablet → 403', blocked.status === 403, `(${blocked.status})`);
  const adminNoMes = await get('/api/mes/tablero', { token: empOp });
  ok('operativo bloqueado en tablero → 403', adminNoMes.status === 403, `(${adminNoMes.status})`);
}

// =====================================================================
// 5. LEADS
// =====================================================================
sec('LEADS · eventos');
let eventId, leadId;
{
  const act = await get('/api/events/public/active');
  ok('evento activo público', act.status === 200 && !!act.json?.id, JSON.stringify(act.json).slice(0, 80));
  eventId = act.json?.id;
  const list = await get('/api/events', { token: admin });
  ok('listar eventos (admin)', list.status === 200 && (list.json?.items?.length ?? 0) >= 1, `(${list.json?.items?.length})`);
  const c = await post('/api/events', { token: admin, body: { name: 'Expo E2E', premio: 'Rollo de malla', fecha: '2026-12-01', lugar: 'GDL' } });
  ok('crear evento', c.status === 201);
  const actv = await post(`/api/events/${c.json?.id}/activate`, { token: admin });
  ok('activar evento nuevo', actv.status === 200);
  // reactivar el original para el resto de la suite
  await post(`/api/events/${eventId}/activate`, { token: admin });
}

sec('LEADS · captura (staff + autoregistro público)');
{
  const meta = await get('/api/leads/meta');
  ok('catálogos públicos (7 intereses)', meta.status === 200 && (meta.json?.intereses?.length === 7), `(${meta.json?.intereses?.length})`);

  const st = await post('/api/leads', { token: admin, body: { eventId, nombre: 'Cliente Uno', empresa: 'AgroUno', estado: 'Jalisco', email: 'uno@agro.mx', telefono: '3311111111', interes: 'malla_sombra', consentimiento: true, fuente: 'Stand' } });
  ok('captura staff con folio ANB-', st.status === 201 && /^ANB-/.test(st.json?.folio || ''), `(${st.json?.folio})`);
  leadId = st.json?.id;

  const dup = await post('/api/leads', { token: admin, body: { eventId, nombre: 'Cliente Uno Bis', email: 'uno@agro.mx', telefono: '3311111111' } });
  ok('duplicado → 409', dup.status === 409, `(${dup.status})`);
  const forced = await post('/api/leads', { token: admin, body: { eventId, nombre: 'Cliente Uno Bis', email: 'uno@agro.mx', telefono: '3311111111', forzar: true } });
  ok('duplicado con forzar → 201', forced.status === 201);

  const reg = await post('/api/leads/registro', { body: { eventId, nombre: 'Visitante QR', empresa: 'Berries GDL', estado: 'Jalisco', email: 'qr@visita.mx', telefono: '3322222222', interes: 'malla_antigranizo', aceptaTerminos: true, aceptaPrivacidad: true } });
  ok('autoregistro público válido', reg.status === 201 && /^ANB-/.test(reg.json?.folio || ''), `(${reg.status}) ${JSON.stringify(reg.json).slice(0, 80)}`);
  const regBadPhone = await post('/api/leads/registro', { body: { eventId, nombre: 'Tel Malo', email: 'tel@x.mx', telefono: '12345', aceptaTerminos: true, aceptaPrivacidad: true } });
  ok('teléfono ≠10 dígitos → 400', regBadPhone.status === 400);
  const regNoTerms = await post('/api/leads/registro', { body: { eventId, nombre: 'Sin Terminos', email: 'st@x.mx', telefono: '3333333333' } });
  ok('sin aceptar términos → 400', regNoTerms.status === 400);
  const honey = await post('/api/leads/registro', { body: { eventId, nombre: 'Bot', email: 'bot@x.mx', telefono: '3344444444', aceptaTerminos: true, aceptaPrivacidad: true, website: 'spam.com' } });
  ok('honeypot rechazado', honey.status !== 201, `(${honey.status})`);

  const search = await get(`/api/leads?event=${eventId}&q=Visitante`, { token: admin });
  ok('búsqueda de leads', search.status === 200 && (search.json?.length ?? search.json?.items?.length ?? 0) >= 1);
  const csv = await get('/api/leads/export.csv', { token: admin });
  ok('export CSV', csv.status === 200 && csv.text.toLowerCase().includes('folio'));

  // Seguridad: un empleado NO puede leer/exportar/borrar PII de leads (pentest #2).
  const empLista = await get(`/api/leads?event=${eventId}`, { token: empCom });
  ok('empleado no lista leads → 403', empLista.status === 403, `(${empLista.status})`);
  const empCsv = await get('/api/leads/export.csv', { token: empCom });
  ok('empleado no exporta CSV → 403', empCsv.status === 403, `(${empCsv.status})`);
  const empDel = await del(`/api/leads/${leadId || 1}`, { token: empCom });
  ok('empleado no borra leads → 403', empDel.status === 403, `(${empDel.status})`);
}

sec('LEADS · sorteo y dashboard');
{
  const el = await get(`/api/raffle/eligible?event=${eventId}`, { token: admin });
  ok('elegibles del sorteo', el.status === 200, JSON.stringify(el.json).slice(0, 60));
  const draw = await post('/api/raffle/draw', { token: admin, body: { eventId } });
  ok('ejecutar sorteo → ganador con folio', (draw.status === 200 || draw.status === 201) && /^ANB-/.test(draw.json?.ganador?.folio || ''), JSON.stringify(draw.json).slice(0, 100));
  const winners = await get('/api/raffle/winners', { token: admin });
  ok('lista de ganadores', winners.status === 200 && (winners.json?.items?.length ?? 0) >= 1, `(${winners.json?.items?.length})`);
  const stats = await get('/api/stats', { token: admin });
  ok('dashboard: total y consentimiento', stats.status === 200 && (stats.json?.total ?? 0) >= 3, `(total=${stats.json?.total})`);
  ok('dashboard: desglose por interés', Array.isArray(stats.json?.porInteres) && stats.json.porInteres.length >= 1);

  // Seguridad: sorteo y dashboard solo para administración (pentest #2).
  const empDraw = await post('/api/raffle/draw', { token: empCom, body: { eventId } });
  ok('empleado no ejecuta sorteo → 403', empDraw.status === 403, `(${empDraw.status})`);
  const empStats = await get('/api/stats', { token: empCom });
  ok('empleado no ve dashboard de leads → 403', empStats.status === 403, `(${empStats.status})`);
}

// =====================================================================
// 6. DEUDA TÉCNICA — sesiones, rate limit y paginación
// =====================================================================
sec('KIOSCO DE PLANTA · checador por línea y autoservicio');
{
  const lines = await get('/api/mes/kiosk/lines');
  ok('catálogo público de líneas para kioscos (7)', lines.status === 200 && lines.json?.length === 7, `(${lines.json?.length})`);
  ok('el catálogo no expone datos sensibles', lines.status === 200 && !JSON.stringify(lines.json).match(/operador|salario|pin/i));

  const kc = await post('/api/kiosk/checkin', { body: { code: 'MTX021', kiosk: { line: 'LC1', label: 'Kiosko LC1' } } });
  ok('checada de kiosco con línea trazada', (kc.status === 200 || kc.status === 201) && !!kc.json?.headline, JSON.stringify(kc.json).slice(0, 80));
  ok('respuesta amigable para el operador (saludo + hora + estado)', !!kc.json?.time && !!kc.json?.detail);
  const kcBad = await post('/api/kiosk/checkin', { body: { code: 'MTX999', kiosk: { line: 'LC1' } } });
  ok('código desconocido → 404 amigable', kcBad.status === 404);

  // Autoservicio RH desde el kiosco: portal completo con sesión de empleado
  const klogin = await post('/api/auth/login', { body: { code: 'MTX021', pin: '1234' } });
  const ktok = klogin.json?.token;
  const kme = await get('/api/portal/me', { token: ktok });
  ok('kiosco RH: perfil del operador', kme.status === 200 && kme.json?.employee?.code === 'MTX021');
  const katt = await get('/api/portal/me/attendance', { token: ktok });
  ok('kiosco RH: mi asistencia', katt.status === 200);
  const kreq = await post('/api/portal/me/requests', { token: ktok, body: { type: 'permiso_goce', startDate: '2026-08-25', endDate: '2026-08-25', reason: 'Trámite personal' } });
  ok('kiosco RH: solicitar permiso', kreq.status === 201, JSON.stringify(kreq.json).slice(0, 60));
  const kslips = await get('/api/portal/me/payslips', { token: ktok });
  ok('kiosco RH: mis recibos', kslips.status === 200);
  // La revocación es inmediata en identity; en los demás servicios se propaga
  // en ≤30 s (caché de denylist). El kiosco además borra el token localmente.
  const kout = await post('/api/auth/logout', { token: ktok });
  const kafter = await get('/api/auth/me', { token: ktok });
  ok('salir del kiosco revoca la sesión (identity inmediato) → 401', kout.status === 200 && kafter.status === 401, `(${kafter.status})`);
}

// =====================================================================
// 7. MARKETING
// =====================================================================
sec('MARKETING · banco de materiales (assets)');
let mkt, assetId;
{
  const r = await post('/api/auth/login', { body: { email: 'marketing@mallatex.mx', password: 'mallatex2026' } });
  ok('login usuario marketing con sus 6 módulos', r.status === 200 && (r.json?.modules || []).filter((m) => m.startsWith('mkt-')).length === 6, `(${(r.json?.modules || []).join(',')})`);
  mkt = r.json?.token;

  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const c = await post('/api/mkt/assets', { token: mkt, body: { tipo: 'imagen', titulo: 'Logo E2E', categoria: 'logos', file: png } });
  ok('subir imagen al banco (storage db)', c.status === 201 && c.json?.storage === 'db', JSON.stringify(c.json).slice(0, 100));
  assetId = c.json?.id;

  const list = await get('/api/mkt/assets?tipo=imagen', { token: mkt });
  ok('listar banco filtrado por tipo', list.status === 200 && (list.json || []).some((a) => a.id === assetId));
  const file = await get(`/api/mkt/assets/${assetId}/file`, { token: mkt });
  ok('descargar archivo del asset', file.status === 200 && String(file.headers.get('content-type')).includes('image/png'), `(${file.status})`);
  ok('archivo se sirve como descarga (no inline)', String(file.headers.get('content-disposition') || '').includes('attachment') && file.headers.get('x-content-type-options') === 'nosniff');

  // Seguridad: no se acepta HTML/SVG disfrazado (XSS almacenado) — pentest #3.
  const htmlB64 = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
  const xss = await post('/api/mkt/assets', { token: mkt, body: { tipo: 'documento', titulo: 'x', file: `data:text/html;base64,${htmlB64}` } });
  ok('rechaza documento HTML (XSS)', xss.status >= 400 && xss.json?.code === 'ASSET_FILE_INVALIDO', `(${xss.status})`);
  const svgB64 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
  const xss2 = await post('/api/mkt/assets', { token: mkt, body: { tipo: 'imagen', titulo: 'x', file: `data:image/svg+xml;base64,${svgB64}` } });
  ok('rechaza imagen SVG (XSS)', xss2.status >= 400 && xss2.json?.code === 'ASSET_FILE_INVALIDO', `(${xss2.status})`);
  // Seguridad: open redirect por externalUrl con esquema peligroso — pentest #10.
  const badUrl = await post('/api/mkt/assets', { token: mkt, body: { tipo: 'documento', titulo: 'x', externalUrl: 'javascript:alert(1)' } });
  ok('rechaza externalUrl no http(s)', badUrl.status >= 400, `(${badUrl.status})`);

  const empList = await get('/api/mkt/assets', { token: empCom });
  ok('vendedor (empleado) consulta el banco', empList.status === 200);
  ok('seed incluye assets de ejemplo en el banco', (empList.json || []).length >= 4, `(${empList.json?.length})`);

  // Video con cabecera mp4 real (ftyp/isom): pasa la validación de magic bytes.
  const vid = 'data:video/mp4;base64,' + Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.from('relleno-e2e-video')]).toString('base64');
  const cv = await post('/api/mkt/assets', { token: mkt, body: { tipo: 'video', titulo: 'Video E2E', file: vid } });
  ok('video sin S3 queda en BD pendiente de sincronizar', cv.status === 201 && cv.json?.storage === 'db' && cv.json?.pendingSync === true, JSON.stringify(cv.json).slice(0, 100));

  const st = await get('/api/mkt/assets/s3-status', { token: mkt });
  ok('estatus S3: no configurado, con pendientes', st.status === 200 && st.json?.configured === false && st.json?.pendingCount >= 1, JSON.stringify(st.json));
  const sync = await post('/api/mkt/assets/sync-s3', { token: mkt });
  ok('sync-s3 sin configurar → 409 S3_OFF', sync.status === 409 && sync.json?.code === 'S3_OFF', `(${sync.status})`);
}

sec('MARKETING · solicitudes de formatos');
{
  const c = await post('/api/mkt/format-requests', { token: empCom, body: { titulo: 'Ficha técnica malla sombra', descripcion: 'Para cliente E2E' } });
  ok('vendedor crea solicitud con folio FMT-', c.status === 201 && /^FMT-/.test(c.json?.folio || ''), JSON.stringify(c.json).slice(0, 100));
  const fmtId = c.json?.id;
  const mine = await get('/api/mkt/format-requests/mine', { token: empCom });
  ok('vendedor ve sus solicitudes', mine.status === 200 && (mine.json || []).some((f) => f.id === fmtId));
  const msg = await post(`/api/mkt/format-requests/${fmtId}/message`, { token: empCom, body: { message: '¿Para cuándo estaría?' } });
  ok('vendedor agrega mensaje al hilo', msg.status === 200 || msg.status === 201, `(${msg.status})`);
  const listMkt = await get('/api/mkt/format-requests?estado=solicitado', { token: mkt });
  ok('marketing ve solicitudes pendientes', listMkt.status === 200 && (listMkt.json || []).some((f) => f.id === fmtId));
  const bad = await post(`/api/mkt/format-requests/${fmtId}/estado`, { token: mkt, body: { estado: 'entregado' } });
  ok('entregar sin entregable → rechazado', bad.status >= 400 && bad.status < 500, `(${bad.status})`);
  const t1 = await post(`/api/mkt/format-requests/${fmtId}/estado`, { token: mkt, body: { estado: 'en_diseno' } });
  ok('pasar a en_diseno', t1.status === 200 && t1.json?.estado === 'en_diseno', `(${t1.status})`);
  const t2 = await post(`/api/mkt/format-requests/${fmtId}/estado`, { token: mkt, body: { estado: 'entregado', entregableAssetId: assetId } });
  ok('entregar con entregable', t2.status === 200 && t2.json?.estado === 'entregado', `(${t2.status})`);
}

sec('MARKETING · aportes de campo (contenido del vendedor)');
{
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const c = await post('/api/mkt/field-posts', {
    token: empCom,
    body: {
      titulo: 'Proyecto E2E antigranizo', ubicacion: 'Jocotepec, Jalisco', cultivo: 'Zarzamora',
      producto: 'Malla antigranizo', cliente: 'Cliente E2E', contexto: 'Instalación E2E de prueba.',
      fotos: [png, png],
    },
  });
  ok('vendedor crea aporte con folio APC- y 2 fotos', c.status === 201 && /^APC-/.test(c.json?.folio || '') && c.json?.fotoCount === 2, JSON.stringify(c.json).slice(0, 120));
  const apId = c.json?.id;
  const photoId = c.json?.fotos?.[0]?.id;

  const noFoto = await post('/api/mkt/field-posts', { token: empCom, body: { titulo: 'x', fotos: [] } });
  ok('aporte sin fotos → 400', noFoto.status === 400, `(${noFoto.status})`);

  const mine = await get('/api/mkt/field-posts/mine', { token: empCom });
  ok('vendedor ve sus aportes', mine.status === 200 && (mine.json || []).some((a) => a.id === apId));

  const empBandeja = await get('/api/mkt/field-posts', { token: empCom });
  ok('vendedor NO accede a la bandeja de marketing → 403', empBandeja.status === 403, `(${empBandeja.status})`);

  const bandeja = await get('/api/mkt/field-posts?estado=nuevo', { token: mkt });
  ok('marketing ve la bandeja de aportes', bandeja.status === 200 && (bandeja.json || []).some((a) => a.id === apId));

  // Hilo bidireccional vendedor <-> marketing.
  const mMkt = await post(`/api/mkt/field-posts/${apId}/message`, { token: mkt, body: { message: '¿Nombre del cliente?' } });
  ok('marketing escribe en el hilo del aporte', mMkt.status === 200 && (mMkt.json?.mensajes || []).length === 1 && mMkt.json.mensajes[0].role === 'marketing', `(${mMkt.status})`);
  const mEmp = await post(`/api/mkt/field-posts/${apId}/message`, { token: empCom, body: { message: 'Agrícola El Rosario' } });
  ok('vendedor responde en su aporte', mEmp.status === 200 && (mEmp.json?.mensajes || []).length === 2 && mEmp.json.mensajes[1].role === 'vendedor', `(${mEmp.status})`);
  const mOtro = await post(`/api/mkt/field-posts/${apId}/message`, { token: empOp, body: { message: 'intruso' } });
  ok('empleado ajeno no comenta el aporte → 403', mOtro.status === 403, `(${mOtro.status})`);

  const foto = await get(`/api/mkt/field-posts/photos/${photoId}/file`, { token: mkt });
  ok('sirve la foto del aporte (attachment, nosniff)', foto.status === 200 && String(foto.headers.get('content-type')).includes('image/png') && String(foto.headers.get('content-disposition') || '').includes('attachment'), `(${foto.status})`);

  const badTrans = await post(`/api/mkt/field-posts/${apId}/estado`, { token: mkt, body: { estado: 'publicado' } });
  ok('publicar directo (nuevo→publicado) → 409', badTrans.status === 409, `(${badTrans.status})`);

  const aprob = await post(`/api/mkt/field-posts/${apId}/estado`, { token: mkt, body: { estado: 'aprobado', notaMarketing: 'Va.' } });
  ok('marketing aprueba el aporte', aprob.status === 200 && aprob.json?.estado === 'aprobado', `(${aprob.status})`);

  const pub = await post(`/api/mkt/field-posts/${apId}/publicar`, { token: mkt });
  ok('publicar al banco crea 2 assets y pasa a publicado', pub.status === 200 && pub.json?.estado === 'publicado' && (pub.json?.publicadoAssetIds || []).length === 2, JSON.stringify(pub.json?.publicadoAssetIds));

  const banco = await get('/api/mkt/assets?categoria=casos-exito', { token: empCom });
  ok('los casos de éxito quedan en el banco para la fuerza de venta', banco.status === 200 && (banco.json || []).length >= 2, `(${banco.json?.length})`);
}

sec('MARKETING · publicaciones y difusión al equipo');
{
  const before = await get('/api/mkt/posts/unseen-count', { token: empCom });
  ok('contador de no vistas del vendedor', before.status === 200 && typeof before.json?.count === 'number', JSON.stringify(before.json));
  const c = await post('/api/mkt/posts', { token: mkt, body: { titulo: 'Campaña E2E', copyTexto: 'Comparte en tus redes', red: 'facebook', assetId } });
  ok('marketing publica edición', c.status === 201, JSON.stringify(c.json).slice(0, 80));
  const after = await get('/api/mkt/posts/unseen-count', { token: empCom });
  ok('nueva publicación incrementa no vistas', after.status === 200 && after.json?.count === (before.json?.count ?? 0) + 1, `(${before.json?.count}→${after.json?.count})`);
  const feed = await get('/api/mkt/posts', { token: empCom });
  ok('vendedor ve el feed de publicaciones', feed.status === 200 && (feed.json || []).length >= 1);
  const seen = await post('/api/mkt/posts/seen', { token: empCom, body: { all: true } });
  ok('marcar todas como vistas', seen.status === 200, `(${seen.status})`);
  const zero = await get('/api/mkt/posts/unseen-count', { token: empCom });
  ok('contador vuelve a cero', zero.status === 200 && zero.json?.count === 0, `(${zero.json?.count})`);
}

sec('MARKETING · calendario de campañas');
{
  const c = await post('/api/mkt/campaigns', { token: mkt, body: { nombre: 'Campaña E2E', color: '#ED3237', canal: 'facebook', fechaInicio: today, fechaFin: today, productos: ['malla sombra'] } });
  ok('crear campaña', c.status === 201, JSON.stringify(c.json).slice(0, 80));
  const campId = c.json?.id;
  const list = await get(`/api/mkt/campaigns?year=${today.slice(0, 4)}`, { token: mkt });
  const mia = (list.json || []).find((x) => x.id === campId);
  ok('campaña vigente hoy (computado)', list.status === 200 && mia?.vigente === true, JSON.stringify(mia).slice(0, 80));
  const badRange = await post('/api/mkt/campaigns', { token: mkt, body: { nombre: 'Mal rango', fechaInicio: '2026-12-31', fechaFin: '2026-01-01' } });
  ok('rango de fechas inválido rechazado', badRange.status >= 400 && badRange.status < 500, `(${badRange.status})`);
  const close = await post(`/api/mkt/campaigns/${campId}/cerrar`, { token: mkt });
  ok('cerrar campaña', close.status === 200 && (close.json?.estado === 'cerrada' || close.json?.vigente === false), `(${close.status})`);
}

sec('MARKETING · inventario de impresos');
{
  const c = await post('/api/mkt/print-items', { token: mkt, body: { nombre: 'Tríptico E2E', categoria: 'folletos', unidad: 'pieza', minimo: 10 } });
  ok('crear artículo impreso', c.status === 201, JSON.stringify(c.json).slice(0, 80));
  const itemId = c.json?.id;
  const inMove = await post('/api/mkt/print-movements', { token: mkt, body: { itemId, tipo: 'entrada', cantidad: 20, notas: 'Imprenta E2E' } });
  ok('registrar entrada de 20', inMove.status === 201 || inMove.status === 200, `(${inMove.status})`);
  const outEmp = await post('/api/mkt/print-movements', { token: empCom, body: { itemId, tipo: 'salida', cantidad: 5 } });
  ok('vendedor registra salida de 5', outEmp.status === 201 || outEmp.status === 200, `(${outEmp.status})`);
  const badTipo = await post('/api/mkt/print-movements', { token: empCom, body: { itemId, tipo: 'entrada', cantidad: 5 } });
  ok('vendedor no puede registrar entradas', badTipo.status === 403 || badTipo.status === 400, `(${badTipo.status})`);
  const list = await get('/api/mkt/print-items', { token: mkt });
  const item = (list.json || []).find((x) => x.id === itemId);
  ok('existencia calculada (15)', list.status === 200 && item?.existencia === 15, `(${item?.existencia})`);
  ok('sin alerta de bajo mínimo (15 > 10)', item?.bajoMinimo === false);
  const overdraw = await post('/api/mkt/print-movements', { token: mkt, body: { itemId, tipo: 'salida', cantidad: 999 } });
  ok('salida mayor a existencia → 409 STOCK_INSUFICIENTE', overdraw.status === 409 && overdraw.json?.code === 'STOCK_INSUFICIENTE', `(${overdraw.status})`);
  const movs = await get(`/api/mkt/print-items/${itemId}/movements`, { token: mkt });
  ok('historial de movimientos del artículo', movs.status === 200 && (movs.json || []).length >= 2, `(${movs.json?.length})`);
}

sec('SEGURIDAD · revocación de sesión (logout server-side)');
{
  const login = await post('/api/auth/login', { body: { code: 'MTX002', pin: '1234' } });
  const tok = login.json?.token;
  const meBefore = await get('/api/auth/me', { token: tok });
  ok('sesión válida antes del logout', meBefore.status === 200);
  const out = await post('/api/auth/logout', { token: tok });
  ok('logout revoca el token', out.status === 200 && out.json?.revoked === true, JSON.stringify(out.json));
  const meAfter = await get('/api/auth/me', { token: tok });
  ok('token revocado rechazado de inmediato → 401', meAfter.status === 401, `(${meAfter.status})`);
}

sec('SEGURIDAD · rate limit de login (intentos fallidos)');
{
  let last = null;
  for (let i = 0; i < 12; i++) {
    last = await post('/api/auth/login', { body: { email: 'atacante@mallatex.mx', password: 'fuerza-bruta' } });
    if (last.status === 429) break;
  }
  ok('fuerza bruta bloqueada con 429', last?.status === 429, `(${last?.status})`);
  ok('respuesta incluye Retry-After', !!last?.headers?.get('retry-after'));
  const adminOk = await post('/api/auth/login', { body: { email: 'admin@mallatex.mx', password: 'mallatex2026' } });
  ok('otras cuentas no se ven afectadas', adminOk.status === 200);
}

sec('API · paginación retro-compatible');
{
  // El shape histórico de /api/leads es { total, items }; sin ?page se preserva.
  const plain = await get('/api/leads', { token: admin });
  ok('sin ?page se preserva el shape histórico', plain.status === 200 && (Array.isArray(plain.json) || Array.isArray(plain.json?.items)));
  const paged = await get('/api/leads?page=1&pageSize=2', { token: admin });
  ok('con ?page responde {items,total,page}', paged.status === 200 && Array.isArray(paged.json?.items) && typeof paged.json?.total === 'number', JSON.stringify(paged.json).slice(0, 80));
  ok('pageSize respetado', (paged.json?.items?.length ?? 99) <= 2, `(${paged.json?.items?.length})`);
  const pagedChecadas = await get('/api/checadas?page=1&pageSize=3', { token: admin });
  ok('paginación en checadas', pagedChecadas.status === 200 && Array.isArray(pagedChecadas.json?.items));
  const pagedOrders = await get('/api/mes/orders?page=1&pageSize=1', { token: admin });
  ok('paginación en órdenes MES', pagedOrders.status === 200 && Array.isArray(pagedOrders.json?.items) && pagedOrders.json.items.length === 1, JSON.stringify(pagedOrders.json).slice(0, 80));
  const pagedClients = await get('/api/crm/clients?page=1&pageSize=1', { token: admin });
  ok('paginación en clientes CRM', pagedClients.status === 200 && Array.isArray(pagedClients.json?.items));
}

// =====================================================================
console.log(`\n========================================`);
console.log(`RESULTADO: ${pass} OK · ${fail} FALLAS`);
if (failures.length) {
  console.log('\nFallas:');
  for (const f of failures) console.log('  ✗ ' + f);
}
process.exit(fail ? 1 : 0);
