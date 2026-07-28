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
export function signToken(user, extra = {}) {
  const payload = { uid: user.id, role: user.role, exp: Date.now() + config.authTtlHours * 3600 * 1000, ...extra };
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', authSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

// Token de la sesión de configuración inicial (acceso por NIP). No corresponde a
// ningún usuario real; otorga rol admin solo mientras la configuración esté abierta.
export function signSetupToken() {
  return signToken({ id: 'setup', role: 'admin' }, { setup: true });
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
  // Sesión de configuración inicial (NIP): válida solo mientras no se haya
  // finalizado la configuración. Al completarla, el token queda inservible.
  if (p.setup) {
    if (db().setupCompleted) return null;
    return { id: 'setup', email: 'setup', name: 'Configuración inicial', role: 'admin', activo: true, setup: true };
  }
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
  return { id: u.id, email: u.email, name: u.name, role: u.role, activo: u.activo !== false, createdAt: u.createdAt, setup: u.setup === true };
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

// Garantiza el acceso de administrador en el arranque, de forma idempotente:
//
//  1) Base sin usuarios  → crea el admin inicial (ADMIN_EMAIL/ADMIN_PASSWORD o los
//     valores por defecto).
//  2) Ya hay usuarios pero se definió ADMIN_EMAIL y ese admin NO existe → lo crea.
//     Cubre el caso típico de producción: la base ya tenía un admin por defecto y
//     después se configura otro correo. No modifica usuarios existentes (no pisa
//     contraseñas), solo agrega el que falta.
//  3) ADMIN_RESET=true → (re)establece la contraseña del admin ADMIN_EMAIL aunque
//     ya exista (útil para recuperar el acceso si se olvidó la contraseña).
export function ensureAdmin() {
  // 1) Primer arranque: base vacía.
  if (getUsers().length === 0) {
    createUser({ email: config.adminEmail, name: config.adminName, password: config.adminPassword, role: 'admin' });
    const usingDefault = config.adminPassword === 'mallatex' && !process.env.ADMIN_PASSWORD && !process.env.STAFF_PIN;
    console.log(`Usuario administrador creado: ${config.adminEmail}` + (usingDefault ? ' (contraseña por defecto "mallatex" — cámbiala)' : ''));
    return { seeded: true, email: config.adminEmail };
  }

  const result = {};

  // 2) ADMIN_EMAIL explícito cuyo usuario aún no existe → crearlo (sin tocar a los demás).
  if (process.env.ADMIN_EMAIL && !getUserByEmail(config.adminEmail)) {
    createUser({ email: config.adminEmail, name: config.adminName, password: config.adminPassword, role: 'admin' });
    console.log(`Administrador agregado (ADMIN_EMAIL): ${config.adminEmail}`);
    result.created = true;
  }

  // 3) ADMIN_RESET=true → restablece (o crea) el admin ADMIN_EMAIL con ADMIN_PASSWORD.
  if (process.env.ADMIN_RESET === 'true') {
    const u = getUserByEmail(config.adminEmail);
    if (u) {
      u.passwordHash = hashPassword(config.adminPassword); u.role = 'admin'; u.activo = true; save();
      console.log(`Administrador restablecido por ADMIN_RESET: ${config.adminEmail}`);
      result.reset = true;
    } else {
      createUser({ email: config.adminEmail, name: config.adminName, password: config.adminPassword, role: 'admin' });
      console.log(`Administrador creado por ADMIN_RESET: ${config.adminEmail}`);
      result.created = true;
    }
  }

  return Object.keys(result).length ? result : { seeded: false };
}

// Estado del acceso por NIP de configuración inicial.
// SETUP_REOPEN=true reabre la configuración (una vez) en una base ya existente,
// para poder recuperar el acceso creando usuarios sin conocer la contraseña.
export function bootstrapSetup() {
  const d = db();
  if (process.env.SETUP_REOPEN === 'true' && d.setupCompleted) {
    d.setupCompleted = false; save();
    console.log('Configuración por NIP REABIERTA (SETUP_REOPEN). Crea tus usuarios, finaliza la configuración y quita la variable.');
  }
  const habilitado = !!config.setupPin && !d.setupCompleted;
  console.log(`Acceso por NIP de configuración: ${habilitado ? 'HABILITADO' : 'deshabilitado'}`);
  return { habilitado };
}
