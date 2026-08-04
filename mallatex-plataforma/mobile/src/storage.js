// Persistencia local: token seguro, URL del servidor y cola de registros sin conexión.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'mtx_token';
const URL_KEY = 'mtx_server_url';
const QUEUE_KEY = 'mtx_offline_queue';
const BIO_KEY = 'mtx_biometric';

// ---- Preferencia de acceso biométrico ----
export async function getBiometricEnabled() {
  return (await AsyncStorage.getItem(BIO_KEY)) === '1';
}
export async function setBiometricEnabled(on) {
  await AsyncStorage.setItem(BIO_KEY, on ? '1' : '0');
}

// ---- Token de sesión ----
// En dispositivo se usa el almacenamiento seguro (SecureStore); en web —donde SecureStore
// no está disponible— se cae a AsyncStorage para que el preview web también funcione.
const secureOK = Platform.OS !== 'web';
export async function getToken() {
  if (secureOK) { try { const v = await SecureStore.getItemAsync(TOKEN_KEY); if (v != null) return v; } catch {} }
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function setToken(token) {
  if (secureOK) {
    try { token ? await SecureStore.setItemAsync(TOKEN_KEY, token) : await SecureStore.deleteItemAsync(TOKEN_KEY); return; } catch {}
  }
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

// ---- URL del servidor (configurable en la app) ----
export async function getServerUrl(fallback) {
  const v = await AsyncStorage.getItem(URL_KEY);
  return v || fallback;
}

// Solo se acepta HTTPS; se permite HTTP únicamente contra localhost o rangos
// LAN privados (desarrollo). Así las credenciales (código+PIN) y el token nunca
// viajan en claro contra un servidor público (ver pentest #8).
export function validarServerUrl(url) {
  let u;
  try { u = new URL(String(url).trim()); } catch { throw new Error('URL de servidor inválida.'); }
  if (u.protocol === 'https:') return u.toString().replace(/\/$/, '');
  if (u.protocol === 'http:') {
    const h = u.hostname;
    const esLocal = h === 'localhost' || h === '127.0.0.1' || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h);
    if (esLocal) return u.toString().replace(/\/$/, '');
    throw new Error('Usa https:// — el servidor no puede ser http en claro.');
  }
  throw new Error('La URL debe empezar con https://');
}

export async function setServerUrl(url) {
  await AsyncStorage.setItem(URL_KEY, validarServerUrl(url));
}

// ---- Cola de registros sin conexión ----
// La selfie (base64) NO se guarda en AsyncStorage (almacenamiento sin cifrar,
// legible por backups/otras libs). Se persiste en el almacenamiento privado de
// la app (FileSystem.documentDirectory) y en la cola queda sólo la ruta; al
// enviar se rehidrata y luego se borra el archivo (ver pentest #7).
let FileSystem = null;
try { FileSystem = require('expo-file-system'); } catch { /* web/preview */ }

async function externalizarFoto(item) {
  if (!FileSystem?.documentDirectory || typeof item?.photo !== 'string' || !item.photo.startsWith('data:image/')) {
    return item; // sin FileSystem (web) o sin foto: se deja tal cual
  }
  try {
    const b64 = item.photo.split(',')[1] || '';
    const dir = FileSystem.documentDirectory + 'queue/';
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
    const uri = `${dir}selfie-${Date.now()}-${Math.round(item.lat || 0)}.b64`;
    await FileSystem.writeAsStringAsync(uri, b64);
    const { photo, ...rest } = item;
    return { ...rest, photoFile: uri };
  } catch {
    return item; // si falla, no se pierde el registro (degradación segura)
  }
}

/** Rehidrata la foto desde el archivo privado; usar antes de enviar. */
export async function hydrateQueueItem(item) {
  if (!FileSystem || !item?.photoFile) return item;
  try {
    const b64 = await FileSystem.readAsStringAsync(item.photoFile);
    const { photoFile, ...rest } = item;
    return { ...rest, photo: `data:image/jpeg;base64,${b64}` };
  } catch {
    const { photoFile, ...rest } = item;
    return rest; // archivo perdido: se envía sin foto antes que bloquear
  }
}

/** Borra el archivo privado de un registro ya enviado. */
export async function discardQueueItem(item) {
  if (FileSystem && item?.photoFile) {
    await FileSystem.deleteAsync(item.photoFile, { idempotent: true }).catch(() => {});
  }
}

export async function getQueue() {
  try { return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || '[]'); } catch { return []; }
}
export async function saveQueue(items) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}
export async function enqueue(item) {
  const q = await getQueue();
  q.push({ ...(await externalizarFoto(item)), queuedAt: new Date().toISOString() });
  await saveQueue(q);
  return q.length;
}
