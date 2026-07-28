// Rutas de captura de leads.

import { Router } from 'express';
import { db, save, newId, putBlob, getBlob, delBlob, getEvent, activeEvent } from '../store.js';
import { requireAuth } from '../auth.js';

const router = Router();

const badgeKey = (id) => 'badge:' + id;

// Resuelve el evento objetivo (body/query ?event=<id> o el activo).
function eventoDe(req) {
  const id = (req.body?.event || req.query.event || '').toString();
  return (id && getEvent(id)) || activeEvent();
}

// Decodifica un dataURL de imagen a Buffer (o null si no es válido / muy grande).
function decodeImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 6 * 1024 * 1024) return null; // tope de 6 MB
  return buf;
}

// Guarda la foto del gafete y devuelve true si se guardó.
async function guardarFoto(id, dataUrl) {
  const buf = decodeImage(dataUrl);
  if (!buf) return false;
  await putBlob(badgeKey(id), buf, 'image/jpeg');
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

const FUENTES = ['Stand', 'Conferencia', 'Recorrido', 'Referido', 'Redes sociales', 'Autoregistro (QR)', 'Otro'];

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
const numDigitos = (s) => (String(s).match(/\d/g) || []).length;

// POST /api/leads — captura de un lead por el personal (requiere sesión).
router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const nombre = clean(b.nombre, 120);
  const empresa = clean(b.empresa, 160);
  const email = normEmail(b.email);
  const telefono = normPhone(b.telefono);

  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  if (!telefono && !email) return res.status(400).json({ error: 'Proporciona teléfono o correo' });
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Correo no válido' });

  const data = db();
  const ev = eventoDe(req);

  // Detección de duplicados por email o teléfono, dentro del mismo evento.
  const dup = data.leads.find((l) => l.eventId === ev.id &&
    ((email && l.email && l.email === email) ||
     (telefono && l.telefono && l.telefono === telefono)));
  if (dup && !b.forzar) {
    return res.status(409).json({ error: 'Ya existe un lead con ese correo o teléfono en este evento', duplicado: { id: dup.id, nombre: dup.nombre } });
  }

  const lead = {
    id: newId('lead'),
    eventId: ev.id,
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
  // Foto del gafete opcional (blob, fuera del JSON).
  lead.tieneFoto = await guardarFoto(lead.id, b.foto);
  data.leads.push(lead);
  save();
  res.status(201).json(lead);
});

// POST /api/leads/registro — autoregistro del visitante desde la landing (público).
// Exige correo y celular válidos (por ahí se contacta al ganador) y aceptación de
// términos y aviso de privacidad.
router.post('/registro', (req, res) => {
  const b = req.body || {};
  // Honeypot anti-bots: campo oculto que un humano no llena.
  if (b.website) return res.status(400).json({ error: 'Solicitud inválida' });

  const nombre = clean(b.nombre, 120);
  const email = normEmail(b.email);
  const telefono = normPhone(b.telefono);

  if (!nombre) return res.status(400).json({ error: 'Escribe tu nombre completo' });
  if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Ingresa un correo empresarial válido' });
  if (!telefono || numDigitos(telefono) !== 10) return res.status(400).json({ error: 'El celular debe tener exactamente 10 dígitos' });
  if (!b.aceptaTerminos || !b.aceptaPrivacidad) return res.status(400).json({ error: 'Debes aceptar los términos y el aviso de privacidad' });

  const data = db();
  const ev = eventoDe(req);
  // Si ya está registrado en este evento, respondemos de forma amistosa.
  const dup = data.leads.find((l) => l.eventId === ev.id && ((email && l.email === email) || (telefono && l.telefono === telefono)));
  if (dup) return res.status(200).json({ ok: true, yaRegistrado: true });

  const lead = {
    id: newId('lead'),
    eventId: ev.id,
    nombre,
    empresa: clean(b.empresa, 160),
    email,
    telefono,
    cargo: '',
    interes: INTERESES.includes(b.interes) ? b.interes : clean(b.interes, 120),
    volumen: '',
    notas: '',
    consentimiento: true,
    aceptaTerminos: true,
    aceptaPrivacidad: true,
    consentimientoAt: new Date().toISOString(),
    fuente: 'Autoregistro (QR)',
    capturadoPor: '',
    metodoCaptura: 'autoregistro',
    tieneFoto: false,
    createdAt: new Date().toISOString(),
  };
  data.leads.push(lead);
  save();
  res.status(201).json({ ok: true });
});

// GET /api/leads/meta — catálogos para el formulario (público).
router.get('/meta', (_req, res) => {
  const ev = activeEvent();
  res.json({ intereses: INTERESES, fuentes: FUENTES, event: { name: ev.name, id: ev.id } });
});

// A partir de aquí, solo con sesión (listado y exportación).
router.use(requireAuth);

// GET /api/leads — listado con búsqueda y filtros (opcionalmente por evento).
router.get('/', (req, res) => {
  const { q, interes, fuente, event } = req.query;
  let items = [...db().leads].reverse();
  if (event) items = items.filter((l) => l.eventId === event);
  if (q) {
    const needle = String(q).toLowerCase();
    items = items.filter((l) =>
      [l.nombre, l.empresa, l.email, l.telefono, l.cargo].join(' ').toLowerCase().includes(needle));
  }
  if (interes) items = items.filter((l) => l.interes === interes);
  if (fuente) items = items.filter((l) => l.fuente === fuente);
  res.json({ total: items.length, items });
});

// GET /api/leads/export.csv — exportación CSV (opcionalmente por evento).
router.get('/export.csv', (req, res) => {
  const cols = ['nombre', 'empresa', 'cargo', 'email', 'telefono', 'interes', 'volumen', 'fuente', 'metodoCaptura', 'consentimiento', 'capturadoPor', 'createdAt'];
  const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const rows = [cols.join(',')];
  const leads = req.query.event ? db().leads.filter((l) => l.eventId === req.query.event) : db().leads;
  for (const l of leads) rows.push(cols.map((c) => esc(l[c])).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads-anaberries.csv"');
  res.send('﻿' + rows.join('\r\n'));
});

// GET /api/leads/:id/badge — foto del gafete (solo personal).
router.get('/:id/badge', async (req, res) => {
  const buf = await getBlob(badgeKey(req.params.id));
  if (!buf) return res.status(404).json({ error: 'Sin foto' });
  res.type('jpeg').send(buf);
});

// DELETE /api/leads/:id — eliminar un lead (corrección de captura).
router.delete('/:id', async (req, res) => {
  const data = db();
  const idx = data.leads.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Lead no encontrado' });
  data.leads.splice(idx, 1);
  await delBlob(badgeKey(req.params.id));
  save();
  res.json({ ok: true });
});

export default router;
