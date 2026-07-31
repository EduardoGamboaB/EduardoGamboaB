import express from 'express';
import { login, loginEmployee, logout, requireAuth, ROLE_LABEL } from '../auth.js';
import { webModulesFor } from '../access.js';
import { log } from '../audit.js';

const router = express.Router();

// Login administrativo (correo + contraseña) o de empleado (código + PIN).
router.post('/login', (req, res) => {
  const { email, password, code, pin } = req.body || {};
  if (code || pin) {
    const result = loginEmployee(code, pin);
    if (!result) return res.status(401).json({ error: 'Código o PIN incorrectos' });
    req.rateLimitForgive?.();
    res.json(result);
    return;
  }
  const result = login(email, password);
  if (!result) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  req.rateLimitForgive?.();
  req.user = result.user;
  log(req, { action: 'login', entity: 'auth', entityId: result.user.id, detail: `Inicio de sesión (${result.user.email})` });
  res.json(result);
});

router.post('/logout', requireAuth, (req, res) => {
  logout(req.token);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  if (req.principal === 'empleado') {
    res.json({ principal: 'empleado', employee: req.employee, roleLabel: 'Colaborador', modules: webModulesFor('empleado', req.employee) });
  } else {
    res.json({ principal: 'admin', user: req.user, roleLabel: ROLE_LABEL[req.user.role], modules: webModulesFor('admin', req.user) });
  }
});

export default router;
