import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeVariableImporte,
  toFile,
  buildMovements,
  defaultNoiConcepts,
  defaultVariableConcepts,
} from '../src/domain/NoiExport.js';

// ---------- computeVariableImporte ----------

test('modo tarifa: importe = cantidad × tarifa', () => {
  const concept = { modo: 'tarifa', rate: 2.5 };
  assert.equal(computeVariableImporte(concept, 100), 250);
  assert.equal(computeVariableImporte(concept, '10'), 25);
});

test('modo porcentaje: importe = base × (tarifa / 100)', () => {
  const concept = { modo: 'porcentaje', rate: 3 };
  assert.equal(computeVariableImporte(concept, 10000), 300);
  assert.equal(computeVariableImporte(concept, 333.33), 10);
});

test('modo importe: la cantidad ya es el importe (tarifa ignorada)', () => {
  const concept = { modo: 'importe', rate: 999 };
  assert.equal(computeVariableImporte(concept, 1234.567), 1234.57);
});

test('rateOverride replaces the concept rate; empty override falls back', () => {
  const concept = { modo: 'tarifa', rate: 2 };
  assert.equal(computeVariableImporte(concept, 10, 5), 50);
  assert.equal(computeVariableImporte(concept, 10, 0), 0, 'zero is a real override');
  assert.equal(computeVariableImporte(concept, 10, ''), 20);
  assert.equal(computeVariableImporte(concept, 10, null), 20);
  assert.equal(computeVariableImporte(concept, 10, undefined), 20);
});

test('invalid cantidad computes as 0', () => {
  assert.equal(computeVariableImporte({ modo: 'tarifa', rate: 2 }, 'abc'), 0);
});

// ---------- toFile ----------

const movs = [
  {
    noiKey: 'E001', noiNumber: 1001, tipo: 'D', descripcion: 'Faltas',
    unidad: 'dias', cantidad: 2, importe: 0, referencia: '2 día(s)',
  },
  {
    noiKey: 'E002', noiNumber: 2005, tipo: 'P', descripcion: 'Bono | especial',
    unidad: 'importe', cantidad: 300, importe: 300, referencia: 'bono íntegro',
  },
];

test('toFile txt: header + pipe separators + CRLF endings', () => {
  const out = toFile(movs, 'txt');
  const lines = out.split('\r\n');
  assert.equal(lines[0], 'CLAVE|CONCEPTO|TIPO|DESCRIPCION|UNIDAD|CANTIDAD|IMPORTE|REFERENCIA');
  assert.equal(lines[1], 'E001|1001|D|Faltas|dias|2|0|2 día(s)');
  assert.equal(lines[2], 'E002|2005|P|Bono   especial|importe|300|300|bono íntegro',
    'pipes inside fields are replaced by spaces');
  assert.ok(out.endsWith('\r\n'));
});

test('toFile csv: comma separators', () => {
  const out = toFile([movs[0]], 'csv');
  const lines = out.split('\r\n');
  assert.equal(lines[0], 'CLAVE,CONCEPTO,TIPO,DESCRIPCION,UNIDAD,CANTIDAD,IMPORTE,REFERENCIA');
  assert.equal(lines[1], 'E001,1001,D,Faltas,dias,2,0,2 día(s)');
});

test('toFile of no movements is just the header', () => {
  assert.equal(toFile([]), 'CLAVE|CONCEPTO|TIPO|DESCRIPCION|UNIDAD|CANTIDAD|IMPORTE|REFERENCIA\r\n');
});

// ---------- buildMovements (integration of the pure pipeline) ----------

test('buildMovements maps faltas/retardos/bono and variable entries', () => {
  const period = { id: 5, startDate: '2026-03-01', endDate: '2026-03-15' };
  const employees = [{ id: 1, code: 'E001', name: 'Juan' }, { id: 2, code: 'E002', name: 'Ana' }];
  const attendanceRows = [
    // Juan: 1 falta + 1 retardo → loses bonus
    { employeeId: 1, date: '2026-03-02', status: 'falta' },
    { employeeId: 1, date: '2026-03-03', status: 'retardo', lateMinutes: 12 },
    // Ana: clean → bonus
    { employeeId: 2, date: '2026-03-02', status: 'asistencia' },
  ];
  const variableConcepts = [{ ...defaultVariableConcepts()[0], id: 7 }]; // km_conductor
  const variableEntries = [
    { periodId: 5, employeeId: 2, conceptId: 7, cantidad: 100, importe: 250, note: '100 km' },
  ];
  const out = buildMovements(period, {
    employees,
    concepts: defaultNoiConcepts(),
    attendanceRows,
    variableConcepts,
    variableEntries,
  });

  const juan = out.movements.filter((m) => m.employeeId === 1);
  assert.deepEqual(juan.map((m) => m.conceptKey).sort(), ['falta', 'retardo']);
  assert.equal(juan.find((m) => m.conceptKey === 'falta').cantidad, 1);

  const ana = out.movements.filter((m) => m.employeeId === 2);
  const bono = ana.find((m) => m.conceptKey === 'bono_puntualidad');
  assert.equal(bono.cantidad, 300);
  assert.equal(bono.importe, 300, 'unidad importe copies cantidad into importe');
  const km = ana.find((m) => m.conceptKey === 'km_conductor');
  assert.equal(km.cantidad, 100);
  assert.equal(km.importe, 250);
  assert.equal(km.noiKey, 'E002', 'falls back to employee code when no noiKey');

  assert.deepEqual(out.pending, { overtime: 0, incidents: 0 });
});

test('buildMovements counts pending incidents/overtime that block export', () => {
  const period = { id: 5, startDate: '2026-03-01', endDate: '2026-03-15' };
  const out = buildMovements(period, {
    employees: [],
    concepts: defaultNoiConcepts(),
    incidents: [
      { status: 'pendiente', startDate: '2026-03-05', endDate: '2026-03-06' },
      { status: 'pendiente', startDate: '2026-04-01', endDate: '2026-04-02' }, // outside period
    ],
    overtimeRows: [{ status: 'pendiente', date: '2026-03-10' }],
  });
  assert.equal(out.pending.incidents, 1);
  assert.equal(out.pending.overtime, 1);
});
