// Anaberries · Captura de Leads (evento) — Mallatex
// Servidor Express: API REST + frontend estático (SPA de una sola página).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { init as initStore, flush, MODE } from './store.js';
import { requireAuth, ensureAdmin, bootstrapSetup } from './auth.js';
import { rateLimiter } from './security.js';
import { initMailer } from './mailer.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import leadsRoutes from './routes/leads.js';
import raffleRoutes from './routes/raffle.js';
import statsRoutes from './routes/stats.js';
import eventRoutes from './routes/event.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

try {
  await initStore();
} catch (err) {
  console.error(`\n  ✖ No se pudo inicializar el almacenamiento (${MODE}): ${err.message}\n`);
  process.exit(1);
}
await initMailer();
ensureAdmin();
bootstrapSetup();

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', config.trustProxy);
app.use(express.json({ limit: config.jsonLimit }));

// Cabeceras de seguridad básicas.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Autenticación (login público; el resto de la app requiere sesión).
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes); // requireAdmin dentro del router

// Autoregistro de la landing: limitador de tasa por IP (backstop anti-spam).
app.use('/api/leads/registro', rateLimiter({
  max: config.registroRateMax,
  windowMs: config.registroRateWindowMs,
}));

// Leads: /registro y /meta son públicos; el resto requiere sesión (dentro del router).
app.use('/api/leads', leadsRoutes);

// Eventos: GET público (landing/términos/QR) + edición por staff (dentro del router).
app.use('/api/events', eventRoutes);

// Sorteo y Dashboard: requieren sesión.
app.use('/api/raffle', requireAuth, raffleRoutes);
app.use('/api/stats', requireAuth, statsRoutes);

// Frontend estático. CSS/JS/HTML con revalidación (no-cache) para evitar versiones
// cacheadas; assets grandes vendorizados e imágenes conservan caché larga.
app.use(express.static(PUBLIC_DIR, {
  maxAge: config.isProd ? '1h' : 0,
  setHeaders(res, filePath) {
    if (/\.(css|js|html)$/.test(filePath) && !filePath.includes('/vendor/')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// Páginas públicas con URL limpia (landing de autoregistro, legales y QR).
const PAGES = {
  '/registro': 'registro.html',
  '/terminos': 'terminos.html',
  '/aviso-privacidad': 'aviso-privacidad.html',
  '/qr': 'qr.html',
};
for (const [route, file] of Object.entries(PAGES)) {
  app.get(route, (_req, res) => res.sendFile(path.join(PUBLIC_DIR, file)));
}

// SPA del personal (captura/sorteo/dashboard) para el resto de rutas.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// 404 de API.
app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

// Manejador de errores.
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: config.isProd && status >= 500 ? 'Error interno' : (err.message || 'Error') });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`\n  Anaberries · Captura de Leads — Mallatex`);
  console.log(`  Entorno: ${config.nodeEnv} · Almacenamiento: ${MODE}`);
  console.log(`  Servidor: http://${config.host}:${config.port}`);
  console.log(`  Acceso a Sorteo/Dashboard: ${config.staffPin ? 'PIN requerido' : 'abierto (sin PIN)'}\n`);
});

function shutdown(signal) {
  console.log(`\n${signal} recibido: cerrando…`);
  server.close(async () => { await flush(); process.exit(0); });
  setTimeout(() => { process.exit(0); }, 8000).unref?.();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
