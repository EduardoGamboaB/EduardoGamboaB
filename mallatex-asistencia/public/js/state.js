// Estado compartido de la aplicación.
import { api } from './api.js';

export const state = {
  user: null,
  roleLabel: '',
  periods: [],
  currentPeriodId: null,
  settings: {},
};

export function currentPeriod() {
  return state.periods.find((p) => p.id === state.currentPeriodId) || state.periods[0] || null;
}

export function can(...roles) {
  return state.user && roles.includes(state.user.role);
}

export async function loadContext() {
  const [me, periods, settings] = await Promise.all([
    api.get('/auth/me'),
    api.get('/periods'),
    api.get('/settings'),
  ]);
  state.user = me.user;
  state.roleLabel = me.roleLabel;
  state.periods = periods;
  state.settings = settings;
  if (!state.currentPeriodId) {
    const open = periods.find((p) => p.status === 'abierto');
    state.currentPeriodId = (open || periods[0])?.id || null;
  }
}

export async function refreshPeriods() {
  state.periods = await api.get('/periods');
}
