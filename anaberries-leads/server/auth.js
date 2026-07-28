// Autenticación de usuarios: contraseñas con scrypt y tokens firmados (HMAC).
// Sustituye el acceso por PIN. Las contraseñas nunca se guardan en claro.

import crypto from 'node:crypto';
import { config } from './config.js';
import { db, save, newId, getUserById, getUserByEmail, getUsers } from './store.js';

// ---------- Contraseñas (scrypt) ----------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
export function verifyPassword(password, stored) {
  try {
    const [alg, salt, hash] = String(stored || '').split('$');
    if (alg !== 'scrypt' || !salt || !hash) return false;
    const calc = crypto.scryptSync(String(password), salt, 64);
    const a = Buffer.from(hash, 'hex');
    return a.length === calc.length && crypto.timingSafeEqual(a, calc);
  } catch { return false; }
}

// ---------- Secreto de firma ----------
function authSecret() {
  if (config.authSecret) return config.authSecret;
  const data = db();
  if (!data.authSecret) { data.authSecret = crypto.randomBytes(32).toString('hex'); save(); }
  return data.authSecret;
}

// ---------- Tokens firmados ----------
const b64u = (buf) => Buffer.from(buf).toString('base64url');
export function signToken(user) {
  const payload = { uid: user.id, role: user.role, exp: Date.now() + config.authTtlHours * 3600 * 1000 };
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', authSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', authSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig || ''); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function tokenFromReq(req) {
  const h = req.get('authorization') || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return (req.get('x-auth-token') || req.query.token || '').toString().trim();
}

// Usuario autenticado (o null).
export function userFromReq(req) {
  const p = verifyToken(tokenFromReq(req));
  if (!p) return null;
  const u = getUserById(p.uid);
  if (!u || u.activo === false) return null;
  return u;
}

// ---------- Middlewares ----------
export function requireAuth(req, res, next) {
  const u = userFromReq(req);
  if (!u) return res.status(401).json({ error: 'Sesión requerida' });
  req.user = u;
  next();
}
export function requireAdmin(req, res, next) {
  const u = userFromReq(req);
  if (!u) return res.status(401).json({ error: 'Sesión requerida' });
  if (u.role !== 'admin') return res.status(403).json({ error: 'Requiere rol de administrador' });
  req.user = u;
  next();
}

// Vista pública de un usuario (sin hash).
export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role, activo: u.activo !== false, createdAt: u.createdAt };
}

// ---------- Alta / autenticación ----------
export function createUser({ email, name, password, role = 'staff', activo = true }) {
  const u = {
    id: newId('usr'),
    email: String(email).trim().toLowerCase(),
    name: String(name || '').trim() || String(email).split('@')[0],
    role: role === 'admin' ? 'admin' : 'staff',
    passwordHash: hashPassword(password),
    activo: activo !== false,
    createdAt: new Date().toISOString(),
  };
  db().users.push(u);
  save();
  return u;
}

export function authenticate(email, password) {
  const u = getUserByEmail(email);
  if (!u || u.activo === false) return null;
  if (!verifyPassword(password, u.passwordHash)) return null;
  return u;
}

// Crea el administrador inicial si no existe ningún usuario.
export function ensureAdmin() {
  if (getUsers().length > 0) return { seeded: false };
  createUser({ email: config.adminEmail, name: config.adminName, password: config.adminPassword, role: 'admin' });
  const usingDefault = config.adminPassword === 'mallatex' && !process.env.ADMIN_PASSWORD && !process.env.STAFF_PIN;
  console.log(`Usuario administrador creado: ${config.adminEmail}` + (usingDefault ? ' (contraseña por defecto "mallatex" — cámbiala)' : ''));
  return { seeded: true, email: config.adminEmail };
}
