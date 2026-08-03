/**
 * Configuración central por variables de entorno. Congelada al arranque.
 * Cada microservicio la reutiliza; los puertos y nombres se resuelven por
 * `SERVICE_NAME`/`PORT` propios de cada proceso.
 */
const env = process.env;

function bool(v, def = false) {
  if (v == null) return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

const dialect = env.DB_DIALECT || (env.DATABASE_URL ? 'postgres' : 'sqlite');

export const config = Object.freeze({
  env: env.NODE_ENV || 'development',
  isProd: env.NODE_ENV === 'production',
  service: env.SERVICE_NAME || 'app',
  port: Number(env.PORT || 3000),

  db: Object.freeze({
    dialect,
    url:
      env.DATABASE_URL ||
      'postgres://mallatex:mallatex@localhost:5432/mallatex',
    storage: env.SQLITE_STORAGE || './data/mallatex.sqlite',
    ssl: bool(env.DATABASE_SSL, false),
    logging: bool(env.DB_LOGGING, false),
  }),

  auth: Object.freeze({
    jwtSecret: env.JWT_SECRET || 'dev-mallatex-secret-change-me',
    ttlHours: Number(env.AUTH_TTL_HOURS || 12),
    issuer: env.JWT_ISSUER || 'mallatex-plataforma',
  }),

  gateway: Object.freeze({
    identityUrl: env.IDENTITY_URL || 'http://localhost:3001',
    attendanceUrl: env.ATTENDANCE_URL || 'http://localhost:3002',
    crmUrl: env.CRM_URL || 'http://localhost:3003',
    mesUrl: env.MES_URL || 'http://localhost:3004',
    leadsUrl: env.LEADS_URL || 'http://localhost:3005',
    marketingUrl: env.MARKETING_URL || 'http://localhost:3006',
  }),

  http: Object.freeze({
    corsOrigins: (env.CORS_ORIGINS || '*')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    jsonLimit: env.JSON_LIMIT || '10mb',
    trustProxy: bool(env.TRUST_PROXY, false),
  }),

  company: Object.freeze({
    name: env.COMPANY_NAME || 'Tejidos Técnicos Mallatex S.A. de C.V.',
    brand: 'Mallatex',
    poweredBy: 'Evorgyn',
  }),
});
