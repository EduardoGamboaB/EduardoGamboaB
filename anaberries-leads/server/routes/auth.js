// Rutas de autenticación: login y sesión actual.

import { Router } from 'express';
import { authenticate, signToken, requireAuth, publicUser } from '../auth.js';

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

export default router;
