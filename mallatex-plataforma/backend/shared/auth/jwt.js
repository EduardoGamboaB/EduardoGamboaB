import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config/index.js';

/**
 * Emisión/validación de JWT compartida por todos los servicios.
 * El token transporta la identidad (sub, principal, role/profile) y los
 * módulos efectivos ya resueltos por el servicio de identidad, de modo que
 * el gateway y cada servicio autorizan sin volver a consultar la matriz.
 * Cada token lleva un `jti` único para poder revocarlo (logout server-side).
 */
export function signToken(claims) {
  return jwt.sign(claims, config.auth.jwtSecret, {
    issuer: config.auth.issuer,
    expiresIn: `${config.auth.ttlHours}h`,
    jwtid: randomUUID(),
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.auth.jwtSecret, {
    issuer: config.auth.issuer,
  });
}

export function decodeToken(token) {
  return jwt.decode(token);
}
