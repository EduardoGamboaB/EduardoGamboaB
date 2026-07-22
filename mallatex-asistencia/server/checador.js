// Integración con el checador facial Hikvision.
//
// En producción, este módulo consultaría el dispositivo vía ISAPI/SDK
// (AcsEvent / AccessControl) para descargar los eventos de acceso (checadas)
// de forma programada. Aquí se SIMULA esa descarga generando eventos realistas
// a partir de los horarios de cada empleado, para poder demostrar el flujo
// completo sin hardware físico. El resto de la plataforma es agnóstica al origen.

import * as db from './db.js';
import { hmToMinutes, isoDow, eachDate, reprocess } from './rules.js';

// Generador pseudoaleatorio determinista (para resultados reproducibles por fecha+empleado)
function seeded(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toTimestamp(dateStr, minutesOfDay) {
  const h = Math.floor(minutesOfDay / 60);
  const m = Math.floor(minutesOfDay % 60);
  const s = Math.floor((minutesOfDay % 1) * 60);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h, m, s, 0);
  return d.toISOString();
}

/**
 * Simula la descarga de checadas del dispositivo para un rango de fechas.
 * profile: 'realista' introduce retardos/faltas/omisiones/horas extra ocasionales.
 * Devuelve las checadas creadas (evita duplicados por empleado+fecha ya sincronizados).
 */
export function syncDevice(deviceId, { startDate, endDate, profile = 'realista' } = {}) {
  const device = db.get('devices', deviceId);
  if (!device) throw new Error('Dispositivo no encontrado');

  const employees = db.all('employees', (e) => e.active !== false && e.deviceId === device.id);
  const created = [];
  const dates = eachDate(startDate, endDate);

  for (const emp of employees) {
    const schedule = db.get('schedules', emp.scheduleId);
    if (!schedule) continue;
    const entry = hmToMinutes(schedule.entryTime);
    const exit = hmToMinutes(schedule.exitTime);
    const workDays = schedule.workDays || [1, 2, 3, 4, 5];

    for (const date of dates) {
      // Evitar duplicar checadas ya descargadas de ese día
      const already = db.find(
        'checadas',
        (c) => c.employeeId === emp.id && c.timestamp.slice(0, 10) === date
      );
      if (already) continue;

      if (!workDays.includes(isoDow(date))) continue; // descanso: sin checadas

      const rand = seeded(`${emp.id}:${date}`);
      const roll = rand();

      // ~4% falta (sin checadas)
      if (profile === 'realista' && roll < 0.04) continue;

      // ~3% omisión (sólo una checada)
      if (profile === 'realista' && roll < 0.07) {
        const inMin = entry + Math.round((rand() - 0.3) * 10);
        created.push(makeChecada(emp, device, date, inMin, 'entrada'));
        continue;
      }

      // Entrada: mayormente puntual, a veces retardo
      let inOffset;
      if (profile === 'realista' && roll < 0.18) inOffset = 12 + Math.round(rand() * 25); // retardo
      else inOffset = Math.round((rand() - 0.6) * 8); // entre -5 y +3
      const inMin = entry + inOffset;

      // Salida: normalmente a tiempo, a veces tiempo extra, a veces anticipada
      let outOffset;
      const outRoll = rand();
      if (profile === 'realista' && outRoll < 0.15) outOffset = 35 + Math.round(rand() * 120); // tiempo extra
      else if (profile === 'realista' && outRoll < 0.2) outOffset = -(15 + Math.round(rand() * 20)); // salida anticipada
      else outOffset = Math.round((rand() - 0.4) * 8);
      const outMin = exit + outOffset;

      created.push(makeChecada(emp, device, date, inMin, 'entrada'));
      created.push(makeChecada(emp, device, date, outMin, 'salida'));
    }
  }

  if (created.length) db.insertMany('checadas', created);
  db.update('devices', device.id, { lastSync: new Date().toISOString() });

  // Procesar de inmediato las checadas descargadas
  reprocess({ startDate, endDate });

  return { device: db.get('devices', device.id), createdCount: created.length };
}

function makeChecada(emp, device, date, minutesOfDay, type) {
  return {
    employeeId: emp.id,
    deviceId: device.id,
    timestamp: toTimestamp(date, minutesOfDay),
    type, // entrada | salida
    method: 'facial',
    raw: `HIK:${device.serial || device.id}:${emp.checadorUserId || emp.id}`,
  };
}
