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
  // Notificación del folio al ganador. Orden de preferencia:
  //   1) Mailchimp Transactional (Mandrill) por API — recomendado.
  //   2) SMTP (incluye smtp.mandrillapp.com o cualquier proveedor).
  // Si no hay ninguno configurado, el envío se omite y el folio se entrega a mano.
  mandrill: {
    apiKey: (process.env.MANDRILL_API_KEY || process.env.MAILCHIMP_TRANSACTIONAL_API_KEY || '').trim(),
    apiUrl: (process.env.MANDRILL_API_URL || 'https://mandrillapp.com/api/1.0/messages/send.json').trim(),
  },
  smtp: {
    host: (process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true para 465
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  mailFrom: process.env.MAIL_FROM || 'Mallatex <no-reply@mallatex.com.mx>',
  // Autenticación de usuarios.
  authSecret: (process.env.AUTH_SECRET || '').trim(), // si se omite, se genera y guarda en la base
  authTtlHours: Number(process.env.AUTH_TTL_HOURS) || 12,
  // Administrador inicial (se crea al primer arranque si no hay usuarios).
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@mallatex.com').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || process.env.STAFF_PIN || 'mallatex',
  adminName: process.env.ADMIN_NAME || 'Administrador',
  // NIP estático de configuración inicial. Permite entrar SIN contraseña, solo
  // mientras la configuración esté abierta (setupCompleted=false), para crear los
  // usuarios reales. Al finalizar la configuración, el NIP queda inservible.
  // Vacío = deshabilitado. Se reabre con SETUP_REOPEN=true (una vez).
  setupPin: (process.env.SETUP_PIN || '').trim(),
  // Dominio canónico público (p. ej. "sorteo-mallatex.com"). Si se define, en
  // producción las visitas por otro host o por http se redirigen (301) a
  // https://<canonicalHost>. Vacío = sin redirección (útil en pruebas/preview).
  canonicalHost: (process.env.CANONICAL_HOST || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
};
