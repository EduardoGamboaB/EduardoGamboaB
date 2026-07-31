// Registro del recorrido por GPS, con soporte en segundo plano.
//
// El seguimiento continuo con la app en segundo plano usa expo-location +
// expo-task-manager y REQUIERE UN DEV BUILD (no funciona en Expo Go). La tarea acumula
// los puntos en almacenamiento local; el primer plano los envía al servidor con
// api.trackRoute (así no depende del token/red dentro de la tarea en segundo plano).
// Donde no esté disponible, degrada al registro manual ("Actualizar recorrido").

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

const TASK = 'mtx-route-tracking';
const BUFFER_KEY = 'mtx_track_buffer';   // [{lat,lng,ts}]
const ROUTE_KEY = 'mtx_track_route';     // routeId activo

let Location = null;
let TaskManager = null;
async function mods() {
  if (!Location) Location = await import('expo-location');
  if (!TaskManager) { try { TaskManager = await import('expo-task-manager'); } catch { TaskManager = null; } }
  return { Location, TaskManager };
}

// Define la tarea una sola vez (a nivel módulo, requerido por expo-task-manager).
(async () => {
  try {
    const { TaskManager } = await mods();
    if (TaskManager && !TaskManager.isTaskDefined?.(TASK)) {
      TaskManager.defineTask(TASK, async ({ data, error }) => {
        if (error || !data) return;
        const locs = data.locations || [];
        if (!locs.length) return;
        try {
          const buf = JSON.parse((await AsyncStorage.getItem(BUFFER_KEY)) || '[]');
          for (const l of locs) buf.push({ lat: l.coords.latitude, lng: l.coords.longitude, ts: new Date(l.timestamp).toISOString?.() || undefined });
          await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buf.slice(-2000)));
        } catch {}
      });
    }
  } catch {}
})();

export async function startBackgroundTracking(routeId) {
  try {
    const { Location, TaskManager } = await mods();
    await AsyncStorage.setItem(ROUTE_KEY, String(routeId));
    if (!TaskManager) return { background: false };
    const perm = await Location.requestBackgroundPermissionsAsync().catch(() => ({ status: 'denied' }));
    if (perm.status !== 'granted') return { background: false };
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000,
      distanceInterval: 50,
      showsBackgroundLocationIndicator: true,
      foregroundService: { notificationTitle: 'Mallatex Ventas', notificationBody: 'Registrando tu recorrido de ruta', notificationColor: '#ED3237' },
    });
    return { background: true };
  } catch {
    return { background: false };
  }
}

export async function stopBackgroundTracking() {
  try {
    const { Location, TaskManager } = await mods();
    if (TaskManager && (await TaskManager.isTaskRegisteredAsync?.(TASK))) await Location.stopLocationUpdatesAsync(TASK);
  } catch {}
  await AsyncStorage.removeItem(ROUTE_KEY);
  await flushTrackBuffer(); // envía lo que quede
}

// Envía los puntos acumulados al servidor. Se llama desde el primer plano.
export async function flushTrackBuffer() {
  try {
    const routeId = await AsyncStorage.getItem(ROUTE_KEY);
    const buf = JSON.parse((await AsyncStorage.getItem(BUFFER_KEY)) || '[]');
    if (!routeId || !buf.length) return 0;
    await api.trackRoute(Number(routeId), buf);
    await AsyncStorage.setItem(BUFFER_KEY, '[]');
    return buf.length;
  } catch { return 0; }
}
