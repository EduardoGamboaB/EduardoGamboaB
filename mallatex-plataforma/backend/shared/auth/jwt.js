import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

/**
 * Emisión/validación de JWT compartida por todos los servicios.
 * El token transporta la identidad (sub, principal, role/profile) y los
 * módulos efectivos ya resueltos por el servicio de identidad, de modo que
 * el gateway y cada servicio autorizan sin volver a consultar la matriz.
 */
export function signToken(claims) {
  return jwt.sign(claims, config.auth.jwtSecret, {
    issuer: config.auth.issuer,
    expiresIn: `${config.auth.ttlHours}h`,
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
