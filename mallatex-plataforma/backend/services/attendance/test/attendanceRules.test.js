import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeDay,
  overtimeCandidate,
  periodSummary,
  defaultSettings,
  hmToMinutes,
  minutesToHm,
  isoDow,
  STATUS,
} from '../src/domain/AttendanceRules.js';

// 2026-03-02 is a Monday, 2026-03-01 a Sunday (checked with isoDow below).
const MON = '2026-03-02';
const SUN = '2026-03-01';

const employee = { id: 1, name: 'Juan' };
const schedule = {
  id: 10,
  entryTime: '08:00',
  exitTime: '17:00',
  toleranceMinutes: 10,
  lateAfterMinutes: 15, // beyond 15 min late = falta
  lunchMinutes: 0,
  workDays: [1, 2, 3, 4, 5],
};

const check = (hm, day = MON, employeeId = 1) => ({ employeeId, timestamp: `${day}T${hm}:00` });

test('sanity: iso day-of-week helpers', () => {
  assert.equal(isoDow(MON), 1);
  assert.equal(isoDow(SUN), 7);
  assert.equal(hmToMinutes('08:30'), 510);
  assert.equal(minutesToHm(510), '08:30');
});

test('puntual (within tolerance) → asistencia, no late minutes', () => {
  const day = computeDay(employee, MON, {
    schedule,
    checadas: [check('08:05'), check('17:02')],
  });
  assert.equal(day.status, STATUS.ASISTENCIA);
  assert.equal(day.lateMinutes, 0);
  assert.equal(day.checadaCount, 2);
  assert.equal(day.workedMinutes, 17 * 60 + 2 - (8 * 60 + 5));
});

test('12 minutes late → retardo with lateMinutes 12', () => {
  const day = computeDay(employee, MON, {
    schedule,
    checadas: [check('08:12'), check('17:00')],
  });
  assert.equal(day.status, STATUS.RETARDO);
  assert.equal(day.lateMinutes, 12);
  assert.match(day.autoNote, /Retardo de 12 min/);
});

test('late beyond lateAfterMinutes (>15) → falta por retardo mayor', () => {
  const day = computeDay(employee, MON, {
    schedule,
    checadas: [check('08:16'), check('17:00')],
  });
  assert.equal(day.status, STATUS.FALTA);
  assert.equal(day.lateMinutes, 16);
  assert.match(day.autoNote, /Falta por retardo mayor \(16 min\)/);
});

test('single checada on a workday → omisión', () => {
  const day = computeDay(employee, MON, { schedule, checadas: [check('08:00')] });
  assert.equal(day.status, STATUS.OMISION);
  assert.equal(day.checadaCount, 1);
  assert.match(day.autoNote, /una sola checada/);
});

test('no checadas on a workday → falta', () => {
  const day = computeDay(employee, MON, { schedule, checadas: [] });
  assert.equal(day.status, STATUS.FALTA);
  assert.match(day.autoNote, /Sin registros/);
});

test('non-working day without checadas → descanso', () => {
  const day = computeDay(employee, SUN, { schedule, checadas: [] });
  assert.equal(day.status, STATUS.DESCANSO);
  assert.match(day.autoNote, /descanso/i);
});

test('working on a rest day counts everything as potential overtime', () => {
  const day = computeDay(employee, SUN, {
    schedule,
    checadas: [check('09:00', SUN), check('13:00', SUN)],
  });
  assert.equal(day.status, STATUS.DESCANSO);
  assert.equal(day.workedMinutes, 240);
  assert.equal(day.overtimeMinutes, 240);
});

test('authorized incidencia dominates (vacaciones), even with checadas', () => {
  const incident = {
    id: 99,
    employeeId: 1,
    type: 'vacaciones',
    status: 'autorizada',
    startDate: '2026-03-01',
    endDate: '2026-03-05',
    reason: 'Vacaciones anuales',
  };
  const day = computeDay(employee, MON, {
    schedule,
    checadas: [check('08:00'), check('17:00')],
    incidents: [incident],
  });
  assert.equal(day.status, STATUS.VACACIONES);
  assert.equal(day.incidentId, 99);
  assert.equal(day.checadaCount, 0, 'checadas are not even counted');
});

test('pending (unauthorized) incidencia does NOT dominate', () => {
  const incident = {
    id: 99, employeeId: 1, type: 'vacaciones', status: 'pendiente',
    startDate: '2026-03-01', endDate: '2026-03-05',
  };
  const day = computeDay(employee, MON, { schedule, checadas: [], incidents: [incident] });
  assert.equal(day.status, STATUS.FALTA);
});

test('overtime ≥ threshold and ≥ minimum block is credited', () => {
  const day = computeDay(employee, MON, {
    schedule,
    checadas: [check('08:00'), check('18:00')], // 60 min past exit
  });
  assert.equal(day.overtimeMinutes, 60);
  const cand = overtimeCandidate(day);
  assert.equal(cand.calculatedMinutes, 60);
  assert.equal(cand.type, 'ordinario');
  assert.equal(cand.status, 'pendiente');
});

test('overtime past threshold but under the minimum block is discarded', () => {
  // default: threshold 15, min block 30 → 20 min past exit yields 0
  const day = computeDay(employee, MON, {
    schedule,
    checadas: [check('08:00'), check('17:20')],
  });
  assert.equal(day.overtimeMinutes, 0);
  assert.equal(overtimeCandidate(day), null);
});

test('early leave beyond threshold records earlyLeaveMinutes', () => {
  const day = computeDay(employee, MON, {
    schedule,
    checadas: [check('08:00'), check('16:30')], // 30 min early (> default 10)
  });
  assert.equal(day.earlyLeaveMinutes, 30);
});

test('checadas of other employees or other dates are ignored', () => {
  const day = computeDay(employee, MON, {
    schedule,
    checadas: [check('08:00', MON, 2), check('08:00', '2026-03-03')],
  });
  assert.equal(day.status, STATUS.FALTA);
  assert.equal(day.checadaCount, 0);
});

// ---------- periodSummary ----------

test('periodSummary counts statuses and decides bonus eligibility', () => {
  const rows = [
    { status: STATUS.ASISTENCIA, workedMinutes: 480 },
    { status: STATUS.ASISTENCIA, workedMinutes: 480 },
    { status: STATUS.RETARDO, lateMinutes: 12, workedMinutes: 470 },
    { status: STATUS.DESCANSO },
  ];
  const s = periodSummary({}, { id: 1 }, {
    attendanceRows: rows,
    overtimeAuth: [{ authorizedMinutes: 90 }],
  });
  assert.equal(s.counters.asistencias, 2);
  assert.equal(s.counters.retardos, 1);
  assert.equal(s.counters.descansos, 1);
  assert.equal(s.counters.lateMinutes, 12);
  assert.equal(s.counters.workedMinutes, 1430);
  assert.equal(s.overtimeMinutes, 90);
  assert.equal(s.bonusEligible, true, '1 retardo ≤ 2 allowed keeps the bonus');
});

test('periodSummary: a single falta or omisión kills the bonus', () => {
  const withFalta = periodSummary({}, { id: 1 }, { attendanceRows: [{ status: STATUS.FALTA }] });
  assert.equal(withFalta.bonusEligible, false);
  const withOmision = periodSummary({}, { id: 1 }, { attendanceRows: [{ status: STATUS.OMISION }] });
  assert.equal(withOmision.bonusEligible, false);
  const threeRetardos = periodSummary({}, { id: 1 }, {
    attendanceRows: [1, 2, 3].map(() => ({ status: STATUS.RETARDO })),
  });
  assert.equal(threeRetardos.bonusEligible, false, '3 retardos > default max of 2');
});

test('defaultSettings exposes the documented operational numbers', () => {
  const s = defaultSettings();
  assert.equal(s.overtimeThresholdMin, 15);
  assert.equal(s.overtimeMinBlockMin, 30);
  assert.equal(s.bonusMaxRetardos, 2);
  assert.equal(s.bonusAllowFaltas, 0);
  assert.equal(s.bonusAmount, 300);
});
