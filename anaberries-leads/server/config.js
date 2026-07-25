// Configuración por variables de entorno con valores por defecto para el evento.

export const config = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  // PIN del personal para acceder a Sorteo y Dashboard. Si se deja vacío, el acceso es abierto (útil en pruebas).
  staffPin: (process.env.STAFF_PIN || '').trim(),
  jsonLimit: process.env.JSON_LIMIT || '8mb', // permite adjuntar la foto del gafete (base64)
};
