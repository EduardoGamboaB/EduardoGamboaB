// Administración de usuarios (solo administradores).

import { Router } from 'express';
import { db, save, getUsers, getUserById, getUserByEmail } from '../store.js';
import { requireAdmin, createUser, hashPassword, publicUser } from '../auth.js';

const router = Router();
router.use(requireAdmin);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/users — lista de usuarios.
router.get('/', (_req, res) => res.json({ items: getUsers().map(publicUser) }));

// POST /api/users — crea un usuario.
router.post('/', (req, res) => {
  const b = req.body || {};
  const email = (b.email || '').toString().trim().toLowerCase();
  const password = (b.password || '').toString();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Correo no válido' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (getUserByEmail(email)) return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  const u = createUser({ email, name: b.name, password, role: b.role === 'admin' ? 'admin' : 'staff' });
  res.status(201).json(publicUser(u));
});

// PUT /api/users/:id — actualiza nombre, rol, estado o contraseña.
router.put('/:id', (req, res) => {
  const u = getUserById(req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  const b = req.body || {};
  if (b.name !== undefined) u.name = String(b.name).trim() || u.name;
  if (b.role !== undefined) {
    // No permitir quitarse a uno mismo el último rol admin.
    if (u.id === req.user.id && b.role !== 'admin') return res.status(400).json({ error: 'No puedes quitarte tu propio rol de administrador' });
    u.role = b.role === 'admin' ? 'admin' : 'staff';
  }
  if (b.activo !== undefined) {
    if (u.id === req.user.id && b.activo === false) return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
    u.activo = Boolean(b.activo);
  }
  if (b.password) {
    if (String(b.password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    u.passwordHash = hashPassword(b.password);
  }
  save();
  res.json(publicUser(u));
});

// DELETE /api/users/:id — elimina un usuario (no a uno mismo ni al último admin).
router.delete('/:id', (req, res) => {
  const data = db();
  const u = getUserById(req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (u.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
  const admins = data.users.filter((x) => x.role === 'admin');
  if (u.role === 'admin' && admins.length <= 1) return res.status(400).json({ error: 'Debe existir al menos un administrador' });
  data.users = data.users.filter((x) => x.id !== u.id);
  save();
  res.json({ ok: true });
});

export default router;
