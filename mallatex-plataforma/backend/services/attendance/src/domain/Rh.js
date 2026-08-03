// Lógica de Recursos Humanos (servicio de dominio puro): derecho a vacaciones
// (LFT "vacaciones dignas", 2023), cálculo de recibo preliminar e indicadores
// agregados. Portado de server/rh.js; recibe los datos ya cargados.

import { periodSummary, defaultSettings } from './AttendanceRules.js';

// ---------- Vacaciones (LFT "vacaciones dignas", 2023) ----------
export function vacationDaysForYears(years) {
  if (years < 1) return 0;
  if (years <= 5) return 10 + years * 2; // 1→12, 2→14, ... 5→20
  // A partir del 6º año: +2 días por cada bloque de 5 años
  return 20 + Math.ceil((years - 5) / 5) * 2; // 6-10→22, 11-15→24, ...
}

export function yearsOfService(hireDate, ref = new Date()) {
  if (!hireDate) return 0;
  const h = new Date(hireDate + 'T00:00:00');
  let y = ref.getFullYear() - h.getFullYear();
  const m = ref.getMonth() - h.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < h.getDate())) y--;
  return Math.max(0, y);
}

function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00');
  const d2 = new Date(b + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000) + 1;
}

// Días de vacaciones tomados (autorizados) en el año de servicio en curso.
// `vacationIncidents` = incidencias de vacaciones autorizadas del empleado.
function vacationTaken(hireDate, vacationIncidents, ref = new Date()) {
  const anchor = hireDate ? new Date(hireDate + 'T00:00:00') : ref;
  const start = new Date(ref.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (start > ref) start.setFullYear(start.getFullYear() - 1);
  const startStr = start.toISOString().slice(0, 10);
  let days = 0;
  for (const i of vacationIncidents) {
    if (i.type === 'vacaciones' && i.status === 'autorizada' && i.endDate >= startStr) {
      days += daysBetween(i.startDate, i.endDate);
    }
  }
  return days;
}

export function vacationBalance(employee, incidents = [], ref = new Date()) {
  const years = yearsOfService(employee.hireDate, ref);
  const entitled = vacationDaysForYears(years);
  const own = incidents.filter((i) => i.employeeId === employee.id);
  const taken = vacationTaken(employee.hireDate, own, ref);
  return { years, entitled, taken, available: Math.max(0, entitled - taken) };
}

// ---------- Recibo preliminar ----------
// El cálculo fiscal definitivo (ISR/IMSS) se realiza en Aspel NOI.
export function computePayslip(period, employee, { attendanceRows = [], overtimeAuth = [], incidents = [], settings = {} } = {}) {
  const cfg = { ...defaultSettings(), ...settings };
  const daily = Number(employee.dailySalary) || 0;
  const s = periodSummary(period, employee, { attendanceRows, overtimeAuth, settings: cfg });
  const c = s.counters;
  const naturalDays = daysBetween(period.startDate, period.endDate);

  const perceptions = [];
  const deductions = [];

  // Sueldo base del periodo (días naturales)
  perceptions.push({ concepto: 'Sueldo', dias: naturalDays, importe: round2(daily * naturalDays) });

  // Tiempo extra autorizado
  let otOrd = 0, otDob = 0;
  for (const o of overtimeAuth) {
    const hrs = (o.authorizedMinutes || 0) / 60;
    if (o.type === 'ordinario') otOrd += hrs; else otDob += hrs;
  }
  const hourly = daily / 8;
  if (otOrd > 0) perceptions.push({ concepto: 'Tiempo extra doble', horas: round2(otOrd), importe: round2(otOrd * hourly * 2) });
  if (otDob > 0) perceptions.push({ concepto: 'Tiempo extra triple', horas: round2(otDob), importe: round2(otDob * hourly * 3) });

  // Bono de puntualidad
  if (s.bonusEligible) perceptions.push({ concepto: 'Bono de puntualidad', importe: round2(cfg.bonusAmount ?? 300) });

  // Deducciones: faltas injustificadas y permisos sin goce
  if (c.faltas > 0) deductions.push({ concepto: 'Faltas', dias: c.faltas, importe: round2(daily * c.faltas) });
  const permisoSinGoce = incidents.filter(
    (i) => i.employeeId === employee.id && i.type === 'permiso_singoce' && i.status === 'autorizada' &&
      !(i.endDate < period.startDate || i.startDate > period.endDate)
  );
  let psgDays = 0;
  for (const i of permisoSinGoce) psgDays += overlapDays(i.startDate, i.endDate, period.startDate, period.endDate);
  if (psgDays > 0) deductions.push({ concepto: 'Permiso sin goce', dias: psgDays, importe: round2(daily * psgDays) });

  const totalP = round2(perceptions.reduce((a, p) => a + p.importe, 0));
  const totalD = round2(deductions.reduce((a, d) => a + d.importe, 0));
  return { perceptions, deductions, totalP, totalD, neto: round2(totalP - totalD), naturalDays, counters: c };
}

// ---------- Indicadores RH ----------
// `summaries` = Map/objeto empId -> periodSummary; se calcula en la capa de aplicación.
export function indicators(period, { employees = [], attendanceRows = [], overtimeAuth = [], tickets = [], incidents = [], bonusEligibleCount = 0 } = {}) {
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
  let asis = 0, ret = 0, falt = 0, omi = 0;
  const byArea = {};
  const retByEmp = {};
  for (const a of attendanceRows) {
    const emp = empById[a.employeeId];
    if (!emp) continue;
    byArea[emp.department] ||= { asistencias: 0, retardos: 0, faltas: 0 };
    if (a.status === 'asistencia') { asis++; byArea[emp.department].asistencias++; }
    else if (a.status === 'retardo') { ret++; byArea[emp.department].retardos++; retByEmp[emp.id] = (retByEmp[emp.id] || 0) + 1; }
    else if (a.status === 'falta') { falt++; byArea[emp.department].faltas++; }
    else if (a.status === 'omision') { omi++; }
  }
  const laborables = asis + ret + falt + omi || 1;
  const overtimeHours = round1(overtimeAuth.reduce((x, o) => x + (o.authorizedMinutes || 0), 0) / 60);
  const topRetardos = Object.entries(retByEmp)
    .map(([id, n]) => ({ employee: empById[Number(id)]?.name, retardos: n }))
    .sort((a, b) => b.retardos - a.retardos).slice(0, 5);

  return {
    period,
    empleados: employees.length,
    asistencia: round1(((asis + ret) / laborables) * 100),
    puntualidad: round1((asis / (asis + ret || 1)) * 100),
    ausentismo: round1(((falt + omi) / laborables) * 100),
    overtimeHours,
    bonusEligible: bonusEligibleCount,
    counts: { asistencias: asis, retardos: ret, faltas: falt, omisiones: omi },
    byArea,
    topRetardos,
    ticketsAbiertos: tickets.filter((t) => t.status !== 'resuelto').length,
    incidenciasPendientes: incidents.filter((i) => i.status === 'pendiente').length,
  };
}

function overlapDays(aS, aE, bS, bE) { const s = aS > bS ? aS : bS, e = aE < bE ? aE : bE; return s > e ? 0 : daysBetween(s, e); }
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function round1(n) { return Math.round((n + Number.EPSILON) * 10) / 10; }

export { daysBetween, overlapDays };
