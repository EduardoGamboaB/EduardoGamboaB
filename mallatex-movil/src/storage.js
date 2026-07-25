// Persistencia local: token seguro, URL del servidor y cola de registros sin conexión.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'mtx_token';
const URL_KEY = 'mtx_server_url';
const QUEUE_KEY = 'mtx_offline_queue';

// ---- Token de sesión (almacenamiento seguro) ----
export async function getToken() {
  try { return await SecureStore.getItemAsync(TOKEN_KEY); } catch { return null; }
}
export async function setToken(token) {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
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
