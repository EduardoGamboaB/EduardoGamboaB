// Lógica de Recursos Humanos: derecho a vacaciones (LFT 2023), cálculo de recibo
// preliminar e indicadores agregados.

import * as db from './db.js';
import { periodSummary } from './rules.js';

// ---------- Vacaciones (LFT "vacaciones dignas", 2023) ----------
export function vacationDaysForYears(years) {
  if (years < 1) return 0;
  if (years <= 5) return 10 + years * 2; // 1→12, 2→14, ... 5→20
  // A partir del 6º año: +2 días por cada bloque de 5 años
  return 20 + Math.ceil((years - 5) / 5) * 2; // 6-10→22, 11-15→24, ...
}

function yearsOfService(hireDate, ref = new Date()) {
  if (!hireDate) return 0;
  const h = new Date(hireDate + 'T00:00:00');
  let y = ref.getFullYear() - h.getFullYear();
  const m = ref.getMonth() - h.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < h.getDate())) y--;
  return Math.max(0, y);
}

// Días de vacaciones tomados (autorizados) en el año de servicio en curso.
function vacationTaken(employeeId, hireDate, ref = new Date()) {
  const y = yearsOfService(hireDate, ref);
  const anchor = hireDate ? new Date(hireDate + 'T00:00:00') : ref;
  const start = new Date(ref.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (start > ref) start.setFullYear(start.getFullYear() - 1);
  const startStr = start.toISOString().slice(0, 10);
  const incs = db.all('incidents', (i) => i.employeeId === employeeId && i.type === 'vacaciones' && i.status === 'autorizada' && i.endDate >= startStr);
  let days = 0;
  for (const i of incs) days += daysBetween(i.startDate, i.endDate);
  return { taken: days, serviceYear: y };
}

function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000) + 1;
}

export function vacationBalance(employee, ref = new Date()) {
  const years = yearsOfService(employee.hireDate, ref);
  const entitled = vacationDaysForYears(years);
  const { taken } = vacationTaken(employee.id, employee.hireDate, ref);
  return { years, entitled, taken, available: Math.max(0, entitled - taken) };
}

// ---------- Recibo preliminar ----------
// El cálculo fiscal definitivo (ISR/IMSS) se realiza en Aspel NOI.
export function computePayslip(period, employee) {
  const settings = db.getSettings();
  const daily = Number(employee.dailySalary) || 0;
  const s = periodSummary(period, employee.id);
  const c = s.counters;
  const naturalDays = daysBetween(period.startDate, period.endDate);

  const perceptions = [];
  const deductions = [];

  // Sueldo base del periodo (días naturales)
  perceptions.push({ concepto: 'Sueldo', dias: naturalDays, importe: round2(daily * naturalDays) });

  // Tiempo extra autorizado
  const ot = db.all('overtime', (o) => o.employeeId === employee.id && o.status === 'autorizada' && o.date >= period.startDate && o.date <= period.endDate);
  let otOrd = 0, otDob = 0;
  for (const o of ot) { const hrs = (o.authorizedMinutes || 0) / 60; if (o.type === 'ordinario') otOrd += hrs; else otDob += hrs; }
  const hourly = daily / 8;
  if (otOrd > 0) perceptions.push({ concepto: 'Tiempo extra doble', horas: round2(otOrd), importe: round2(otOrd * hourly * 2) });
  if (otDob > 0) perceptions.push({ concepto: 'Tiempo extra triple', horas: round2(otDob), importe: round2(otDob * hourly * 3) });

  // Bono de puntualidad
  if (s.bonusEligible) perceptions.push({ concepto: 'Bono de puntualidad', importe: round2(settings.bonusAmount ?? 300) });

  // Deducciones: faltas injustificadas y permisos sin goce
  if (c.faltas > 0) deductions.push({ concepto: 'Faltas', dias: c.faltas, importe: round2(daily * c.faltas) });
  const permisoSinGoce = db.all('incidents', (i) => i.employeeId === employee.id && i.type === 'permiso_singoce' && i.status === 'autorizada' && !(i.endDate < period.startDate || i.startDate > period.endDate));
  let psgDays = 0;
  for (const i of permisoSinGoce) psgDays += overlapDays(i.startDate, i.endDate, period.startDate, period.endDate);
  if (psgDays > 0) deductions.push({ concepto: 'Permiso sin goce', dias: psgDays, importe: round2(daily * psgDays) });

  const totalP = round2(perceptions.reduce((a, p) => a + p.importe, 0));
  const totalD = round2(deductions.reduce((a, d) => a + d.importe, 0));
  return { perceptions, deductions, totalP, totalD, neto: round2(totalP - totalD), naturalDays, counters: c };
}

// ---------- Indicadores RH ----------
export function indicators(period) {
  const employees = db.all('employees', (e) => e.active !== false);
  const att = db.all('attendance', (a) => a.date >= period.startDate && a.date <= period.endDate);
  let asis = 0, ret = 0, falt = 0, omi = 0;
  const byArea = {};
  const retByEmp = {};
  for (const a of att) {
    const emp = employees.find((e) => e.id === a.employeeId); if (!emp) continue;
    byArea[emp.department] ||= { asistencias: 0, retardos: 0, faltas: 0 };
    if (a.status === 'asistencia') { asis++; byArea[emp.department].asistencias++; }
    else if (a.status === 'retardo') { ret++; byArea[emp.department].retardos++; retByEmp[emp.id] = (retByEmp[emp.id] || 0) + 1; }
    else if (a.status === 'falta') { falt++; byArea[emp.department].faltas++; }
    else if (a.status === 'omision') { omi++; }
  }
  const laborables = asis + ret + falt + omi || 1;
  const otAuth = db.all('overtime', (o) => o.status === 'autorizada' && o.date >= period.startDate && o.date <= period.endDate);
  const overtimeHours = round1(otAuth.reduce((x, o) => x + (o.authorizedMinutes || 0), 0) / 60);
  const bonusEligible = employees.filter((e) => periodSummary(period, e.id).bonusEligible).length;
  const topRetardos = Object.entries(retByEmp)
    .map(([id, n]) => ({ employee: employees.find((e) => e.id === Number(id))?.name, retardos: n }))
    .sort((a, b) => b.retardos - a.retardos).slice(0, 5);

  return {
    period,
    empleados: employees.length,
    asistencia: round1(((asis + ret) / laborables) * 100),
    puntualidad: round1((asis / (asis + ret || 1)) * 100),
    ausentismo: round1(((falt + omi) / laborables) * 100),
    overtimeHours,
    bonusEligible,
    counts: { asistencias: asis, retardos: ret, faltas: falt, omisiones: omi },
    byArea,
    topRetardos,
    ticketsAbiertos: db.all('tickets', (t) => t.status !== 'resuelto').length,
    incidenciasPendientes: db.all('incidents', (i) => i.status === 'pendiente').length,
  };
}

function overlapDays(aS, aE, bS, bE) { const s = aS > bS ? aS : bS, e = aE < bE ? aE : bE; return s > e ? 0 : daysBetween(s, e); }
function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function round1(n) { return Math.round((n + Number.EPSILON) * 10) / 10; }
