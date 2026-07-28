// Configuración por variables de entorno con valores por defecto para el evento.

export const config = {
  port: Number(process.env.PORT) || 4000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  // PIN del personal para acceder a Sorteo y Dashboard. Si se deja vacío, el acceso es abierto (útil en pruebas).
  staffPin: (process.env.STAFF_PIN || '').trim(),
  jsonLimit: process.env.JSON_LIMIT || '8mb', // permite adjuntar la foto del gafete (base64)
  // Nº de proxies de confianza (para obtener la IP real detrás de nginx/Render). 0/false = sin proxy.
  trustProxy: process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : (process.env.NODE_ENV === 'production' ? 1 : 0),
  // Límite de autoregistros por IP (backstop anti-spam de la landing pública). Generoso para redes con NAT del venue.
  registroRateMax: Number(process.env.REGISTRO_RATE_MAX) || 60,
  registroRateWindowMs: Number(process.env.REGISTRO_RATE_WINDOW_MS) || 60000,
  // Correo (SMTP) para notificar al ganador con su folio. Si SMTP_HOST está vacío, el envío se omite.
  smtp: {
    host: (process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true para 465
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || 'Mallatex <no-reply@mallatex.com.mx>',
};
