// Configuración central por variables de entorno.
// Todo lo específico del despliegue (secretos, datos, TLS, semilla) se controla aquí,
// para que la misma imagen sirva en desarrollo y en producción cambiando sólo el entorno.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const env = process.env;
const NODE_ENV = env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

const bool = (v, def) => (v == null || v === '' ? def : /^(1|true|yes|on)$/i.test(String(v)));
const num = (v, def) => (v == null || v === '' || Number.isNaN(Number(v)) ? def : Number(v));
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

// trust proxy: número de saltos, booleano o lista de IPs (Express). Detrás de un
// balanceador/reverse-proxy con TLS se necesita para leer el esquema/IP reales.
function parseTrustProxy(v, def) {
  if (v == null || v === '') return def;
  if (/^\d+$/.test(v)) return Number(v);
  if (/^(true|false)$/i.test(v)) return /^true$/i.test(v);
  return list(v);
}

export const config = Object.freeze({
  nodeEnv: NODE_ENV,
  isProd,
  port: num(env.PORT, 3000),
  host: env.HOST || '0.0.0.0',

  // Persistencia
  // storage: 'file' (archivo JSON) o 'postgres'. Por defecto postgres si hay DATABASE_URL.
  storage: (env.STORAGE || (env.DATABASE_URL ? 'postgres' : 'file')).toLowerCase(),
  databaseUrl: env.DATABASE_URL || '',
  pgSsl: bool(env.PGSSL, false),
  // Espera acotada para tomar el candado de escritura (advisory lock) durante despliegues
  // con solapamiento (la instancia nueva espera a que la vieja libere). 0 = fallar de inmediato.
  pgLockWaitMs: num(env.PG_LOCK_WAIT_MS, 45000),
  dataDir: env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(ROOT, 'data'),
  backupOnStart: bool(env.BACKUP_ON_START, isProd),
  backupKeep: num(env.BACKUP_KEEP, 14),

  // Red / proxy / TLS (la cámara del kiosco exige contexto seguro: HTTPS)
  trustProxy: parseTrustProxy(env.TRUST_PROXY, isProd ? 1 : false),
  corsOrigins: list(env.CORS_ORIGINS),

  // Seguridad
  enableCsp: bool(env.ENABLE_CSP, true),
  enableHsts: bool(env.ENABLE_HSTS, isProd),
  sessionTtlMs: num(env.SESSION_TTL_HOURS, 12) * 3600 * 1000,
  loginRateMax: num(env.LOGIN_RATE_MAX, 15),
  loginRateWindowMs: num(env.LOGIN_RATE_WINDOW_MIN, 15) * 60 * 1000,
  jsonLimit: env.JSON_LIMIT || '2mb',

  // Arranque / datos
  seedDemo: bool(env.SEED_DEMO, !isProd),
  bootstrapAdmin: {
    email: env.BOOTSTRAP_ADMIN_EMAIL || '',
    password: env.BOOTSTRAP_ADMIN_PASSWORD || '',
    name: env.BOOTSTRAP_ADMIN_NAME || 'Administrador',
  },
  company: {
    name: env.COMPANY_NAME || 'Mallatex',
    noiCompany: env.NOI_COMPANY || 'MALLATEX',
    branch: env.COMPANY_BRANCH || 'Guadalajara, Jalisco',
  },

  // Operación
  logRequests: bool(env.LOG_REQUESTS, true),

  // Integraciones externas (percepciones variables y facturación).
  // Cada fuente opera en modo 'mock' (lecturas simuladas, sin credenciales) o 'http'
  // (consulta real a la API externa). Se activa por-fuente con <FUENTE>_MODE=http + su URL/token.
  integrations: {
    g3: { mode: (env.G3_MODE || 'mock').toLowerCase(), baseUrl: env.G3_BASE_URL || '', token: env.G3_TOKEN || '' },
    mes: { mode: (env.MES_MODE || 'mock').toLowerCase(), baseUrl: env.MES_BASE_URL || '', token: env.MES_TOKEN || '' },
    aspel: {
      mode: (env.ASPEL_MODE || 'mock').toLowerCase(),
      baseUrl: env.ASPEL_BASE_URL || '',
      token: env.ASPEL_TOKEN || '',
      cfdiUrl: env.ASPEL_CFDI_URL || '',
      // Secreto compartido para validar el webhook de pago de facturas de Aspel (CxC).
      webhookSecret: env.ASPEL_WEBHOOK_SECRET || '',
    },
    timeoutMs: num(env.INTEGRATIONS_TIMEOUT_MS, 8000),
  },
});

// Advertencias de configuración insegura al arrancar en producción.
export function configWarnings() {
  const warn = [];
  if (config.isProd) {
    if (config.seedDemo) warn.push('SEED_DEMO está activo en producción: se cargarán datos DEMOSTRATIVOS. Desactívalo (SEED_DEMO=false).');
    if (!config.seedDemo && !config.bootstrapAdmin.email) warn.push('No hay BOOTSTRAP_ADMIN_EMAIL: si la base está vacía no habrá con quién iniciar sesión.');
    if (config.bootstrapAdmin.password && config.bootstrapAdmin.password.length < 12) warn.push('BOOTSTRAP_ADMIN_PASSWORD es corta (<12 caracteres).');
    if (config.trustProxy === false) warn.push('TRUST_PROXY está desactivado: detrás de un proxy TLS, HSTS y las IP de la bitácora pueden ser incorrectas.');
    if (config.storage === 'file') warn.push('STORAGE=file en producción: la persistencia es un archivo JSON (una sola instancia). Para alta disponibilidad usa STORAGE=postgres (DATABASE_URL).');
  }
  return warn;
}
