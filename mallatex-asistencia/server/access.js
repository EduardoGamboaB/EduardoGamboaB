// Modelo de acceso por PERFIL/ROL — fuente de verdad de qué módulos ve cada usuario.
//
// El backend decide qué módulos están disponibles y los devuelve en /me; la web y la app
// móvil sólo renderizan el menú a partir de esa lista (nada de menús "hardcodeados" por
// cliente). Así el control es end-to-end: el mismo modelo alimenta el menú y respalda los
// guardas de cada endpoint.
//
//   - Usuarios administrativos (web)  → módulos por ROL (admin/contador/nómina/comercial).
//   - Colaboradores (app móvil/portal) → módulos por PERFIL derivado del puesto/área.
//
// La matriz rol→módulos y perfil→módulos es CONFIGURABLE (se guarda en settings.access desde
// Configuración → Permisos); aquí viven los VALORES POR DEFECTO. Además cada usuario/colaborador
// admite ajustes finos: `extraModules` (conceder) y `revokedModules` (revocar).

import * as db from './db.js';
import { ROLES } from './auth.js';

// ---------- Catálogo de módulos web (claves de ruta del SPA admin) ----------
export const WEB_MODULE_CATALOG = [
  { key: 'dashboard', label: 'Tablero', group: 'Operación' },
  { key: 'attendance', label: 'Revisión de asistencia', group: 'Operación' },
  { key: 'incidents', label: 'Faltas e incidencias', group: 'Operación' },
  { key: 'overtime', label: 'Horas extra', group: 'Operación' },
  { key: 'periods', label: 'Periodos y NOI', group: 'Nómina' },
  { key: 'variable-pay', label: 'Percepciones variables', group: 'Nómina' },
  { key: 'crm-clientes', label: 'Cartera de clientes', group: 'Comercial' },
  { key: 'crm-objetivos', label: 'Objetivos de venta', group: 'Comercial' },
  { key: 'crm-administrativo', label: 'Viáticos y gastos', group: 'Comercial' },
  { key: 'crm-facturacion', label: 'Facturación', group: 'Comercial' },
  { key: 'rh-recibos', label: 'Recibos', group: 'Recursos Humanos' },
  { key: 'rh-vacaciones', label: 'Vacaciones (saldos)', group: 'Recursos Humanos' },
  { key: 'rh-tickets', label: 'Tickets RH', group: 'Recursos Humanos' },
  { key: 'rh-indicadores', label: 'Indicadores RH', group: 'Recursos Humanos' },
  { key: 'employees', label: 'Empleados', group: 'Catálogos' },
  { key: 'schedules', label: 'Horarios y reglas', group: 'Catálogos' },
  { key: 'checador', label: 'Checador', group: 'Catálogos' },
  { key: 'audit', label: 'Bitácora', group: 'Administración' },
  { key: 'users', label: 'Usuarios', group: 'Configuración' },
  { key: 'cfg-roles', label: 'Roles', group: 'Configuración' },
  { key: 'cfg-modulos', label: 'Módulos', group: 'Configuración' },
  { key: 'cfg-permisos', label: 'Permisos', group: 'Configuración' },
  { key: 'cfg-asignacion', label: 'Asignación', group: 'Configuración' },
];
export const WEB_MODULE_KEYS = WEB_MODULE_CATALOG.map((m) => m.key);
const CONFIG_KEYS = ['users', 'cfg-roles', 'cfg-modulos', 'cfg-permisos', 'cfg-asignacion'];
const keysInGroups = (...groups) => WEB_MODULE_CATALOG.filter((m) => groups.includes(m.group)).map((m) => m.key);

// Matriz rol→módulos POR DEFECTO.
export const DEFAULT_WEB_MODULES = {
  [ROLES.ADMIN]: [...WEB_MODULE_KEYS],
  [ROLES.CONTADOR]: WEB_MODULE_KEYS.filter((k) => !CONFIG_KEYS.includes(k)),
  [ROLES.NOMINA]: [...keysInGroups('Operación', 'Nómina', 'Recursos Humanos', 'Catálogos'), 'audit'],
  [ROLES.COMERCIAL]: keysInGroups('Comercial'),
};

// Módulos del portal del empleado (web). Aplican a todo colaborador.
export const PORTAL_MODULES = ['portal-asistencia', 'portal-vacaciones', 'portal-recibos', 'portal-tickets'];

// Roles con acceso a la administración comercial (CRM) — usado por guardas de ruta.
export const CRM_ROLES = [ROLES.ADMIN, ROLES.CONTADOR, ROLES.COMERCIAL];

// ---------- Catálogo de módulos móviles y perfiles ----------
export const MOBILE_MODULE_CATALOG = [
  { key: 'ruta', label: 'Ruta de visitas', group: 'Ventas' },
  { key: 'clientes', label: 'Mis clientes', group: 'Ventas' },
  { key: 'visita', label: 'Registrar visita', group: 'Ventas' },
  { key: 'desempeno', label: 'Mi desempeño', group: 'Ventas' },
  { key: 'asistencia', label: 'Mi asistencia', group: 'Ventas' },
  { key: 'inventario', label: 'Inventario', group: 'Herramientas' },
  { key: 'cotizador', label: 'Cotizador', group: 'Herramientas' },
  { key: 'pedidos', label: 'Pedidos', group: 'Herramientas' },
  { key: 'bot', label: 'Asistente técnico', group: 'Herramientas' },
  { key: 'viaticos', label: 'Viáticos', group: 'Administración' },
  { key: 'gastos', label: 'Gastos', group: 'Administración' },
  { key: 'facturas', label: 'Facturas', group: 'Administración' },
  { key: 'perfil', label: 'Mi perfil', group: 'Cuenta' },
];
export const MOBILE_MODULE_KEYS = MOBILE_MODULE_CATALOG.map((m) => m.key);
export const PROFILE_CATALOG = [
  { value: 'comercial', label: 'Comercial (squad de ventas)' },
  { value: 'operativo', label: 'Operativo (asistencia de campo)' },
];

export const DEFAULT_MOBILE_MODULES = {
  comercial: [...MOBILE_MODULE_KEYS],
  operativo: ['asistencia', 'perfil'],
};

// ---------- Configuración efectiva (defaults + settings.access) ----------
export function getAccessConfig() {
  const stored = db.getSettings().access || {};
  const web = { ...DEFAULT_WEB_MODULES, ...(stored.web || {}) };
  web[ROLES.ADMIN] = [...WEB_MODULE_KEYS]; // el administrador nunca se puede quedar sin acceso
  return {
    web,
    mobile: { ...DEFAULT_MOBILE_MODULES, ...(stored.mobile || {}) },
  };
}

export function saveAccessConfig(patch) {
  const stored = db.getSettings().access || {};
  const clean = (obj, valid) => Object.fromEntries(Object.entries(obj || {}).map(([k, arr]) => [k, (Array.isArray(arr) ? arr : []).filter((m) => valid.includes(m))]));
  const next = {
    web: { ...(stored.web || {}), ...clean(patch.web, WEB_MODULE_KEYS) },
    mobile: { ...(stored.mobile || {}), ...clean(patch.mobile, MOBILE_MODULE_KEYS) },
  };
  db.saveSettings({ access: next });
  return getAccessConfig();
}

// Aplica ajustes finos por usuario/colaborador sobre la base del rol/perfil.
function applyOverrides(base, extra, revoked, validOrder) {
  const set = new Set(base);
  for (const m of extra || []) if (validOrder.includes(m)) set.add(m);
  for (const m of revoked || []) set.delete(m);
  return validOrder.filter((k) => set.has(k));
}

// ---------- Web: módulos del usuario administrativo ----------
export function webModulesFor(principal, user) {
  if (principal === 'empleado') return PORTAL_MODULES;
  const cfg = getAccessConfig();
  const base = cfg.web[user?.role] || [];
  return applyOverrides(base, user?.extraModules, user?.revokedModules, WEB_MODULE_KEYS);
}

// ---------- Móvil: perfil del colaborador y sus módulos ----------
// Deriva el perfil de la app móvil. Prioriza un override explícito (emp.appProfile) y, si no,
// lo infiere del área/puesto: Ventas → comercial; el resto → operativo (asistencia de campo).
export function employeeProfile(emp) {
  if (emp?.appProfile && DEFAULT_MOBILE_MODULES[emp.appProfile]) return emp.appProfile;
  const dept = (emp?.department || '').toLowerCase();
  const pos = (emp?.position || '').toLowerCase();
  if (dept.includes('venta') || dept.includes('comercial') || pos.includes('vend')) return 'comercial';
  return 'operativo';
}

export function mobileAccessFor(emp) {
  const profile = employeeProfile(emp);
  const cfg = getAccessConfig();
  const base = cfg.mobile[profile] || DEFAULT_MOBILE_MODULES.operativo;
  return { profile, modules: applyOverrides(base, emp?.extraModules, emp?.revokedModules, MOBILE_MODULE_KEYS) };
}

// ---------- Middleware ----------
// Exige que el colaborador tenga perfil comercial (para el API de ventas de la app móvil).
export function requireCommercialProfile(req, res, next) {
  const emp = db.get('employees', req.employeeId);
  if (!emp || employeeProfile(emp) !== 'comercial') {
    return res.status(403).json({ error: 'El módulo comercial no está disponible para tu perfil' });
  }
  next();
}
