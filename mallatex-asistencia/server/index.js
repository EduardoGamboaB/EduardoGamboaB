// Bootstrap del servidor Express.
// Sirve la API REST y el frontend estático (SPA), con endurecimiento para producción.

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config, configWarnings } from './config.js';
import * as db from './db.js';
import { initData } from './bootstrap.js';
import { securityHeaders, cors, requestLogger, rateLimiter, clientIp } from './security.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import operationsRoutes from './routes/operations.js';
import periodRoutes from './routes/periods.js';
import variablePayRoutes from './routes/variablepay.js';
import auditRoutes from './routes/audit.js';
import kioskRoutes from './routes/kiosk.js';
import portalRoutes from './routes/portal.js';
import fieldRoutes from './routes/field.js';
import salesRoutes from './routes/sales.js';
import sitesRoutes from './routes/sites.js';
import crmRoutes from './routes/crm.js';
import integrationsRoutes from './routes/integrations.js';
import accessRoutes from './routes/access.js';
import rhRoutes from './routes/rh.js';
import { requireAuth, adminOnly } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// ---------- Arranque de datos ----------
// Inicializa el backend de datos (obligatorio en modo PostgreSQL).
try {
  const info = await db.init();
  console.log(`Almacenamiento: ${info.mode}`);
} catch (err) {
  console.error(`\n  ✖ No se pudo inicializar la base de datos (${db.MODE}): ${err.message}\n`);
  process.exit(1);
}
// Candado de instancia única (archivo). En PostgreSQL lo hace pg_advisory_lock.
if (!db.acquireLock()) {
  console.error(`\n  ✖ Otra instancia ya usa el directorio de datos (${db.DATA_DIR}).`);
  console.error('    Ejecuta una sola instancia por volumen de datos, o usa un DATA_DIR distinto.\n');
  process.exit(1);
}
if (config.backupOnStart) {
  try { const b = db.backup(config.backupKeep); if (b) console.log('Respaldo de datos:', b); } catch (e) { console.error('No se pudo respaldar:', e.message); }
}
for (const w of configWarnings()) console.warn('  ⚠ ', w);

if (db.all('users').length === 0) {
  const r = initData();
  console.log(r.mode === 'demo' ? 'Datos demostrativos cargados.' : 'Inicialización de producción:', r);
}

// ---------- App ----------
const app = express();
app.disable('x-powered-by');
if (config.trustProxy !== false) app.set('trust proxy', config.trustProxy);

app.use(securityHeaders);
app.use(cors);
app.use(requestLogger);
app.use(express.json({ limit: config.jsonLimit }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/api/ready', (_req, res) => {
  try { db.all('users'); res.json({ ready: true }); } catch { res.status(503).json({ ready: false }); }
});

// Kiosco: público (la identificación la haría el reconocimiento facial del dispositivo)
app.use('/api/kiosk', kioskRoutes);

// Limitador de intentos de acceso (anti fuerza bruta), por IP + identificador.
const loginLimiter = rateLimiter({
  max: config.loginRateMax,
  windowMs: config.loginRateWindowMs,
  keyFn: (req) => `${clientIp(req)}|${(req.body?.email || req.body?.code || '').toString().toLowerCase()}`,
  message: 'Demasiados intentos de acceso. Espera unos minutos e inténtalo de nuevo.',
});
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
// Portal del empleado: se monta antes que los routers admin genéricos
// (que capturan cualquier ruta bajo /api) para no ser bloqueado por adminOnly.
app.use('/api/portal', requireAuth, portalRoutes);
// Asistencia de campo (app móvil): sesión de empleado, antes de los routers admin.
app.use('/api/field', requireAuth, fieldRoutes);
// CRM móvil de ventas (app móvil): sesión de empleado, antes de los routers admin.
app.use('/api/sales', requireAuth, salesRoutes);
// Webhooks de integraciones (Aspel CxC): sin sesión, autenticados por secreto compartido.
app.use('/api/integrations', integrationsRoutes);
app.use('/api', requireAuth, adminOnly, catalogRoutes);
app.use('/api', requireAuth, adminOnly, sitesRoutes);
app.use('/api', requireAuth, adminOnly, crmRoutes);
app.use('/api', requireAuth, adminOnly, accessRoutes);
app.use('/api', requireAuth, adminOnly, operationsRoutes);
app.use('/api', requireAuth, adminOnly, periodRoutes);
app.use('/api', requireAuth, adminOnly, variablePayRoutes);
app.use('/api', requireAuth, adminOnly, auditRoutes);
app.use('/api', requireAuth, adminOnly, rhRoutes);

// ---------- Frontend estático ----------
app.use(express.static(PUBLIC_DIR, { maxAge: config.isProd ? '1h' : 0 }));

// Kiosco: se inyecta un nonce CSP en el script embebido.
const kioskHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'kiosk.html'), 'utf8');
app.get('/kiosk', (_req, res) => {
  const nonce = res.locals.cspNonce;
  res.type('html').send(nonce ? kioskHtml.replace('<script>', `<script nonce="${nonce}">`) : kioskHtml);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 404 de API
app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

// Manejador de errores (sin filtrar detalles internos en producción)
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: config.isProd && status >= 500 ? 'Error interno del servidor' : (err.message || 'Error interno') });
});

// ---------- Servidor + apagado ordenado ----------
const server = app.listen(config.port, config.host, () => {
  console.log(`\n  Mallatex · Plataforma de Asistencia (NOI) — powered by Evorgyn`);
  console.log(`  Entorno: ${config.nodeEnv} · Datos: ${db.DATA_DIR}`);
  console.log(`  Servidor: http://${config.host}:${config.port}`);
  console.log(`  Empleados: ${db.all('employees').length} · Checadas: ${db.all('checadas').length}\n`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} recibido: cerrando…`);
  server.close(async () => {
    try { await db.flush(); await db.close(); } catch (e) { console.error('Error al cerrar la base:', e.message); }
    db.releaseLock();
    console.log('Cierre completado.');
    process.exit(0);
  });
  // Salida forzada si algo queda colgado
  setTimeout(() => { db.releaseLock(); process.exit(0); }, 10000).unref?.();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (e) => { console.error('uncaughtException:', e); });
process.on('unhandledRejection', (e) => { console.error('unhandledRejection:', e); });
