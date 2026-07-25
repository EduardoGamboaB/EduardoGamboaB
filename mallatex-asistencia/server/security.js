// Middlewares de seguridad y operación, sin dependencias externas:
// cabeceras de seguridad (incluye CSP con nonce), CORS configurable, limitador de
// intentos de acceso y registro de peticiones.

import crypto from 'node:crypto';
import { config } from './config.js';

// ---------- Cabeceras de seguridad ----------
export function securityHeaders(req, res, next) {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  // La cámara del kiosco necesita permiso explícito; lo demás, denegado.
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');

  if (config.enableHsts && isSecure(req)) {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }

  if (config.enableCsp) {
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // 'wasm-unsafe-eval' permite el backend WASM de face-api (reconocimiento facial).
      `script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval'`,
      "connect-src 'self'",
      "form-action 'self'",
    ].join('; '));
  }
  next();
}

function isSecure(req) {
  return req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

// ---------- CORS (sólo si se configuran orígenes) ----------
export function cors(req, res, next) {
  const origin = req.headers.origin;
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');
    res.setHeader('Access-Control-Max-Age', '600');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }
  next();
}

// ---------- Limitador de intentos (memoria) ----------
// Ventana deslizante por clave. Suficiente para una sola instancia; con varias réplicas
// conviene un almacén compartido (Redis).
export function rateLimiter({ max, windowMs, keyFn, message }) {
  const hits = new Map(); // key -> number[] (timestamps)
  // Limpieza periódica para no crecer sin límite.
  const timer = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [k, arr] of hits) {
      const kept = arr.filter((t) => t > cutoff);
      if (kept.length) hits.set(k, kept); else hits.delete(k);
    }
  }, windowMs);
  if (timer.unref) timer.unref();

  const mw = (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const cutoff = now - windowMs;
    const arr = (hits.get(key) || []).filter((t) => t > cutoff);
    if (arr.length >= max) {
      const retry = Math.ceil((arr[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retry)));
      return res.status(429).json({ error: message || 'Demasiados intentos, espera un momento.' });
    }
    arr.push(now);
    hits.set(key, arr);
    // Permite “perdonar” el intento cuando la operación resulta exitosa.
    req.rateLimitForgive = () => {
      const cur = hits.get(key);
      if (cur && cur.length) { cur.pop(); if (!cur.length) hits.delete(key); }
    };
    next();
  };
  mw._hits = hits; // expuesto para pruebas
  return mw;
}

export function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// ---------- Registro de peticiones ----------
export function requestLogger(req, res, next) {
  if (!config.logRequests) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms ${clientIp(req)}`;
    if (res.statusCode >= 500) console.error(line);
    else console.log(line);
  });
  next();
}
