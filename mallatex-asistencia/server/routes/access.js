// Configuración de acceso (sólo administrador): usuarios, roles, módulos, permisos y la
// gestión de asignación de roles/módulos/perfiles. La matriz de permisos es editable y se
// guarda en settings.access; los ajustes finos por usuario/colaborador van en su ficha.

import express from 'express';
import * as db from '../db.js';
import { requireRole, ROLES, ROLE_LABEL, publicUser } from '../auth.js';
import {
  WEB_MODULE_CATALOG, MOBILE_MODULE_CATALOG, PROFILE_CATALOG,
  getAccessConfig, saveAccessConfig, webModulesFor, mobileAccessFor,
} from '../access.js';
import { log } from '../audit.js';

const router = express.Router();
const ADMIN = requireRole(ROLES.ADMIN);
const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

// Catálogo: roles, módulos web/móvil y perfiles.
router.get('/access/catalog', ADMIN, (_req, res) => {
  res.json({
    roles: Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })),
    webModules: WEB_MODULE_CATALOG,
    mobileModules: MOBILE_MODULE_CATALOG,
    profiles: PROFILE_CATALOG,
  });
});

// Matriz de permisos (rol→módulos web, perfil→módulos móviles).
router.get('/access/permissions', ADMIN, (_req, res) => res.json(getAccessConfig()));

router.put('/access/permissions', ADMIN, (req, res) => {
  const saved = saveAccessConfig(req.body || {});
  log(req, { action: 'update', entity: 'accessConfig', detail: 'Actualización de la matriz de permisos' });
  res.json(saved);
});

// Usuarios administrativos con su acceso efectivo.
router.get('/access/users', ADMIN, (_req, res) => {
  res.json(db.all('users').map((u) => ({
    ...publicUser(u),
    extraModules: u.extraModules || [],
    revokedModules: u.revokedModules || [],
    modules: webModulesFor('admin', u),
  })));
});

// Asignación de rol y ajustes finos de módulos a un usuario.
router.put('/access/users/:id', ADMIN, (req, res) => {
  const u = db.get('users', req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
  const b = req.body || {};
  const patch = {};
  if ('role' in b && ROLE_LABEL[b.role]) patch.role = b.role;
  if ('extraModules' in b) patch.extraModules = arr(b.extraModules);
  if ('revokedModules' in b) patch.revokedModules = arr(b.revokedModules);
  if ('active' in b) patch.active = b.active !== false;
  const updated = db.update('users', u.id, patch);
  log(req, { action: 'update', entity: 'user', entityId: u.id, detail: `Acceso de ${updated.email} actualizado (rol ${updated.role})` });
  res.json({ ...publicUser(updated), extraModules: updated.extraModules || [], revokedModules: updated.revokedModules || [], modules: webModulesFor('admin', updated) });
});

// Colaboradores con su perfil móvil efectivo.
router.get('/access/employees', ADMIN, (_req, res) => {
  res.json(db.all('employees', (e) => e.active !== false).map((e) => {
    const a = mobileAccessFor(e);
    return { id: e.id, code: e.code, name: e.name, department: e.department, position: e.position, appProfile: e.appProfile || null, profile: a.profile, modules: a.modules };
  }));
});

// Asignación de perfil (y ajustes finos de módulos) a un colaborador.
router.put('/access/employees/:id', ADMIN, (req, res) => {
  const e = db.get('employees', req.params.id);
  if (!e) return res.status(404).json({ error: 'Colaborador no encontrado' });
  const b = req.body || {};
  const patch = {};
  if ('appProfile' in b) patch.appProfile = b.appProfile && PROFILE_CATALOG.some((p) => p.value === b.appProfile) ? b.appProfile : null;
  if ('extraModules' in b) patch.extraModules = arr(b.extraModules);
  if ('revokedModules' in b) patch.revokedModules = arr(b.revokedModules);
  const updated = db.update('employees', e.id, patch);
  const a = mobileAccessFor(updated);
  log(req, { action: 'update', entity: 'employee', entityId: e.id, detail: `Perfil móvil de ${updated.name}: ${a.profile}` });
  res.json({ id: updated.id, appProfile: updated.appProfile || null, profile: a.profile, modules: a.modules });
});

export default router;
