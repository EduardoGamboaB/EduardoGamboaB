// Rutas de autenticación: login y sesión actual.

import { Router } from 'express';
import { authenticate, signToken, signSetupToken, requireAuth, requireAdmin, publicUser } from '../auth.js';
import { config } from '../config.js';
import { db, save, getUsers } from '../store.js';

const router = Router();

// POST /api/auth/login — inicia sesión, devuelve token + usuario.
router.post('/login', (req, res) => {
  const email = (req.body?.email || '').toString().trim().toLowerCase();
  const password = (req.body?.password || '').toString();
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  const u = authenticate(email, password);
  if (!u) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  res.json({ token: signToken(u), user: publicUser(u) });
});

// GET /api/auth/me — usuario de la sesión actual.
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

// ---------- Configuración inicial por NIP ----------

// GET /api/auth/setup-status — ¿está disponible el acceso por NIP? (público).
router.get('/setup-status', (_req, res) => {
  res.json({ available: !!config.setupPin && !db().setupCompleted, completed: !!db().setupCompleted });
});

// POST /api/auth/setup-login — entra con el NIP estático (solo si la configuración
// está abierta). Devuelve una sesión de configuración con permisos de admin.
router.post('/setup-login', (req, res) => {
  if (db().setupCompleted) return res.status(403).json({ error: 'La configuración inicial ya fue completada' });
  if (!config.setupPin) return res.status(403).json({ error: 'El acceso por NIP no está habilitado' });
  const pin = (req.body?.pin || '').toString().trim();
  if (!pin || pin !== config.setupPin) return res.status(401).json({ error: 'NIP incorrecto' });
  res.json({ token: signSetupToken(), user: { id: 'setup', name: 'Configuración inicial', email: 'setup', role: 'admin', setup: true }, setup: true });
});

// POST /api/auth/setup-complete — finaliza la configuración y deshabilita el NIP.
// Requiere que exista al menos un administrador real (evita quedar sin acceso).
router.post('/setup-complete', requireAdmin, (_req, res) => {
  const admins = getUsers().filter((u) => u.role === 'admin' && u.activo !== false);
  if (admins.length === 0) return res.status(400).json({ error: 'Crea al menos un usuario administrador antes de finalizar' });
  db().setupCompleted = true; save();
  res.json({ ok: true });
});

export default router;
