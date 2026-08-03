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
export async function setServerUrl(url) {
  await AsyncStorage.setItem(URL_KEY, url);
}

// ---- Cola de registros sin conexión ----
export async function getQueue() {
  try { return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || '[]'); } catch { return []; }
}
export async function saveQueue(items) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}
export async function enqueue(item) {
  const q = await getQueue();
  q.push({ ...item, queuedAt: new Date().toISOString() });
  await saveQueue(q);
  return q.length;
}
