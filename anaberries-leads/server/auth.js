// Acceso del personal por PIN (Sorteo y Dashboard).
// Modelo ligero para un evento: si STAFF_PIN está vacío, el acceso es abierto.

import { config } from './config.js';

function pinFromReq(req) {
  return (req.get('x-staff-pin') || req.query.pin || '').toString().trim();
}

// Comparación en tiempo aproximadamente constante para PINs cortos.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isStaff(req) {
  if (!config.staffPin) return true;
  return safeEqual(pinFromReq(req), config.staffPin);
}

export function requireStaff(req, res, next) {
  if (isStaff(req)) return next();
  res.status(401).json({ error: 'PIN inválido o faltante' });
}

// Información para el frontend: si requiere PIN y si el actual es válido.
export function staffInfo(req) {
  return { pinRequired: Boolean(config.staffPin), authorized: isStaff(req) };
}
