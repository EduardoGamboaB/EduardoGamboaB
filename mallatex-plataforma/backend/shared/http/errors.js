import { DomainError } from '../ddd/Result.js';

/** Envuelve handlers async para propagar errores al middleware de error. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(_req, res) {
  res.status(404).json({ error: 'Recurso no encontrado' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof DomainError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details || undefined,
    });
  }
  if (err?.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'Registro duplicado', code: 'DUPLICATE' });
  }
  if (err?.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      code: 'VALIDATION',
      details: err.errors?.map((e) => e.message),
    });
  }
  // eslint-disable-next-line no-console
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
