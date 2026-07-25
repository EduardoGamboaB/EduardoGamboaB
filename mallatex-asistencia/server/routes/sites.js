// Catálogo de sitios / obras con geocerca (para la asistencia de campo).
// Administrativo: se monta en la cadena adminOnly.

import express from 'express';
import * as db from '../db.js';
import { requireRole, ROLES } from '../auth.js';
import { log } from '../audit.js';

const router = express.Router();

router.get('/sites', (req, res) => {
  let items = db.all('sites');
  if (req.query.active === 'true') items = items.filter((s) => s.active !== false);
  items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(items);
});

router.post('/sites', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const b = req.body || {};
  if (!b.name || b.lat == null || b.lng == null) {
    return res.status(400).json({ error: 'Nombre, latitud y longitud son obligatorios' });
  }
  const created = db.insert('sites', {
    name: b.name,
    client: b.client || '',
    lat: Number(b.lat),
    lng: Number(b.lng),
    radiusMeters: Number(b.radiusMeters) || 150,
    active: b.active !== false,
  });
  log(req, { action: 'create', entity: 'site', entityId: created.id, detail: `Alta de sitio ${created.name}` });
  res.status(201).json(created);
});

router.put('/sites/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const s = db.get('sites', req.params.id);
  if (!s) return res.status(404).json({ error: 'Sitio no encontrado' });
  const b = req.body || {};
  const patch = {};
  for (const k of ['name', 'client', 'active']) if (k in b) patch[k] = b[k];
  for (const k of ['lat', 'lng', 'radiusMeters']) if (k in b) patch[k] = Number(b[k]);
  const updated = db.update('sites', s.id, patch);
  log(req, { action: 'update', entity: 'site', entityId: s.id, detail: `Sitio ${updated.name} actualizado` });
  res.json(updated);
});

router.delete('/sites/:id', requireRole(ROLES.ADMIN, ROLES.CONTADOR), (req, res) => {
  const s = db.get('sites', req.params.id);
  if (!s) return res.status(404).json({ error: 'Sitio no encontrado' });
  db.update('sites', s.id, { active: false });
  log(req, { action: 'deactivate', entity: 'site', entityId: s.id, detail: `Baja de sitio ${s.name}` });
  res.json({ ok: true });
});

export default router;
