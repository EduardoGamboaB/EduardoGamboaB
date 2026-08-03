import { verifyToken } from './jwt.js';

function extractToken(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  if (req.headers['x-access-token']) return String(req.headers['x-access-token']);
  return null;
}

/** Puebla req.auth con los claims del JWT (si hay). No obliga. */
export function attachAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.auth = verifyToken(token);
    } catch {
      req.auth = null;
    }
  }
  next();
}

/** Exige sesión válida. */
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    req.auth = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

/** Exige que el principal sea de tipo administrador (usuarios). */
export function adminOnly(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'No autenticado' });
  if (req.auth.principal !== 'admin') {
    return res.status(403).json({ error: 'Requiere acceso administrativo' });
  }
  next();
}

/** Exige uno de los roles indicados (para principal admin). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'No autenticado' });
    if (req.auth.principal === 'admin' && req.auth.role === 'admin') return next();
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Rol no autorizado' });
    }
    next();
  };
}

/**
 * Exige que el sujeto tenga acceso a un módulo (según la matriz efectiva
 * resuelta en el token, campo `modules`). Aplica a web, portal y móvil.
 */
export function requireModule(moduleKey, surface = 'modules') {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'No autenticado' });
    if (req.auth.role === 'admin') return next();
    const granted = req.auth[surface] || req.auth.modules || [];
    if (!granted.includes(moduleKey)) {
      return res.status(403).json({ error: `Módulo no autorizado: ${moduleKey}` });
    }
    next();
  };
}

/** Exige perfil de empleado (móvil/portal). */
export function requireEmployee(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'No autenticado' });
  if (req.auth.principal !== 'employee') {
    return res.status(403).json({ error: 'Requiere sesión de empleado' });
  }
  next();
}

/** Exige perfil comercial (CRM móvil). */
export function requireCommercialProfile(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'No autenticado' });
  if (req.auth.profile !== 'comercial' && req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Requiere perfil comercial' });
  }
  next();
}
