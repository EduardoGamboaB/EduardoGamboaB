// Autenticación sencilla por token en memoria + control de roles.
// Roles: admin (configuración), contador (contador general), nomina (responsable de nómina).
// Para un prototipo esto es suficiente; en producción se sustituye por JWT + hash.

import crypto from 'node:crypto';
import * as db from './db.js';

const sessions = new Map(); // token -> userId

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
  return crypto.timingSafeEqual(
    Buffer.from(stored),
    Buffer.from(hashPassword(password, salt))
  );
}

export function login(email, password) {
  const user = db.find('users', (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.active !== false);
  if (!user || !verifyPassword(password, user.password)) return null;
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  return { token, user: publicUser(user) };
}

export function logout(token) {
  sessions.delete(token);
}

export function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

export function userFromToken(token) {
  const userId = sessions.get(token);
  if (!userId) return null;
  return db.get('users', userId);
}

// Middleware: exige sesión válida
export function requireAuth(req, res, next) {
  const token =
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
    req.headers['x-auth-token'];
  const user = userFromToken(token);
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  req.user = publicUser(user);
  req.token = token;
  next();
}

// Middleware: exige uno de los roles indicados
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado para esta acción' });
    }
    next();
  };
}
