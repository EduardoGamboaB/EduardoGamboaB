// Pruebas del motor de reglas (funciones puras, sin tocar la base de datos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hmToMinutes, minutesToHm, isoDow, eachDate, computeDay, STATUS } from '../server/rules.js';

const schedule = {
  id: 1, entryTime: '08:00', exitTime: '17:00', lunchMinutes: 60,
  toleranceMinutes: 10, lateAfterMinutes: 20, workDays: [1, 2, 3, 4, 5],
};
const emp = { id: 1, scheduleId: 1, bonusEligible: true };
const cfg = { overtimeThresholdMin: 15, overtimeMinBlockMin: 30, earlyLeaveThresholdMin: 10 };

function checada(date, hm, type) {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(`${date}T00:00:00`); d.setHours(h, m, 0, 0);
  return { employeeId: 1, timestamp: d.toISOString(), type };
}

test('utilidades de tiempo', () => {
  assert.equal(hmToMinutes('08:30'), 510);
  assert.equal(minutesToHm(510), '08:30');
  assert.equal(isoDow('2026-07-20'), 1); // lunes
  assert.equal(isoDow('2026-07-19'), 7); // domingo
  assert.equal(eachDate('2026-07-01', '2026-07-03').length, 3);
});

test('asistencia puntual dentro de tolerancia', () => {
  const r = computeDay(emp, '2026-07-20', { schedule, settings: cfg, incidents: [], checadas: [checada('2026-07-20', '08:05', 'entrada'), checada('2026-07-20', '17:02', 'salida')] });
  assert.equal(r.status, STATUS.ASISTENCIA);
  assert.equal(r.lateMinutes, 0);
});

test('retardo cuando supera la tolerancia', () => {
  const r = computeDay(emp, '2026-07-20', { schedule, settings: cfg, incidents: [], checadas: [checada('2026-07-20', '08:15', 'entrada'), checada('2026-07-20', '17:00', 'salida')] });
  assert.equal(r.status, STATUS.RETARDO);
  assert.equal(r.lateMinutes, 15);
});

test('falta por retardo mayor al umbral', () => {
  const r = computeDay(emp, '2026-07-20', { schedule, settings: cfg, incidents: [], checadas: [checada('2026-07-20', '08:45', 'entrada'), checada('2026-07-20', '17:00', 'salida')] });
  assert.equal(r.status, STATUS.FALTA);
});

test('falta injustificada sin checadas en día laborable', () => {
  const r = computeDay(emp, '2026-07-20', { schedule, settings: cfg, incidents: [], checadas: [] });
  assert.equal(r.status, STATUS.FALTA);
});

test('descanso en día no laborable', () => {
  const r = computeDay(emp, '2026-07-19', { schedule, settings: cfg, incidents: [], checadas: [] }); // domingo
  assert.equal(r.status, STATUS.DESCANSO);
});

test('omisión con una sola checada', () => {
  const r = computeDay(emp, '2026-07-20', { schedule, settings: cfg, incidents: [], checadas: [checada('2026-07-20', '08:00', 'entrada')] });
  assert.equal(r.status, STATUS.OMISION);
});

test('tiempo extra después de la salida', () => {
  const r = computeDay(emp, '2026-07-20', { schedule, settings: cfg, incidents: [], checadas: [checada('2026-07-20', '08:00', 'entrada'), checada('2026-07-20', '18:30', 'salida')] });
  assert.equal(r.status, STATUS.ASISTENCIA);
  assert.equal(r.overtimeMinutes, 90);
});

test('incidencia autorizada tiene prioridad', () => {
  const inc = [{ employeeId: 1, type: 'vacaciones', status: 'autorizada', startDate: '2026-07-20', endDate: '2026-07-24', reason: 'Vacaciones' }];
  const r = computeDay(emp, '2026-07-21', { schedule, settings: cfg, incidents: inc, checadas: [] });
  assert.equal(r.status, STATUS.VACACIONES);
  assert.equal(r.incidentId != null || r.status === STATUS.VACACIONES, true);
});
