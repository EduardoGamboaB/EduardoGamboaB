// Router simple basado en hash + configuración de navegación.
import { clear, h, toast } from './ui.js';
import { can } from './state.js';

export const ROUTES = [
  { key: 'dashboard', label: 'Tablero', icon: '▤', group: 'Operación', load: () => import('./views/dashboard.js') },
  { key: 'attendance', label: 'Revisión de asistencia', icon: '☑', group: 'Operación', load: () => import('./views/attendance.js') },
  { key: 'incidents', label: 'Faltas e incidencias', icon: '⚑', group: 'Operación', load: () => import('./views/incidents.js'), badge: 'incidents' },
  { key: 'overtime', label: 'Horas extra', icon: '⏱', group: 'Operación', load: () => import('./views/overtime.js'), badge: 'overtime' },
  { key: 'periods', label: 'Periodos y NOI', icon: '⇄', group: 'Nómina', load: () => import('./views/noi.js') },
  { key: 'employees', label: 'Empleados', icon: '👤', group: 'Catálogos', load: () => import('./views/employees.js') },
  { key: 'schedules', label: 'Horarios y reglas', icon: '◷', group: 'Catálogos', load: () => import('./views/schedules.js') },
  { key: 'checador', label: 'Checador', icon: '⧉', group: 'Catálogos', load: () => import('./views/checador.js') },
  { key: 'users', label: 'Usuarios', icon: '⚙', group: 'Administración', load: () => import('./views/users.js'), roles: ['admin'] },
  { key: 'audit', label: 'Bitácora', icon: '❐', group: 'Administración', load: () => import('./views/audit.js') },
];

export function routeFor(key) { return ROUTES.find((r) => r.key === key); }

export function navigate(key) {
  if (location.hash.slice(1) === key) render();
  else location.hash = key;
}

let onRender = null;
export function setRenderHook(fn) { onRender = fn; }

export async function render() {
  const key = location.hash.slice(1) || 'dashboard';
  const route = routeFor(key) || ROUTES[0];
  if (route.roles && !can(...route.roles)) {
    toast('No tienes acceso a esa sección', 'err');
    return navigate('dashboard');
  }
  const view = document.getElementById('view');
  document.getElementById('view-title').textContent = route.label;
  clear(view).appendChild(h('div', { class: 'empty' }, h('div', { class: 'big' }, '⏳'), 'Cargando…'));
  try {
    const mod = await route.load();
    clear(view);
    await mod.default(view);
  } catch (err) {
    console.error(err);
    clear(view).appendChild(h('div', { class: 'note-box warn' }, 'Error al cargar la vista: ' + err.message));
  }
  if (onRender) onRender(key);
}
