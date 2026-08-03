// Cliente de la API de la plataforma. El gateway unificado atiende, bajo un mismo dominio,
// los endpoints de campo (/api/field/*), ventas (/api/sales/*) y MES (/api/mes/*).
import { getToken, getServerUrl } from './storage';
import { DEFAULT_SERVER_URL } from './config';

async function request(method, path, { body, token } = {}) {
  const base = await getServerUrl(DEFAULT_SERVER_URL);
  const authToken = token !== undefined ? token : await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  // Corte por tiempo: una red colgada se trata igual que estar sin conexión.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res;
  try {
    res = await fetch(base.replace(/\/$/, '') + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const err = new Error('Sin conexión con el servidor');
    err.offline = true;
    throw err;
  } finally { clearTimeout(timer); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status === 401 ? 'Código o PIN incorrecto'
      : res.status === 403 ? 'No tienes acceso a esta función'
      : res.status >= 500 ? 'El servidor no está disponible, intenta más tarde'
      : `Error ${res.status}`;
    const err = new Error(data.error || fallback);
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
  // inventario / cotizador / pedidos
  products: (q) => request('GET', '/api/sales/products' + (q ? `?q=${encodeURIComponent(q)}` : '')),
  quotes: () => request('GET', '/api/sales/quotes'),
  createQuote: (body) => request('POST', '/api/sales/quotes', { body }),
  orders: () => request('GET', '/api/sales/orders'),
  createOrder: (body) => request('POST', '/api/sales/orders', { body }),
  advisor: (body) => request('POST', '/api/sales/advisor', { body }),
  // administrativo: viáticos, gastos, facturas
  expenseRequests: () => request('GET', '/api/sales/expense-requests'),
  createExpenseRequest: (body) => request('POST', '/api/sales/expense-requests', { body }),
  expenses: () => request('GET', '/api/sales/expenses'),
  createExpense: (body) => request('POST', '/api/sales/expenses', { body }),
  invoices: () => request('GET', '/api/sales/invoices'),
  createInvoice: (body) => request('POST', '/api/sales/invoices', { body }),

  // ---- MES móvil (planta / líneas de producción) ----
  // Solo visibles para colaboradores con perfil "línea" (el backend define profile.modules).
  mesTabletLines: () => request('GET', '/api/mes/tablet/lines'),
  mesScanRoll: (payload) => request('POST', '/api/mes/tablet/scan', { body: payload }),
  mesReportAlert: (payload) => request('POST', '/api/mes/tablet/alert', { body: payload }),
  mesReportAvance: (payload) => request('POST', '/api/mes/tablet/avance', { body: payload }),
  mesReportMerma: (payload) => request('POST', '/api/mes/tablet/merma', { body: payload }),
  mesProductionBoard: () => request('GET', '/api/mes/tablero'),
};
