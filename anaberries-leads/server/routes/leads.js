// Rutas de captura de leads.

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db, save, newId, DATA_DIR } from '../store.js';
import { requireStaff } from '../auth.js';

const router = Router();

const BADGES_DIR = path.join(DATA_DIR, 'badges');

// Guarda la foto del gafete (dataURL JPEG/PNG) en disco y devuelve true si se guardó.
function guardarFoto(id, dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return false;
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return false;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) return false; // tope de 6 MB
  if (!fs.existsSync(BADGES_DIR)) fs.mkdirSync(BADGES_DIR, { recursive: true });
  fs.writeFileSync(path.join(BADGES_DIR, id + '.jpg'), buf);
  return true;
}

// Catálogo de intereses (productos/servicios Anaberries · Mallatex).
export const INTERESES = [
  'Malla antigranizo',
  'Malla sombra',
  'Malla antiáfidos / antiinsectos',
  'Rafia / cintilla',
  'Acolchado plástico (mulch)',
  'Cubierta flotante (agribón)',
  'Sistema de tutoreo',
  'Otro',
];

const FUENTES = ['Stand', 'Conferencia', 'Recorrido', 'Referido', 'Redes sociales', 'Otro'];

function clean(v, max = 500) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}
function normEmail(v) {
  return clean(v, 160).toLowerCase();
}
function normPhone(v) {
  return clean(v, 40).replace(/[^\d+]/g, '');
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/leads — registra un lead (público).
router.post('/', (req, res) => {
  const b = req.body || {};
  const nombre = clean(b.nombre, 120);
  const empresa = clean(b.empresa, 160);
  const email = normEmail(b.email);
  const telefono = normPhone(b.telefono);

  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!telefono && !email) return res.status(400).json({ error: 'Proporciona teléfono o correo' });
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Correo no válido' });

  const data = db();

  // Detección de duplicados por email o teléfono.
  const dup = data.leads.find((l) =>
    (email && l.email && l.email === email) ||
    (telefono && l.telefono && l.telefono === telefono));
  if (dup && !b.forzar) {
    return res.status(409).json({ error: 'Ya existe un lead con ese correo o teléfono', duplicado: { id: dup.id, nombre: dup.nombre } });
  }

  const lead = {
    id: newId('lead'),
    nombre,
    empresa,
    email,
    telefono,
    cargo: clean(b.cargo, 120),
    interes: INTERESES.includes(b.interes) ? b.interes : clean(b.interes, 120),
    volumen: clean(b.volumen, 120),
    notas: clean(b.notas, 1000),
    consentimiento: Boolean(b.consentimiento),
    fuente: FUENTES.includes(b.fuente) ? b.fuente : clean(b.fuente, 60) || 'Stand',
    capturadoPor: clean(b.capturadoPor, 80),
    metodoCaptura: b.metodoCaptura === 'gafete' ? 'gafete' : 'manual',
    createdAt: new Date().toISOString(),
  };
  // Foto del gafete opcional (se guarda en disco, no en el JSON).
  lead.tieneFoto = guardarFoto(lead.id, b.foto);
  data.leads.push(lead);
  save();
  res.status(201).json(lead);
});

// GET /api/leads/meta — catálogos para el formulario (público).
router.get('/meta', (_req, res) => {
  res.json({ intereses: INTERESES, fuentes: FUENTES, event: db().event });
});

// A partir de aquí, solo personal (listado y exportación).
router.use(requireStaff);

// GET /api/leads — listado con búsqueda y filtros.
router.get('/', (req, res) => {
  const { q, interes, fuente } = req.query;
  let items = [...db().leads].reverse();
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter((l) =>
      [l.nombre, l.empresa, l.email, l.telefono, l.cargo].join(' ').toLowerCase().includes(needle));
  }
  if (interes) items = items.filter((l) => l.interes === interes);
  if (fuente) items = items.filter((l) => l.fuente === fuente);
  res.json({ total: items.length, items });
});

// GET /api/leads/export.csv — exportación CSV.
router.get('/export.csv', (_req, res) => {
  const cols = ['nombre', 'empresa', 'cargo', 'email', 'telefono', 'interes', 'volumen', 'fuente', 'consentimiento', 'capturadoPor', 'createdAt'];
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const rows = [cols.join(',')];
  for (const l of db().leads) rows.push(cols.map((c) => esc(l[c])).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads-anaberries.csv"');
  res.send('﻿' + rows.join('\r\n'));
});

// GET /api/leads/:id/badge — foto del gafete (solo personal).
router.get('/:id/badge', (req, res) => {
  const file = path.join(BADGES_DIR, path.basename(req.params.id) + '.jpg');
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Sin foto' });
  res.type('jpeg').sendFile(file);
});

// DELETE /api/leads/:id — eliminar un lead (corrección de captura).
router.delete('/:id', (req, res) => {
  const data = db();
  const idx = data.leads.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Lead no encontrado' });
  data.leads.splice(idx, 1);
  try { fs.rmSync(path.join(BADGES_DIR, req.params.id + '.jpg')); } catch { /* sin foto */ }
  save();
  res.json({ ok: true });
});

export default router;
