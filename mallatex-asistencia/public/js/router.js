// Router simple basado en hash + configuración de navegación (admin y empleado).
import { clear, h, toast } from './ui.js';
import { can, state } from './state.js';

export const ROUTES = [
  // ---- Administrativo ----
  { key: 'dashboard', label: 'Tablero', icon: '▤', group: 'Operación', principal: 'admin', load: () => import('./views/dashboard.js') },
  { key: 'attendance', label: 'Revisión de asistencia', icon: '☑', group: 'Operación', principal: 'admin', load: () => import('./views/attendance.js') },
  { key: 'incidents', label: 'Faltas e incidencias', icon: '⚑', group: 'Operación', principal: 'admin', load: () => import('./views/incidents.js'), badge: 'incidents' },
  { key: 'overtime', label: 'Horas extra', icon: '⏱', group: 'Operación', principal: 'admin', load: () => import('./views/overtime.js'), badge: 'overtime' },
  { key: 'periods', label: 'Periodos y NOI', icon: '⇄', group: 'Nómina', principal: 'admin', load: () => import('./views/noi.js') },
  { key: 'rh-recibos', label: 'Recibos', icon: '🧾', group: 'Recursos Humanos', principal: 'admin', load: () => import('./views/rh/recibos.js') },
  { key: 'rh-vacaciones', label: 'Vacaciones (saldos)', icon: '🌴', group: 'Recursos Humanos', principal: 'admin', load: () => import('./views/rh/vacaciones.js') },
  { key: 'rh-tickets', label: 'Tickets RH', icon: '🎫', group: 'Recursos Humanos', principal: 'admin', load: () => import('./views/rh/tickets.js') },
  { key: 'rh-indicadores', label: 'Indicadores RH', icon: '📊', group: 'Recursos Humanos', principal: 'admin', load: () => import('./views/rh/indicadores.js') },
  { key: 'employees', label: 'Empleados', icon: '👤', group: 'Catálogos', principal: 'admin', load: () => import('./views/employees.js') },
  { key: 'schedules', label: 'Horarios y reglas', icon: '◷', group: 'Catálogos', principal: 'admin', load: () => import('./views/schedules.js') },
  { key: 'checador', label: 'Checador', icon: '⧉', group: 'Catálogos', principal: 'admin', load: () => import('./views/checador.js') },
  { key: 'users', label: 'Usuarios', icon: '⚙', group: 'Administración', principal: 'admin', load: () => import('./views/users.js'), roles: ['admin'] },
  { key: 'audit', label: 'Bitácora', icon: '❐', group: 'Administración', principal: 'admin', load: () => import('./views/audit.js') },
  // ---- Portal del empleado ----
  { key: 'portal-asistencia', label: 'Mi asistencia', icon: '☑', group: 'Mi portal', principal: 'empleado', load: () => import('./views/portal/asistencia.js') },
  { key: 'portal-vacaciones', label: 'Vacaciones y permisos', icon: '🌴', group: 'Mi portal', principal: 'empleado', load: () => import('./views/portal/vacaciones.js') },
  { key: 'portal-recibos', label: 'Mis recibos', icon: '🧾', group: 'Mi portal', principal: 'empleado', load: () => import('./views/portal/recibos.js') },
  { key: 'portal-tickets', label: 'Mis tickets', icon: '🎫', group: 'Mi portal', principal: 'empleado', load: () => import('./views/portal/tickets.js') },
];

export function defaultRoute() {
  return state.principal === 'empleado' ? 'portal-asistencia' : 'dashboard';
}
export function routeFor(key) { return ROUTES.find((r) => r.key === key); }

export function navigate(key) {
  if (location.hash.slice(1) === key) render();
  else location.hash = key;
}

let onRender = null;
export function setRenderHook(fn) { onRender = fn; }

let renderSeq = 0;
export async function render() {
  const seq = ++renderSeq; // descarta renders obsoletos (anti-carrera)
  const key = location.hash.slice(1) || defaultRoute();
  let route = routeFor(key);
  // No permitir cruzar de persona
  if (!route || route.principal !== state.principal || (route.roles && !can(...route.roles))) {
    if (route && route.principal !== state.principal) return navigate(defaultRoute());
    if (route && route.roles && !can(...route.roles)) { toast('No tienes acceso a esa sección', 'err'); return navigate(defaultRoute()); }
    route = routeFor(defaultRoute());
  }
  const view = document.getElementById('view');
  document.getElementById('view-title').textContent = route.label;
  clear(view).appendChild(h('div', { class: 'empty' }, h('div', { class: 'big' }, '⏳'), 'Cargando…'));
  try {
    const mod = await route.load();
    if (seq !== renderSeq) return; // otro render tomó el control
    clear(view);
    await mod.default(view);
  } catch (err) {
    if (seq !== renderSeq) return;
    console.error(err);
    clear(view).appendChild(h('div', { class: 'note-box warn' }, 'Error al cargar la vista: ' + err.message));
  }
  if (seq === renderSeq && onRender) onRender(route.key);
}
