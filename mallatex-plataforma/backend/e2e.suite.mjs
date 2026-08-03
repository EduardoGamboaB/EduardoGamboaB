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
  ok('admin recibe 35 módulos web', r.json?.modules?.length === 35, `(${r.json?.modules?.length})`);
  admin = r.json?.token;

  const bad = await post('/api/auth/login', { body: { email: 'admin@mallatex.mx', password: 'incorrecta' } });
  ok('password incorrecto → 401', bad.status === 401);

  const rc = await post('/api/auth/login', { body: { code: 'MTX002', pin: '1234' } });
  ok('login empleado comercial (MTX002)', rc.status === 200 && rc.json?.employee?.profile === 'comercial');
  ok('MTX002 recibe 14 módulos móviles', rc.json?.modules?.length === 14, `(${rc.json?.modules?.length})`);
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
  ok('listar usuarios (4 sembrados)', list.status === 200 && list.json?.length === 4, `(${list.json?.length})`);
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
  ok('catálogo móvil (17 módulos)', cat.status === 200 && cat.json?.length === 17, `(${cat.json?.length})`);
  const m = await get('/api/access/matrix', { token: admin });
  ok('matriz completa (127 grants)', m.status === 200 && m.json?.grants?.length === 127, `(${m.json?.grants?.length})`);
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
}

// =====================================================================
// 6. DEUDA TÉCNICA — sesiones, rate limit y paginación
// =====================================================================
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
  const plain = await get('/api/leads', { token: admin });
  ok('sin ?page el shape sigue siendo arreglo', plain.status === 200 && Array.isArray(plain.json));
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
