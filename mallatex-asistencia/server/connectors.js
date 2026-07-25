// Conectores de percepciones variables.
//
// Cada concepto variable declara su FUENTE de datos (campo `source`). Hoy la captura
// es MANUAL en la plataforma; en una fase posterior cada fuente externa se sincroniza
// automáticamente. La sincronización de este módulo está SIMULADA, igual que la del
// checador Hikvision (server/checador.js): en producción, cada conector consultaría la
// API del sistema externo y devolvería exactamente las mismas filas de lectura.
//
//   - g3    → G3 (telemetría de flotilla): kilometraje recorrido por conductor.
//   - mes   → plataforma MES: metros cuadrados producidos en fabricación.
//   - aspel → Aspel (CxC / SAE): base de comisión al confirmarse el pago de facturas.
//
// Punto de extensión: reemplazar `simulatedReadings` por la llamada real a cada API
// (webhook de pago de facturas de Aspel, exportación de rutas de G3, órdenes de MES).

import * as db from './db.js';
import { computeVariableImporte } from './noi.js';

export const SOURCES = {
  manual: { id: 'manual', label: 'Captura manual', external: false, status: 'activo', hint: 'Se captura a mano en la plataforma.' },
  g3: { id: 'g3', label: 'G3 · Telemetría de flotilla', external: true, unidad: 'km', status: 'simulado', hint: 'Kilometraje recorrido por conductor, tomado de G3 Drive.' },
  mes: { id: 'mes', label: 'MES · Producción', external: true, unidad: 'm²', status: 'simulado', hint: 'Metros cuadrados producidos, tomados de la plataforma MES.' },
  aspel: { id: 'aspel', label: 'Aspel · Pago de facturas', external: true, unidad: '$ ventas', status: 'simulado', hint: 'Base de comisión al confirmarse el pago de facturas en Aspel (CxC/SAE).' },
};

export function listSources() {
  return Object.values(SOURCES);
}

export function sourceLabel(id) {
  return (SOURCES[id] || SOURCES.manual).label;
}

// Lecturas SIMULADAS para una fuente y periodo. En producción, esta función consultaría
// el sistema externo (G3 / MES / Aspel) y devolvería las mismas filas.
function simulatedReadings(source, period, concepts) {
  const rows = [];
  const conceptsOfSource = concepts.filter((c) => (c.source || 'manual') === source && c.enabled !== false);
  if (!conceptsOfSource.length) return rows;
  const employees = db.all('employees', (e) => e.active !== false);
  for (const concept of conceptsOfSource) {
    for (const emp of employees) {
      // Sólo empleados del área sugerida del concepto (si se definió)
      if (concept.department && emp.department !== concept.department) continue;
      const cantidad = simulatedQuantity(source, emp, period);
      if (!cantidad) continue;
      rows.push({
        employeeId: emp.id,
        conceptId: concept.id,
        cantidad,
        externalId: `${source}-${period.id}-${emp.id}-${concept.id}`,
        reference: `${SOURCES[source].label} (sincronización simulada)`,
      });
    }
  }
  return rows;
}

// Cantidad determinista (sin aleatoriedad) para reproducibilidad de la demo.
function simulatedQuantity(source, emp, period) {
  const base = (emp.id * 37 + period.id * 13) % 100;
  if (source === 'g3') return 400 + base * 4;        // ~400–800 km
  if (source === 'mes') return 20 + (base % 40);      // ~20–60 m²
  if (source === 'aspel') return 60000 + base * 900;  // ~60k–150k $
  return 0;
}

// Sincroniza una fuente externa: hace upsert de las capturas por externalId, de modo
// que re-sincronizar actualiza en lugar de duplicar. No toca las capturas manuales.
export function syncSource(source, periodId, actorName) {
  const meta = SOURCES[source];
  if (!meta || !meta.external) throw new Error('Fuente no válida para sincronización');
  const period = db.get('periods', Number(periodId));
  if (!period) throw new Error('Periodo no encontrado');
  if (period.status === 'cerrado') throw new Error('El periodo está cerrado; no se puede sincronizar');

  const concepts = db.all('variableConcepts');
  if (!concepts.some((c) => (c.source || 'manual') === source && c.enabled !== false)) {
    throw new Error(`No hay conceptos activos con fuente ${meta.label}`);
  }
  const rows = simulatedReadings(source, period, concepts);
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const concept = db.get('variableConcepts', r.conceptId);
    if (!concept) continue;
    const importe = computeVariableImporte(concept, r.cantidad, null);
    const existing = db.find('variableEntries', (v) => v.externalId === r.externalId);
    if (existing) {
      db.update('variableEntries', existing.id, { cantidad: r.cantidad, importe, source, syncedAt: now });
      updated++;
    } else {
      db.insert('variableEntries', {
        periodId: period.id,
        employeeId: r.employeeId,
        conceptId: r.conceptId,
        cantidad: r.cantidad,
        rate: null,
        importe,
        note: r.reference,
        source,
        externalId: r.externalId,
        createdBy: actorName || 'Sincronización',
        createdAt: now,
        syncedAt: now,
      });
      created++;
    }
  }
  return { source, label: meta.label, status: meta.status, created, updated, total: rows.length };
}
