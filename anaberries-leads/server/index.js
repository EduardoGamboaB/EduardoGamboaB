// Anaberries · Captura de Leads (evento) — Mallatex
// Servidor Express: API REST + frontend estático (SPA de una sola página).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { load, flush } from './store.js';
import { requireStaff, staffInfo } from './auth.js';
import leadsRoutes from './routes/leads.js';
import raffleRoutes from './routes/raffle.js';
import statsRoutes from './routes/stats.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

load();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: config.jsonLimit }));

// Cabeceras de seguridad básicas.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Estado de acceso: indica si se requiere PIN y valida el que envía el personal.
app.get('/api/access', (req, res) => res.json(staffInfo(req)));

// Captura de leads: pública (stand/kiosco del evento).
app.use('/api/leads', leadsRoutes);

// Sorteo y Dashboard: protegidos por PIN del personal (si está configurado).
app.use('/api/raffle', requireStaff, raffleRoutes);
app.use('/api/stats', requireStaff, statsRoutes);

// Frontend estático.
app.use(express.static(PUBLIC_DIR, { maxAge: config.isProd ? '1h' : 0 }));
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
  console.log(`  Entorno: ${config.nodeEnv}`);
  console.log(`  Servidor: http://${config.host}:${config.port}`);
  console.log(`  Acceso a Sorteo/Dashboard: ${config.staffPin ? 'PIN requerido' : 'abierto (sin PIN)'}\n`);
});

function shutdown(signal) {
  console.log(`\n${signal} recibido: cerrando…`);
  server.close(() => { flush(); process.exit(0); });
  setTimeout(() => { flush(); process.exit(0); }, 5000).unref?.();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
