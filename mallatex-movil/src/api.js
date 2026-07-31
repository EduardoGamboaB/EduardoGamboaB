// Cliente de la API de la plataforma (mismos endpoints que usa el portal del empleado
// y el módulo de campo: /api/auth, /api/field/*).
import { getToken, getServerUrl } from './storage';
import { DEFAULT_SERVER_URL } from './config';

async function request(method, path, { body, token } = {}) {
  const base = await getServerUrl(DEFAULT_SERVER_URL);
  const authToken = token !== undefined ? token : await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let res;
  try {
    res = await fetch(base.replace(/\/$/, '') + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const err = new Error('Sin conexión con el servidor');
    err.offline = true;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  loginEmployee: (code, pin) => request('POST', '/api/auth/login', { body: { code, pin }, token: null }),
  me: () => request('GET', '/api/field/me'),
  sites: () => request('GET', '/api/field/sites'),
  checkins: () => request('GET', '/api/field/checkins'),
  checkin: (payload) => request('POST', '/api/field/checkin', { body: payload }),
  logout: () => request('POST', '/api/auth/logout').catch(() => {}),

  // ---- CRM de ventas ----
  myClients: () => request('GET', '/api/sales/my-clients'),
  client: (id) => request('GET', `/api/sales/clients/${id}`),
  createProspect: (body) => request('POST', '/api/sales/clients', { body }),
  activeRoute: () => request('GET', '/api/sales/routes/active'),
  startRoute: (body) => request('POST', '/api/sales/routes/start', { body }),
  trackRoute: (id, points) => request('POST', `/api/sales/routes/${id}/track`, { body: { points } }),
  endRoute: (id) => request('POST', `/api/sales/routes/${id}/end`),
  visits: () => request('GET', '/api/sales/visits'),
  createVisit: (body) => request('POST', '/api/sales/visits', { body }),
  myObjectives: () => request('GET', '/api/sales/objectives/me'),
};
