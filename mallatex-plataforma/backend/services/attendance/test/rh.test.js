import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  vacationDaysForYears,
  yearsOfService,
  vacationBalance,
  computePayslip,
  daysBetween,
  overlapDays,
} from '../src/domain/Rh.js';

// ---------- vacationDaysForYears (LFT "vacaciones dignas" 2023) ----------

test('LFT 2023 vacation table', () => {
  assert.equal(vacationDaysForYears(0), 0);
  assert.equal(vacationDaysForYears(1), 12);
  assert.equal(vacationDaysForYears(2), 14);
  assert.equal(vacationDaysForYears(3), 16);
  assert.equal(vacationDaysForYears(4), 18);
  assert.equal(vacationDaysForYears(5), 20);
  // +2 per 5-year block from the 6th year on
  assert.equal(vacationDaysForYears(6), 22);
  assert.equal(vacationDaysForYears(10), 22);
  assert.equal(vacationDaysForYears(11), 24);
  assert.equal(vacationDaysForYears(15), 24);
  assert.equal(vacationDaysForYears(16), 26);
});

test('yearsOfService counts full anniversaries only', () => {
  const ref = new Date('2026-08-03T12:00:00');
  assert.equal(yearsOfService('2020-08-03', ref), 6, 'anniversary today counts');
  assert.equal(yearsOfService('2020-08-04', ref), 5, 'anniversary tomorrow does not');
  assert.equal(yearsOfService(null, ref), 0);
  assert.equal(yearsOfService('2027-01-01', ref), 0, 'future hire clamps to 0');
});

test('vacationBalance = entitled − taken (authorized, current service year)', () => {
  const ref = new Date('2026-08-03T12:00:00');
  const employee = { id: 1, hireDate: '2024-01-15' }; // 2 years → 14 days
  const incidents = [
    { employeeId: 1, type: 'vacaciones', status: 'autorizada', startDate: '2026-03-02', endDate: '2026-03-06' }, // 5 days
    { employeeId: 1, type: 'vacaciones', status: 'pendiente', startDate: '2026-04-01', endDate: '2026-04-03' }, // ignored
    { employeeId: 2, type: 'vacaciones', status: 'autorizada', startDate: '2026-03-02', endDate: '2026-03-06' }, // other emp
  ];
  const b = vacationBalance(employee, incidents, ref);
  assert.equal(b.years, 2);
  assert.equal(b.entitled, 14);
  assert.equal(b.taken, 5);
  assert.equal(b.available, 9);
});

// ---------- computePayslip ----------

test('computePayslip totals: sueldo, overtime, deductions, neto', () => {
  const period = { startDate: '2026-03-01', endDate: '2026-03-15' }; // 15 natural days
  const employee = { id: 1, dailySalary: 500 };
  const attendanceRows = [
    { status: 'asistencia', workedMinutes: 480 },
    { status: 'falta' },
  ];
  const overtimeAuth = [
    { type: 'ordinario', authorizedMinutes: 60 }, // 1 h double → (500/8)*2 = 125
    { type: 'doble', authorizedMinutes: 120 }, // 2 h triple → (500/8)*3*2 = 375
  ];
  const p = computePayslip(period, employee, { attendanceRows, overtimeAuth });

  assert.equal(p.naturalDays, 15);
  const sueldo = p.perceptions.find((x) => x.concepto === 'Sueldo');
  assert.equal(sueldo.importe, 7500);
  assert.equal(p.perceptions.find((x) => x.concepto === 'Tiempo extra doble').importe, 125);
  assert.equal(p.perceptions.find((x) => x.concepto === 'Tiempo extra triple').importe, 375);
  assert.equal(p.perceptions.find((x) => x.concepto === 'Bono de puntualidad'), undefined,
    'a falta kills the bonus');

  const faltas = p.deductions.find((x) => x.concepto === 'Faltas');
  assert.equal(faltas.dias, 1);
  assert.equal(faltas.importe, 500);

  assert.equal(p.totalP, 8000);
  assert.equal(p.totalD, 500);
  assert.equal(p.neto, 7500);
});

test('computePayslip: clean period earns the punctuality bonus', () => {
  const period = { startDate: '2026-03-01', endDate: '2026-03-07' }; // 7 days
  const employee = { id: 1, dailySalary: 400 };
  const p = computePayslip(period, employee, {
    attendanceRows: [{ status: 'asistencia' }],
  });
  const bono = p.perceptions.find((x) => x.concepto === 'Bono de puntualidad');
  assert.equal(bono.importe, 300);
  assert.equal(p.totalP, 400 * 7 + 300);
  assert.equal(p.totalD, 0);
  assert.equal(p.neto, p.totalP);
});

test('computePayslip deducts permiso sin goce overlapping the period', () => {
  const period = { startDate: '2026-03-01', endDate: '2026-03-15' };
  const employee = { id: 1, dailySalary: 100 };
  const incidents = [
    { employeeId: 1, type: 'permiso_singoce', status: 'autorizada', startDate: '2026-03-14', endDate: '2026-03-17' },
  ];
  const p = computePayslip(period, employee, { incidents });
  const psg = p.deductions.find((x) => x.concepto === 'Permiso sin goce');
  assert.equal(psg.dias, 2, 'only the 2 days inside the period');
  assert.equal(psg.importe, 200);
});

// ---------- date helpers ----------

test('daysBetween is inclusive of both ends', () => {
  assert.equal(daysBetween('2026-03-01', '2026-03-01'), 1);
  assert.equal(daysBetween('2026-03-01', '2026-03-15'), 15);
});

test('overlapDays clips to the intersection and returns 0 when disjoint', () => {
  assert.equal(overlapDays('2026-03-14', '2026-03-17', '2026-03-01', '2026-03-15'), 2);
  assert.equal(overlapDays('2026-04-01', '2026-04-05', '2026-03-01', '2026-03-15'), 0);
});
