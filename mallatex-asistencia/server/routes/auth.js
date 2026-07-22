import express from 'express';
import { login, logout, requireAuth, ROLE_LABEL } from '../auth.js';
import { log } from '../audit.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const result = login(email, password);
  if (!result) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  req.user = result.user;
  log(req, { action: 'login', entity: 'auth', entityId: result.user.id, detail: `Inicio de sesión (${result.user.email})` });
  res.json(result);
});

router.post('/logout', requireAuth, (req, res) => {
  logout(req.token);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user, roleLabel: ROLE_LABEL[req.user.role] });
});

export default router;
