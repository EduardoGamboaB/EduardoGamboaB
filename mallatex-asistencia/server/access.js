// Modelo de acceso por PERFIL/ROL — fuente de verdad de qué módulos ve cada usuario.
//
// El backend decide qué módulos están disponibles y los devuelve en /me; la web y la app
// móvil sólo renderizan el menú a partir de esa lista (nada de menús "hardcodeados" por
// cliente). Así el control es end-to-end: el mismo modelo alimenta el menú y respalda los
// guardas de cada endpoint.
//
//   - Usuarios administrativos (web)  → módulos por ROL (admin/contador/nómina/comercial).
//   - Colaboradores (app móvil/portal) → módulos por PERFIL derivado del puesto/área.

import * as db from './db.js';
import { ROLES } from './auth.js';

// ---------- Web: módulos (claves de ruta del SPA admin) por rol ----------
const OPERACION = ['dashboard', 'attendance', 'incidents', 'overtime'];
const NOMINA = ['periods', 'variable-pay'];
const COMERCIAL = ['crm-clientes', 'crm-objetivos', 'crm-administrativo', 'crm-facturacion'];
const RH = ['rh-recibos', 'rh-vacaciones', 'rh-tickets', 'rh-indicadores'];
const CATALOGOS = ['employees', 'schedules', 'checador'];

export const WEB_MODULES_BY_ROLE = {
  [ROLES.ADMIN]: [...OPERACION, ...NOMINA, ...COMERCIAL, ...RH, ...CATALOGOS, 'users', 'audit'],
  [ROLES.CONTADOR]: [...OPERACION, ...NOMINA, ...COMERCIAL, ...RH, ...CATALOGOS, 'audit'],
  [ROLES.NOMINA]: [...OPERACION, ...NOMINA, ...RH, ...CATALOGOS, 'audit'],
  [ROLES.COMERCIAL]: [...COMERCIAL],
};

// Módulos del portal del empleado (web). Aplican a todo colaborador.
export const PORTAL_MODULES = ['portal-asistencia', 'portal-vacaciones', 'portal-recibos', 'portal-tickets'];

// Roles con acceso a la administración comercial (CRM) — usado por guardas de ruta.
export const CRM_ROLES = [ROLES.ADMIN, ROLES.CONTADOR, ROLES.COMERCIAL];

export function webModulesFor(principal, user) {
  if (principal === 'empleado') return PORTAL_MODULES;
  return WEB_MODULES_BY_ROLE[user?.role] || [];
}

// ---------- Móvil: perfil del colaborador y sus módulos ----------
export const MOBILE_MODULES_BY_PROFILE = {
  comercial: ['ruta', 'clientes', 'visita', 'desempeno', 'asistencia', 'inventario', 'cotizador', 'pedidos', 'bot', 'viaticos', 'gastos', 'facturas', 'perfil'],
  operativo: ['asistencia', 'perfil'],
};

// Deriva el perfil de la app móvil. Prioriza un override explícito (emp.appProfile) y, si no,
// lo infiere del área/puesto: Ventas → comercial; el resto → operativo (asistencia de campo).
export function employeeProfile(emp) {
  if (emp?.appProfile && MOBILE_MODULES_BY_PROFILE[emp.appProfile]) return emp.appProfile;
  const dept = (emp?.department || '').toLowerCase();
  const pos = (emp?.position || '').toLowerCase();
  if (dept.includes('venta') || dept.includes('comercial') || pos.includes('vend')) return 'comercial';
  return 'operativo';
}

export function mobileAccessFor(emp) {
  const profile = employeeProfile(emp);
  return { profile, modules: MOBILE_MODULES_BY_PROFILE[profile] || MOBILE_MODULES_BY_PROFILE.operativo };
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
