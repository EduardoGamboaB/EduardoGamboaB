// Autenticación sencilla por token en memoria + control de roles.
// Dos tipos de sesión: administrativa (users) y de empleado (portal).
// Para un prototipo esto es suficiente; en producción se sustituye por JWT + hash.

import crypto from 'node:crypto';
import * as db from './db.js';

const sessions = new Map(); // token -> { type:'admin'|'empleado', id }

export const ROLES = {
  ADMIN: 'admin',
  CONTADOR: 'contador',
  NOMINA: 'nomina',
};

export const ROLE_LABEL = {
  admin: 'Administrador',
  contador: 'Contador general',
  nomina: 'Responsable de nómina',
};

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt] = stored.split(':');
  return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(hashPassword(password, salt)));
}

// ---- Sesión administrativa ----
export function login(email, password) {
  const user = db.find('users', (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.active !== false);
  if (!user || !verifyPassword(password, user.password)) return null;
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { type: 'admin', id: user.id });
  return { token, user: publicUser(user), principal: 'admin' };
}

// ---- Sesión de empleado (portal) ----
export function loginEmployee(code, pin) {
  const emp = db.find('employees', (e) => e.active !== false && e.code && e.code.toLowerCase() === String(code).toLowerCase());
  if (!emp || !emp.pin || String(emp.pin) !== String(pin)) return null;
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { type: 'empleado', id: emp.id });
  return { token, employee: publicEmployee(emp), principal: 'empleado' };
}

export function logout(token) { sessions.delete(token); }

export function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

export function publicEmployee(emp) {
  if (!emp) return null;
  const { pin, faceDescriptor, facePhoto, password, ...rest } = emp;
  return { ...rest, faceEnrolled: Array.isArray(faceDescriptor) && faceDescriptor.length > 0 };
}

// Middleware: exige sesión válida (admin o empleado)
export function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || req.headers['x-auth-token'];
  const s = sessions.get(token);
  if (!s) return res.status(401).json({ error: 'No autenticado' });
  req.token = token;
  req.principal = s.type;
  if (s.type === 'admin') {
    const user = db.get('users', s.id);
    if (!user || user.active === false) return res.status(401).json({ error: 'No autenticado' });
    req.user = publicUser(user);
  } else {
    const emp = db.get('employees', s.id);
    if (!emp || emp.active === false) return res.status(401).json({ error: 'No autenticado' });
    req.employee = publicEmployee(emp);
    req.employeeId = emp.id;
  }
  next();
}

// Middleware: exige rol administrativo
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ error: 'No autorizado para esta acción' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No autorizado para esta acción' });
    next();
  };
}

// Middleware: exige sesión de empleado (portal)
export function requireEmployee(req, res, next) {
  if (req.principal !== 'empleado' || !req.employeeId) return res.status(403).json({ error: 'Sólo para el portal del empleado' });
  next();
}

// Middleware: exige sesión administrativa (bloquea al portal del empleado)
export function adminOnly(req, res, next) {
  if (req.principal !== 'admin' || !req.user) return res.status(403).json({ error: 'Sólo para personal administrativo' });
  next();
}
