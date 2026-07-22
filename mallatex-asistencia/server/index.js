// Bootstrap del servidor Express.
// Sirve la API REST y el frontend estático (SPA).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as db from './db.js';
import { seed, isEmpty } from './seed.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import operationsRoutes from './routes/operations.js';
import periodRoutes from './routes/periods.js';
import auditRoutes from './routes/audit.js';
import { requireAuth } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

// Primer arranque: cargar datos demo si la base está vacía
if (isEmpty()) {
  console.log('Base vacía: cargando datos demostrativos de Mallatex…');
  const r = seed();
  console.log('Datos demo listos:', r);
}

const app = express();
app.use(express.json({ limit: '2mb' }));

// Registro básico de peticiones a la API
app.use('/api', (req, _res, next) => {
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, catalogRoutes);
app.use('/api', requireAuth, operationsRoutes);
app.use('/api', requireAuth, periodRoutes);
app.use('/api', requireAuth, auditRoutes);

// Frontend estático
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Manejador de errores
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

app.listen(PORT, () => {
  console.log(`\n  Mallatex · Plataforma de Asistencia (NOI) — powered by Evorgyn`);
  console.log(`  Servidor: http://localhost:${PORT}`);
  console.log(`  Empleados: ${db.all('employees').length} · Checadas: ${db.all('checadas').length}\n`);
});
