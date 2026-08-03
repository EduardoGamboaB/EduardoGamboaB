// Motor de reglas de asistencia (servicio de dominio puro, sin persistencia).
// Toma checadas crudas + horario + incidencias autorizadas y produce el registro
// de asistencia diario por empleado (estatus, retardos, faltas, horas extra),
// además del resumen por periodo para bonos de puntualidad/asistencia.
//
// Portado de mallatex-asistencia/server/rules.js. La orquestación de carga y
// persistencia (reprocess) vive en la capa de aplicación (AttendanceService);
// aquí sólo hay cálculo puro sobre datos ya provistos.

// ---------- Utilidades de tiempo ----------

export function hmToMinutes(hm) {
  if (!hm) return null;
  const [h, m] = String(hm).split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHm(min) {
  if (min == null) return '';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Día de la semana ISO 1..7 (1 = lunes)
export function isoDow(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const js = d.getDay(); // 0 = domingo
  return js === 0 ? 7 : js;
}

export function timeOfDayMinutes(isoTimestamp) {
  const d = new Date(isoTimestamp);
  return d.getHours() * 60 + d.getMinutes();
}

export function dateOf(isoTimestamp) {
  const d = new Date(isoTimestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function eachDate(startDate, endDate) {
  const out = [];
  let cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// ---------- Estatus posibles ----------
export const STATUS = {
  ASISTENCIA: 'asistencia',
  RETARDO: 'retardo',
  FALTA: 'falta', // injustificada
  DESCANSO: 'descanso',
  VACACIONES: 'vacaciones',
  PERMISO: 'permiso',
  INCAPACIDAD: 'incapacidad',
  JUSTIFICADA: 'justificada',
  FESTIVO: 'festivo',
  OMISION: 'omision', // registró sólo una checada (falta entrada o salida)
  PENDIENTE: 'pendiente',
};

// Mapea el tipo de incidencia autorizada al estatus de asistencia del día.
const INCIDENT_STATUS = {
  vacaciones: STATUS.VACACIONES,
  permiso_goce: STATUS.PERMISO,
  permiso_singoce: STATUS.PERMISO,
  incapacidad: STATUS.INCAPACIDAD,
  falta_justificada: STATUS.JUSTIFICADA,
  festivo: STATUS.FESTIVO,
  descanso: STATUS.DESCANSO,
};

// Ajustes/reglas globales por defecto (números reales de la propuesta operativa).
export function defaultSettings() {
  return {
    overtimeThresholdMin: 15, // minutos después de la salida para contar tiempo extra
    overtimeMinBlockMin: 30, // bloque mínimo de tiempo extra a considerar
    bonusMaxRetardos: 2, // retardos permitidos en el periodo para conservar bono
    bonusAllowFaltas: 0, // faltas injustificadas permitidas
    earlyLeaveThresholdMin: 10, // minutos antes de la salida para marcar salida anticipada
    bonusAmount: 300, // importe del bono de puntualidad/asistencia por periodo
  };
}

// ---------- Procesamiento de un día para un empleado ----------

/**
 * Calcula el registro de asistencia de un empleado en una fecha concreta.
 * No persiste; devuelve el objeto listo para guardar/actualizar.
 *
 * @param {object}   employee
 * @param {string}   dateStr   fecha 'YYYY-MM-DD'
 * @param {object}   opts.schedule    horario del empleado
 * @param {object[]} opts.checadas    checadas del empleado (o de todos)
 * @param {object[]} opts.incidents   incidencias (o sólo del empleado)
 * @param {object}   opts.settings    ajustes/reglas
 */
export function computeDay(employee, dateStr, opts = {}) {
  const cfg = { ...defaultSettings(), ...opts.settings };
  const schedule = opts.schedule || null;
  const dow = isoDow(dateStr);

  const base = {
    employeeId: employee.id,
    date: dateStr,
    scheduleId: schedule ? schedule.id : null,
    firstIn: null,
    lastOut: null,
    checadaCount: 0,
    workedMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    overtimeMinutes: 0,
    status: STATUS.PENDIENTE,
    incidentId: null,
    autoNote: '',
  };

  // 1) Incidencia autorizada tiene prioridad (vacaciones, permiso, incapacidad, etc.)
  const incident = (opts.incidents || []).find(
    (i) =>
      i.employeeId === employee.id &&
      i.status === 'autorizada' &&
      dateStr >= i.startDate &&
      dateStr <= i.endDate
  );
  if (incident) {
    base.status = INCIDENT_STATUS[incident.type] || STATUS.JUSTIFICADA;
    base.incidentId = incident.id;
    base.autoNote = incident.reason || incident.type;
    return base;
  }

  // 2) ¿Es día laborable según el horario?
  const workDays = (schedule && schedule.workDays) || [1, 2, 3, 4, 5];
  const isWorkDay = workDays.includes(dow);

  // 3) Checadas del día
  const checadas = (opts.checadas || [])
    .filter((c) => c.employeeId === employee.id && dateOf(c.timestamp) === dateStr)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  base.checadaCount = checadas.length;

  if (checadas.length === 0) {
    base.status = isWorkDay ? STATUS.FALTA : STATUS.DESCANSO;
    base.autoNote = isWorkDay ? 'Sin registros en el checador' : 'Día de descanso';
    return base;
  }

  base.firstIn = checadas[0].timestamp;
  base.lastOut = checadas[checadas.length - 1].timestamp;
  const firstIn = timeOfDayMinutes(checadas[0].timestamp);
  const lastOut = timeOfDayMinutes(checadas[checadas.length - 1].timestamp);

  // Omisión: una sola checada en día laborable (falta entrada o salida)
  if (checadas.length === 1 && isWorkDay) {
    base.status = STATUS.OMISION;
    base.autoNote = 'Registro incompleto (una sola checada)';
    return base;
  }

  if (!isWorkDay) {
    // Trabajó en día de descanso: todo el tiempo cuenta como tiempo extra potencial
    base.workedMinutes = Math.max(0, lastOut - firstIn);
    base.overtimeMinutes = base.workedMinutes;
    base.status = STATUS.DESCANSO;
    base.autoNote = 'Trabajo en día de descanso';
    return base;
  }

  const entry = hmToMinutes(schedule.entryTime);
  const exit = hmToMinutes(schedule.exitTime);
  const tolerance = schedule.toleranceMinutes ?? 10;
  const lateAfter = schedule.lateAfterMinutes ?? 20; // retardo hasta aquí; más allá = falta
  const lunch = schedule.lunchMinutes ?? 0;

  const minutesLate = firstIn - entry;
  base.workedMinutes = Math.max(0, lastOut - firstIn - lunch);

  // Salida anticipada
  if (lastOut < exit - cfg.earlyLeaveThresholdMin) {
    base.earlyLeaveMinutes = exit - lastOut;
  }

  // Tiempo extra (después de la salida programada)
  const rawOt = lastOut - exit;
  if (rawOt >= cfg.overtimeThresholdMin) {
    base.overtimeMinutes = rawOt >= cfg.overtimeMinBlockMin ? rawOt : 0;
  }

  // Clasificación por puntualidad
  if (minutesLate <= tolerance) {
    base.status = STATUS.ASISTENCIA;
    base.lateMinutes = 0;
  } else if (minutesLate <= lateAfter) {
    base.status = STATUS.RETARDO;
    base.lateMinutes = minutesLate;
    base.autoNote = `Retardo de ${minutesLate} min`;
  } else {
    base.status = STATUS.FALTA;
    base.lateMinutes = minutesLate;
    base.autoNote = `Falta por retardo mayor (${minutesLate} min)`;
  }

  return base;
}

/**
 * Deriva el candidato de tiempo extra de un día ya calculado.
 * Devuelve null si el día no genera tiempo extra.
 */
export function overtimeCandidate(day) {
  if (!(day.overtimeMinutes > 0)) return null;
  return {
    employeeId: day.employeeId,
    date: day.date,
    calculatedMinutes: day.overtimeMinutes,
    authorizedMinutes: 0,
    type: isoDow(day.date) >= 6 || day.status === STATUS.DESCANSO ? 'doble' : 'ordinario',
    status: 'pendiente',
    authorizedBy: null,
  };
}

// ---------- Resumen por periodo (para bonos e informes) ----------

/**
 * Resume la asistencia de un empleado en un periodo. Puro: recibe las filas ya
 * filtradas del periodo.
 *
 * @param {object}   period
 * @param {object}   employee
 * @param {object[]} attendanceRows  días de asistencia del empleado en el periodo
 * @param {object[]} overtimeAuth    tiempo extra AUTORIZADO del empleado en el periodo
 * @param {object}   settings
 */
export function periodSummary(period, employee, { attendanceRows = [], overtimeAuth = [], settings = {} } = {}) {
  const cfg = { ...defaultSettings(), ...settings };
  const counters = {
    asistencias: 0, retardos: 0, faltas: 0, justificadas: 0, vacaciones: 0,
    permisos: 0, incapacidades: 0, descansos: 0, omisiones: 0, festivos: 0,
    lateMinutes: 0, workedMinutes: 0,
  };
  for (const a of attendanceRows) {
    switch (a.status) {
      case STATUS.ASISTENCIA: counters.asistencias++; break;
      case STATUS.RETARDO: counters.retardos++; break;
      case STATUS.FALTA: counters.faltas++; break;
      case STATUS.JUSTIFICADA: counters.justificadas++; break;
      case STATUS.VACACIONES: counters.vacaciones++; break;
      case STATUS.PERMISO: counters.permisos++; break;
      case STATUS.INCAPACIDAD: counters.incapacidades++; break;
      case STATUS.DESCANSO: counters.descansos++; break;
      case STATUS.OMISION: counters.omisiones++; break;
      case STATUS.FESTIVO: counters.festivos++; break;
      default: break;
    }
    counters.lateMinutes += a.lateMinutes || 0;
    counters.workedMinutes += a.workedMinutes || 0;
  }

  const overtimeMinutes = overtimeAuth.reduce((s, o) => s + (o.authorizedMinutes || 0), 0);

  const bonusEligible =
    !!employee && employee.bonusEligible !== false &&
    counters.faltas <= cfg.bonusAllowFaltas &&
    counters.retardos <= cfg.bonusMaxRetardos &&
    counters.omisiones === 0;

  return { employeeId: employee.id, counters, overtimeMinutes, bonusEligible };
}
