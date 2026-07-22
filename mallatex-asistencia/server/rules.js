// Motor de reglas de asistencia.
// Toma checadas crudas + horario + incidencias autorizadas y produce el registro
// de asistencia diario por empleado (estatus, retardos, faltas, horas extra),
// además del resumen por periodo para bonos de puntualidad/asistencia.

import * as db from './db.js';

// ---------- Utilidades de tiempo ----------

export function hmToMinutes(hm) {
  if (!hm) return null;
  const [h, m] = hm.split(':').map(Number);
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

function defaultSettings() {
  return {
    overtimeThresholdMin: 15, // minutos después de la salida para contar tiempo extra
    overtimeMinBlockMin: 30, // bloque mínimo de tiempo extra a considerar
    bonusMaxRetardos: 2, // retardos permitidos en el periodo para conservar bono
    bonusAllowFaltas: 0, // faltas injustificadas permitidas
    earlyLeaveThresholdMin: 10, // minutos antes de la salida para marcar salida anticipada
  };
}

export function settings() {
  return { ...defaultSettings(), ...db.getSettings() };
}

// ---------- Procesamiento de un día para un empleado ----------

/**
 * Calcula el registro de asistencia de un empleado en una fecha concreta.
 * No persiste; devuelve el objeto listo para guardar/actualizar.
 */
export function computeDay(employee, dateStr, opts = {}) {
  const cfg = { ...settings(), ...opts.settings };
  const schedule = opts.schedule || db.get('schedules', employee.scheduleId);
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
  const incident = (opts.incidents || db.all('incidents')).find(
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
  const checadas = (opts.checadas || db.all('checadas'))
    .filter((c) => c.employeeId === employee.id && dateOf(c.timestamp) === dateStr)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  base.checadaCount = checadas.length;

  if (checadas.length === 0) {
    base.status = isWorkDay ? STATUS.FALTA : STATUS.DESCANSO;
    if (!isWorkDay) base.autoNote = 'Día de descanso';
    else base.autoNote = 'Sin registros en el checador';
    return base;
  }

  const firstIn = timeOfDayMinutes(checadas[0].timestamp);
  const lastOut = timeOfDayMinutes(checadas[checadas.length - 1].timestamp);
  base.firstIn = minutesToHm(firstIn);
  base.lastOut = minutesToHm(lastOut);

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
 * Reprocesa el rango de fechas para uno o todos los empleados.
 * Preserva clasificación manual: si un registro fue editado a mano (manualStatus),
 * conserva el estatus manual pero recalcula métricas de tiempo.
 * Devuelve el número de registros afectados.
 */
export function reprocess({ startDate, endDate, employeeIds = null } = {}) {
  const employees = db.all('employees', (e) => e.active !== false && (!employeeIds || employeeIds.includes(e.id)));
  const schedulesById = Object.fromEntries(db.all('schedules').map((s) => [s.id, s]));
  const checadas = db.all('checadas');
  const incidents = db.all('incidents');
  const cfg = settings();

  let count = 0;
  const dates = eachDate(startDate, endDate);

  for (const emp of employees) {
    const schedule = schedulesById[emp.scheduleId];
    for (const date of dates) {
      const computed = computeDay(emp, date, { schedule, checadas, incidents, settings: cfg });
      const existing = db.find('attendance', (a) => a.employeeId === emp.id && a.date === date);
      if (existing) {
        const patch = { ...computed };
        // Respetar corrección manual del estatus
        if (existing.manualStatus) {
          patch.status = existing.status;
          patch.manualStatus = true;
          patch.manualNote = existing.manualNote;
        }
        db.update('attendance', existing.id, patch);
      } else {
        db.insert('attendance', computed);
      }
      count++;
    }
  }

  // Generar candidatos de tiempo extra (pendientes de autorización)
  syncOvertimeCandidates({ startDate, endDate, employeeIds });

  return count;
}

/**
 * Crea/actualiza registros de tiempo extra a partir de la asistencia calculada.
 * No sobreescribe registros ya autorizados o rechazados por un usuario.
 */
export function syncOvertimeCandidates({ startDate, endDate, employeeIds = null } = {}) {
  const rows = db.all(
    'attendance',
    (a) =>
      a.overtimeMinutes > 0 &&
      a.date >= startDate &&
      a.date <= endDate &&
      (!employeeIds || employeeIds.includes(a.employeeId))
  );
  for (const a of rows) {
    const existing = db.find('overtime', (o) => o.employeeId === a.employeeId && o.date === a.date);
    if (existing) {
      if (existing.status === 'pendiente') {
        db.update('overtime', existing.id, { calculatedMinutes: a.overtimeMinutes });
      }
    } else {
      db.insert('overtime', {
        employeeId: a.employeeId,
        date: a.date,
        calculatedMinutes: a.overtimeMinutes,
        authorizedMinutes: 0,
        type: isoDow(a.date) >= 6 || a.status === STATUS.DESCANSO ? 'doble' : 'ordinario',
        status: 'pendiente',
        authorizedBy: null,
        note: '',
      });
    }
  }
}

// ---------- Resumen por periodo (para bonos e informes) ----------

export function periodSummary(period, employeeId) {
  const cfg = settings();
  const rows = db.all(
    'attendance',
    (a) => a.employeeId === employeeId && a.date >= period.startDate && a.date <= period.endDate
  );
  const counters = {
    asistencias: 0,
    retardos: 0,
    faltas: 0,
    justificadas: 0,
    vacaciones: 0,
    permisos: 0,
    incapacidades: 0,
    descansos: 0,
    omisiones: 0,
    festivos: 0,
    lateMinutes: 0,
    workedMinutes: 0,
  };
  for (const a of rows) {
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
    }
    counters.lateMinutes += a.lateMinutes || 0;
    counters.workedMinutes += a.workedMinutes || 0;
  }

  // Tiempo extra autorizado del periodo
  const ot = db.all(
    'overtime',
    (o) => o.employeeId === employeeId && o.date >= period.startDate && o.date <= period.endDate && o.status === 'autorizada'
  );
  const overtimeMinutes = ot.reduce((s, o) => s + (o.authorizedMinutes || 0), 0);

  const emp = db.get('employees', employeeId);
  const bonusEligible =
    emp && emp.bonusEligible !== false &&
    counters.faltas <= cfg.bonusAllowFaltas &&
    counters.retardos <= cfg.bonusMaxRetardos &&
    counters.omisiones === 0;

  return { employeeId, counters, overtimeMinutes, bonusEligible };
}
