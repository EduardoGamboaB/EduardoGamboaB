// Estado compartido de la aplicación (personas: admin y empleado).
import { api } from './api.js';

export const state = {
  principal: 'admin', // 'admin' | 'empleado'
  user: null,         // sesión administrativa
  employee: null,     // sesión de empleado
  roleLabel: '',
  modules: [],        // módulos permitidos (claves de ruta) según rol/perfil, desde /me
  periods: [],
  currentPeriodId: null,
  settings: {},
};

// ¿El usuario tiene acceso a este módulo/ruta? (fuente de verdad: backend /me)
export function hasModule(key) {
  return state.modules.includes(key);
}

export function currentPeriod() {
  return state.periods.find((p) => p.id === state.currentPeriodId) || state.periods[0] || null;
}

export function can(...roles) {
  return state.principal === 'admin' && state.user && roles.includes(state.user.role);
}

export function isEmployee() { return state.principal === 'empleado'; }

export async function loadContext() {
  const me = await api.get('/auth/me');
  state.principal = me.principal;
  state.roleLabel = me.roleLabel;
  state.modules = me.modules || [];
  if (me.principal === 'empleado') {
    state.employee = me.employee;
    const portal = await api.get('/portal/me');
    state.periods = portal.periods || [];
  } else {
    state.user = me.user;
    const [periods, settings] = await Promise.all([api.get('/periods'), api.get('/settings')]);
    state.periods = periods;
    state.settings = settings;
  }
  if (!state.currentPeriodId) {
    const open = state.periods.find((p) => p.status === 'abierto');
    state.currentPeriodId = (open || state.periods[0])?.id || null;
  }
}

export async function refreshPeriods() {
  if (state.principal === 'admin') state.periods = await api.get('/periods');
}
