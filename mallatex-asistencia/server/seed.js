// Siembra de datos demostrativos de Mallatex.
// Ejecutable:  node server/seed.js --reset
// También se invoca automáticamente en el primer arranque si la base está vacía.

import * as db from './db.js';
import { hashPassword, hashPin, ROLES } from './auth.js';
import { defaultNoiConcepts, defaultVariableConcepts, computeVariableImporte } from './noi.js';
import { syncDevice } from './checador.js';
import { reprocess } from './rules.js';
import { logSystem } from './audit.js';

const DEMO_PASSWORD = 'mallatex2026';

export function isEmpty() {
  return db.all('users').length === 0;
}

export function seed({ reset = false } = {}) {
  if (reset) {
    db.resetDb();
  } else if (!isEmpty()) {
    return { skipped: true };
  }

  // ----- Ajustes globales / reglas -----
  db.saveSettings({
    company: 'Mallatex',
    noiCompany: 'MALLATEX',
    branch: 'Guadalajara, Jalisco',
    overtimeThresholdMin: 15,
    overtimeMinBlockMin: 30,
    bonusMaxRetardos: 2,
    bonusAllowFaltas: 0,
    earlyLeaveThresholdMin: 10,
    bonusAmount: 300,
  });

  // ----- Usuarios (hasta 5 administrativos) -----
  const users = [
    { name: 'Armando Ríos', email: 'admin@mallatex.mx', role: ROLES.ADMIN, position: 'Dirección / Administrador' },
    { name: 'Laura Méndez', email: 'contabilidad@mallatex.mx', role: ROLES.CONTADOR, position: 'Contador general' },
    { name: 'Sofía Herrera', email: 'nomina@mallatex.mx', role: ROLES.NOMINA, position: 'Responsable de nómina' },
  ];
  for (const u of users) {
    db.insert('users', { ...u, password: hashPassword(DEMO_PASSWORD), active: true });
  }

  // ----- Dispositivo checador (Hikvision) -----
  const device = db.insert('devices', {
    name: 'Checador principal - Recepción',
    brand: 'Hikvision',
    model: 'DS-K1T671M (facial)',
    serial: 'HIK-MTX-0001',
    ip: '192.168.1.64',
    location: 'Planta Guadalajara',
    lastSync: null,
    active: true,
  });

  // ----- Horarios / turnos -----
  const turnoMatutino = db.insert('schedules', {
    name: 'Administrativo matutino',
    entryTime: '08:00', exitTime: '17:00', lunchMinutes: 60,
    toleranceMinutes: 10, lateAfterMinutes: 20, hoursPerDay: 8,
    workDays: [1, 2, 3, 4, 5],
  });
  const turnoProduccion = db.insert('schedules', {
    name: 'Producción (L-S)',
    entryTime: '07:00', exitTime: '16:30', lunchMinutes: 30,
    toleranceMinutes: 10, lateAfterMinutes: 15, hoursPerDay: 9,
    workDays: [1, 2, 3, 4, 5, 6],
  });
  const turnoOficina = db.insert('schedules', {
    name: 'Oficina flexible',
    entryTime: '09:00', exitTime: '18:00', lunchMinutes: 60,
    toleranceMinutes: 15, lateAfterMinutes: 30, hoursPerDay: 8,
    workDays: [1, 2, 3, 4, 5],
  });

  // ----- Catálogo de empleados (mapeados a NOI) -----
  const employees = [
    ['MTX001', 'Juan Carlos Pérez López', 'Producción', 'Operador de tejido', turnoProduccion.id, 420.5],
    ['MTX002', 'María Fernanda Gómez Ruiz', 'Producción', 'Operadora de acabado', turnoProduccion.id, 415.0],
    ['MTX003', 'Roberto Sánchez Díaz', 'Producción', 'Supervisor de línea', turnoProduccion.id, 680.0],
    ['MTX004', 'Ana Patricia Torres Vega', 'Administración', 'Auxiliar contable', turnoMatutino.id, 510.0],
    ['MTX005', 'Luis Enrique Ramírez Cruz', 'Almacén', 'Almacenista', turnoMatutino.id, 430.0],
    ['MTX006', 'Gabriela Morales Núñez', 'Ventas', 'Ejecutiva de ventas', turnoOficina.id, 590.0],
    ['MTX007', 'Jorge Alberto Castillo Mena', 'Producción', 'Operador de corte', turnoProduccion.id, 418.0],
    ['MTX008', 'Diana Laura Flores Ríos', 'Administración', 'Recepción y RH', turnoMatutino.id, 470.0],
    ['MTX009', 'Miguel Ángel Hernández Soto', 'Almacén', 'Jefe de almacén', turnoMatutino.id, 720.0],
    ['MTX010', 'Karla Jiménez Aguilar', 'Ventas', 'Coordinadora comercial', turnoOficina.id, 640.0],
    ['MTX011', 'Ricardo Vázquez Luna', 'Producción', 'Operador de empaque', turnoProduccion.id, 410.0],
    ['MTX012', 'Paola Andrea Reyes Campos', 'Administración', 'Asistente de dirección', turnoOficina.id, 560.0],
    ['MTX013', 'Fernando Aguirre Salas', 'Reparto', 'Conductor de reparto', turnoMatutino.id, 480.0],
  ];
  // Años de antigüedad variados (para saldos de vacaciones distintos)
  const hireYears = [2019, 2015, 2012, 2021, 2023, 2018, 2022, 2020, 2010, 2017, 2024, 2016, 2019];
  let idx = 0;
  for (const [code, name, department, position, scheduleId, dailySalary] of employees) {
    idx++;
    db.insert('employees', {
      code,
      noiKey: code, // clave con la que opera en NOI
      name,
      rfc: fakeRfc(name, idx),
      department,
      position,
      scheduleId,
      deviceId: device.id,
      checadorUserId: String(1000 + idx), // id de persona en el Hikvision
      pin: hashPin('1234'), // PIN de acceso al portal del empleado (demo, cifrado)
      dailySalary,
      hireDate: `${hireYears[idx - 1]}-03-01`,
      bonusEligible: true,
      active: true,
    });
  }

  // ----- Conceptos NOI -----
  for (const c of defaultNoiConcepts()) db.insert('noiConcepts', c);

  // ----- Conceptos de percepciones variables (kilometraje, costura m², comisión) -----
  const varConcepts = {};
  for (const c of defaultVariableConcepts()) {
    const created = db.insert('variableConcepts', c);
    varConcepts[created.key] = created;
  }

  // ----- Periodos de nómina (quincenal) -----
  db.insert('periods', {
    name: '1ª quincena julio 2026', startDate: '2026-07-01', endDate: '2026-07-15',
    status: 'cerrado', closedBy: 'Sofía Herrera', closedAt: '2026-07-16T10:00:00.000Z',
  });
  const current = db.insert('periods', {
    name: '2ª quincena julio 2026', startDate: '2026-07-16', endDate: '2026-07-31',
    status: 'abierto', closedBy: null, closedAt: null,
  });

  // ----- Descargar checadas simuladas (Hikvision) del 1 al 22 de julio -----
  syncDevice(device.id, { startDate: '2026-07-01', endDate: '2026-07-22', profile: 'realista' });

  // ----- Capturas de percepciones variables del periodo en curso -----
  const emps = db.all('employees');
  const byCode = Object.fromEntries(emps.map((e) => [e.code, e]));
  const captura = (code, conceptKey, cantidad, note) => {
    const emp = byCode[code];
    const concept = varConcepts[conceptKey];
    if (!emp || !concept) return;
    db.insert('variableEntries', {
      periodId: current.id,
      employeeId: emp.id,
      conceptId: concept.id,
      cantidad,
      rate: null, // usa la tarifa/porcentaje del concepto
      importe: computeVariableImporte(concept, cantidad, null),
      note: note || '',
      source: 'manual',
      createdBy: 'Sofía Herrera',
      createdAt: '2026-07-22T12:00:00.000Z',
    });
  };
  captura('MTX013', 'km_conductor', 640, 'Ruta reparto quincenal');       // 640 km × 2.5 = 1600
  captura('MTX001', 'costura_m2', 45, 'Costura extra pedido especial');   // 45 m² × 12 = 540
  captura('MTX002', 'costura_m2', 32, 'Acabado adicional');               // 32 m² × 12 = 384
  captura('MTX006', 'comision_ventas', 92000, 'Ventas del periodo');      // 92,000 × 3% = 2760
  captura('MTX010', 'comision_ventas', 118000, 'Ventas del periodo');     // 118,000 × 3% = 3540

  // ----- Algunas incidencias de ejemplo -----
  db.insert('incidents', {
    employeeId: emps[1].id, type: 'vacaciones',
    startDate: '2026-07-20', endDate: '2026-07-24',
    reason: 'Vacaciones programadas', status: 'autorizada',
    createdBy: 'Sofía Herrera', authorizedBy: 'Laura Méndez', createdAt: '2026-07-10T09:00:00.000Z',
  });
  db.insert('incidents', {
    employeeId: emps[4].id, type: 'incapacidad',
    startDate: '2026-07-17', endDate: '2026-07-18',
    reason: 'Incapacidad IMSS (2 días)', status: 'autorizada',
    createdBy: 'Diana Laura Flores Ríos', authorizedBy: 'Laura Méndez', createdAt: '2026-07-17T08:00:00.000Z',
  });
  db.insert('incidents', {
    employeeId: emps[6].id, type: 'permiso_singoce',
    startDate: '2026-07-21', endDate: '2026-07-21',
    reason: 'Asunto personal', status: 'pendiente',
    createdBy: 'Sofía Herrera', authorizedBy: null, createdAt: '2026-07-20T12:00:00.000Z',
  });

  // ----- Solicitud del portal del empleado (autoservicio) -----
  db.insert('incidents', {
    employeeId: emps[9].id, type: 'vacaciones',
    startDate: '2026-07-28', endDate: '2026-07-30',
    reason: 'Solicitud desde el portal', status: 'pendiente', selfService: true,
    createdBy: emps[9].name, authorizedBy: null, createdAt: '2026-07-21T10:30:00.000Z',
  });

  // ----- Tickets de RH de ejemplo -----
  db.insert('tickets', {
    employeeId: emps[0].id, employeeName: emps[0].name, category: 'Nómina',
    subject: 'Aclaración de retardo del 18 de julio', status: 'abierto', createdAt: '2026-07-21T09:15:00.000Z',
    messages: [{ by: emps[0].name, role: 'empleado', message: 'Buen día, marqué a tiempo pero aparece retardo el 18. ¿Pueden revisar?', at: '2026-07-21T09:15:00.000Z' }],
  });
  db.insert('tickets', {
    employeeId: emps[5].id, employeeName: emps[5].name, category: 'Recursos Humanos',
    subject: 'Constancia laboral', status: 'en_proceso', createdAt: '2026-07-20T16:40:00.000Z',
    messages: [
      { by: emps[5].name, role: 'empleado', message: 'Necesito una constancia laboral con sueldo para el banco.', at: '2026-07-20T16:40:00.000Z' },
      { by: 'Diana Laura Flores Ríos', role: 'rh', message: 'Con gusto, la tendremos lista en 2 días hábiles.', at: '2026-07-21T11:00:00.000Z' },
    ],
  });

  // Reprocesar para que las incidencias autorizadas se reflejen en la asistencia.
  // Sólo hasta la fecha de la última sincronización (periodo en curso): los días
  // aún no transcurridos no se marcan como falta.
  reprocess({ startDate: '2026-07-01', endDate: '2026-07-22' });

  logSystem({ action: 'seed', entity: 'system', detail: 'Datos demostrativos de Mallatex cargados' });

  return {
    users: db.all('users').length,
    employees: db.all('employees').length,
    checadas: db.all('checadas').length,
    attendance: db.all('attendance').length,
    password: DEMO_PASSWORD,
  };
}

function fakeRfc(name, i) {
  const parts = name.toUpperCase().split(' ');
  const a = (parts[2] || parts[0]).slice(0, 2);
  const b = (parts[3] || parts[1] || 'X').slice(0, 1);
  const c = parts[0].slice(0, 1);
  return `${a}${b}${c}8${String(i).padStart(2, '0')}0715`;
}

// Ejecución directa
if (import.meta.url === `file://${process.argv[1]}`) {
  const reset = process.argv.includes('--reset');
  const result = seed({ reset });
  console.log('Seed completado:', result);
}
