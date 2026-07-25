// Exportación a Aspel NOI.
// La plataforma NO envía registros crudos: consolida la información ya revisada y
// autorizada del periodo en "movimientos" mapeados a conceptos de NOI, y genera
// un archivo de interfaz (TXT delimitado o CSV) listo para su carga.

import * as db from './db.js';
import { periodSummary } from './rules.js';

// Conceptos NOI por defecto (número de concepto configurable por el cliente).
// tipo: P = percepción, D = deducción, I = informativo.
// unidad: dias | horas | veces | importe
export function defaultNoiConcepts() {
  return [
    { key: 'falta', noiNumber: '1001', tipo: 'D', descripcion: 'Faltas', unidad: 'dias', enabled: true },
    { key: 'retardo', noiNumber: '1002', tipo: 'D', descripcion: 'Retardos', unidad: 'veces', enabled: true },
    { key: 'permiso_singoce', noiNumber: '1003', tipo: 'D', descripcion: 'Permiso sin goce', unidad: 'dias', enabled: true },
    { key: 'ot_ordinario', noiNumber: '2001', tipo: 'P', descripcion: 'Tiempo extra doble', unidad: 'horas', enabled: true },
    { key: 'ot_doble', noiNumber: '2002', tipo: 'P', descripcion: 'Tiempo extra triple', unidad: 'horas', enabled: true },
    { key: 'vacaciones', noiNumber: '2003', tipo: 'P', descripcion: 'Vacaciones', unidad: 'dias', enabled: true },
    { key: 'incapacidad', noiNumber: '2004', tipo: 'I', descripcion: 'Incapacidad', unidad: 'dias', enabled: true },
    { key: 'bono_puntualidad', noiNumber: '2005', tipo: 'P', descripcion: 'Bono de puntualidad y asistencia', unidad: 'importe', enabled: true },
    { key: 'permiso_goce', noiNumber: '2006', tipo: 'I', descripcion: 'Permiso con goce', unidad: 'dias', enabled: true },
  ];
}

export function getConcepts() {
  const stored = db.all('noiConcepts');
  return stored.length ? stored : defaultNoiConcepts();
}

// ----- Percepciones variables (captura por periodo) -----
// Casos que no dependen de la asistencia sino de una cantidad capturada por periodo:
// kilometraje del conductor, costura extra por metro cuadrado, comisión de ventas, etc.
// modo:
//   'tarifa'     → importe = cantidad × tarifa      (unidad: km, m², pieza…)
//   'porcentaje' → importe = base × (tarifa / 100)   (cantidad = base en $, tarifa = %)
//   'importe'    → importe = cantidad                (se captura el importe ya calculado)
// source: fuente de datos del concepto. 'manual' hoy; en una fase posterior cada
// fuente externa se sincroniza automáticamente (ver server/connectors.js).
export function defaultVariableConcepts() {
  return [
    { key: 'km_conductor', name: 'Bono por kilometraje (conductor)', noiNumber: '2101', tipo: 'P', unidad: 'km', modo: 'tarifa', rate: 2.5, department: 'Reparto', source: 'g3', enabled: true },
    { key: 'costura_m2', name: 'Costura extra por metro cuadrado', noiNumber: '2102', tipo: 'P', unidad: 'm²', modo: 'tarifa', rate: 12, department: 'Producción', source: 'mes', enabled: true },
    { key: 'comision_ventas', name: 'Comisión sobre ventas', noiNumber: '2103', tipo: 'P', unidad: '$ ventas', modo: 'porcentaje', rate: 3, department: 'Ventas', source: 'aspel', enabled: true },
  ];
}

export function getVariableConcepts() {
  const stored = db.all('variableConcepts');
  return stored.length ? stored : defaultVariableConcepts();
}

// Calcula el importe de una captura variable según el modo del concepto.
// rateOverride permite una tarifa/porcentaje distinto para un empleado puntual.
export function computeVariableImporte(concept, cantidad, rateOverride) {
  const qty = Number(cantidad) || 0;
  const hasOverride = rateOverride !== undefined && rateOverride !== null && rateOverride !== '';
  const rate = hasOverride ? Number(rateOverride) : Number(concept.rate) || 0;
  if (concept.modo === 'importe') return round2(qty);
  if (concept.modo === 'porcentaje') return round2((qty * rate) / 100);
  return round2(qty * rate); // 'tarifa'
}

function conceptByKey(concepts, key) {
  return concepts.find((c) => c.key === key) || null;
}

/**
 * Construye los movimientos de un periodo, listos para revisión y exportación.
 * Devuelve { movements, byEmployee, pending } donde pending marca elementos
 * que aún requieren autorización (bloquean la exportación oficial).
 */
export function buildMovements(period) {
  const concepts = getConcepts();
  const employees = db.all('employees', (e) => e.active !== false);
  const settings = db.getSettings();
  const bonusAmount = settings.bonusAmount ?? 300; // importe del bono por periodo

  const movements = [];
  const byEmployee = [];
  const pending = { overtime: 0, incidents: 0 };

  // Percepciones variables capturadas para este periodo, agrupadas por empleado
  const varEntriesByEmp = {};
  for (const en of db.all('variableEntries', (v) => v.periodId === period.id)) {
    (varEntriesByEmp[en.employeeId] ||= []).push(en);
  }

  // Incidencias pendientes de autorizar dentro del periodo
  pending.incidents = db.all(
    'incidents',
    (i) =>
      i.status === 'pendiente' &&
      !(i.endDate < period.startDate || i.startDate > period.endDate)
  ).length;
  pending.overtime = db.all(
    'overtime',
    (o) => o.status === 'pendiente' && o.date >= period.startDate && o.date <= period.endDate
  ).length;

  for (const emp of employees) {
    const summary = periodSummary(period, emp.id);
    const c = summary.counters;
    const empMovs = [];

    const push = (key, cantidad, ref = '') => {
      if (!cantidad) return;
      const concept = conceptByKey(concepts, key);
      if (!concept || concept.enabled === false) return;
      let importe = 0;
      if (concept.unidad === 'importe') importe = cantidad;
      const mov = {
        employeeId: emp.id,
        noiKey: emp.noiKey || emp.code,
        empName: emp.name,
        conceptKey: key,
        noiNumber: concept.noiNumber,
        tipo: concept.tipo,
        descripcion: concept.descripcion,
        unidad: concept.unidad,
        cantidad: Number(cantidad),
        importe,
        referencia: ref,
      };
      movements.push(mov);
      empMovs.push(mov);
    };

    // Faltas injustificadas (días)
    push('falta', c.faltas, `${c.faltas} día(s)`);
    // Retardos (veces)
    push('retardo', c.retardos, `${c.retardos} retardo(s)`);

    // Tiempo extra autorizado, separado por tipo
    const otAuth = db.all(
      'overtime',
      (o) => o.employeeId === emp.id && o.status === 'autorizada' && o.date >= period.startDate && o.date <= period.endDate
    );
    const otOrdinario = otAuth.filter((o) => o.type === 'ordinario').reduce((s, o) => s + o.authorizedMinutes, 0) / 60;
    const otDoble = otAuth.filter((o) => o.type !== 'ordinario').reduce((s, o) => s + o.authorizedMinutes, 0) / 60;
    push('ot_ordinario', round2(otOrdinario), `${round2(otOrdinario)} h`);
    push('ot_doble', round2(otDoble), `${round2(otDoble)} h`);

    // Incidencias por tipo (días), a partir de incidencias autorizadas del periodo
    const incidents = db.all(
      'incidents',
      (i) => i.employeeId === emp.id && i.status === 'autorizada' && !(i.endDate < period.startDate || i.startDate > period.endDate)
    );
    const daysByType = {};
    for (const inc of incidents) {
      const days = overlapDays(inc.startDate, inc.endDate, period.startDate, period.endDate);
      daysByType[inc.type] = (daysByType[inc.type] || 0) + days;
    }
    push('vacaciones', daysByType.vacaciones, 'vacaciones');
    push('incapacidad', daysByType.incapacidad, 'incapacidad');
    push('permiso_goce', daysByType.permiso_goce, 'permiso con goce');
    push('permiso_singoce', daysByType.permiso_singoce, 'permiso sin goce');

    // Bono de puntualidad / asistencia (importe) si es elegible
    if (summary.bonusEligible) push('bono_puntualidad', bonusAmount, 'bono íntegro');

    // Percepciones variables capturadas (kilometraje, costura por m², comisiones…)
    for (const en of varEntriesByEmp[emp.id] || []) {
      const vc = db.get('variableConcepts', en.conceptId);
      if (!vc || vc.enabled === false) continue;
      const mov = {
        employeeId: emp.id,
        noiKey: emp.noiKey || emp.code,
        empName: emp.name,
        conceptKey: vc.key,
        noiNumber: vc.noiNumber,
        tipo: vc.tipo || 'P',
        descripcion: vc.name,
        unidad: vc.unidad,
        cantidad: Number(en.cantidad) || 0,
        importe: Number(en.importe) || 0,
        referencia: en.note || `${en.cantidad} ${vc.unidad}`,
      };
      movements.push(mov);
      empMovs.push(mov);
    }

    byEmployee.push({ employee: emp, summary, movements: empMovs });
  }

  return { movements, byEmployee, pending, period };
}

// Genera el contenido del archivo de interfaz.
export function toFile(movements, format = 'txt') {
  const sep = format === 'csv' ? ',' : '|';
  const header = ['CLAVE', 'CONCEPTO', 'TIPO', 'DESCRIPCION', 'UNIDAD', 'CANTIDAD', 'IMPORTE', 'REFERENCIA'];
  const lines = [header.join(sep)];
  for (const m of movements) {
    lines.push(
      [
        m.noiKey,
        m.noiNumber,
        m.tipo,
        clean(m.descripcion, sep),
        m.unidad,
        m.cantidad,
        m.importe,
        clean(m.referencia, sep),
      ].join(sep)
    );
  }
  return lines.join('\r\n') + '\r\n';
}

function clean(str, sep) {
  return String(str || '').replaceAll(sep, ' ');
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function overlapDays(aStart, aEnd, bStart, bEnd) {
  const start = aStart > bStart ? aStart : bStart;
  const end = aEnd < bEnd ? aEnd : bEnd;
  if (start > end) return 0;
  const d1 = new Date(start + 'T00:00:00');
  const d2 = new Date(end + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000) + 1;
}
