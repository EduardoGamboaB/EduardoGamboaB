// Administración de múltiples eventos (cada uno con su premio, dinámica, QR…).
// Los datos alimentan la landing, el QR y los Términos y Condiciones de forma dinámica.

import { Router } from 'express';
import { db, save, getEvents, getEvent, activeEvent, nuevoEvento, putBlob, getBlob, delBlob } from '../store.js';
import { requireAuth } from '../auth.js';

const router = Router();
const prizeKey = (id) => 'event:premio:' + id;

function clean(v, max = 2000) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}

// Subconjunto público (landing/términos/QR). Sin datos sensibles.
function publicEvent(e) {
  if (!e) return null;
  return {
    id: e.id, name: e.name, edition: e.edition, tipo: e.tipo, premio: e.premio,
    dinamica: e.dinamica, fecha: e.fecha, hora: e.hora, lugar: e.lugar,
    plazoContactoDias: e.plazoContactoDias, premioImagen: !!e.premioImagen,
  };
}

// Aplica los campos del body a un evento.
function aplicarCampos(e, b) {
  if (b.name !== undefined) e.name = clean(b.name, 120) || 'Evento';
  if (b.edition !== undefined) e.edition = clean(b.edition, 40);
  if (b.tipo !== undefined) e.tipo = clean(b.tipo, 80);
  if (b.premio !== undefined) e.premio = clean(b.premio, 300);
  if (b.dinamica !== undefined) e.dinamica = clean(b.dinamica, 2000);
  if (b.fecha !== undefined) e.fecha = clean(b.fecha, 10);
  if (b.hora !== undefined) e.hora = clean(b.hora, 5);
  if (b.lugar !== undefined) e.lugar = clean(b.lugar, 160);
  if (b.plazoContactoDias !== undefined) e.plazoContactoDias = clean(b.plazoContactoDias, 4).replace(/\D/g, '');
  if (b.permiteGanadoresPrevios !== undefined) e.permiteGanadoresPrevios = Boolean(b.permiteGanadoresPrevios);
  if (b.finalizado !== undefined) e.finalizado = Boolean(b.finalizado);
}

// Guarda/elimina la imagen del premio (dataURL) según el body.
async function manejarImagen(e, b) {
  if (typeof b.premioImagen === 'string') {
    const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.premioImagen);
    if (m) {
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length <= 6 * 1024 * 1024) { await putBlob(prizeKey(e.id), buf, 'image/jpeg'); e.premioImagen = true; }
    }
  } else if (b.premioImagen === false || b.quitarImagen === true) {
    await delBlob(prizeKey(e.id));
    e.premioImagen = false;
  }
}

// ---------- Público ----------
// GET /api/events/public/active — evento activo (landing por defecto).
router.get('/public/active', (_req, res) => res.json(publicEvent(activeEvent())));

// GET /api/events/public/:id — evento específico.
router.get('/public/:id', (req, res) => {
  const e = getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json(publicEvent(e));
});

// GET /api/events/:id/premio-imagen — imagen del premio (pública).
router.get('/:id/premio-imagen', async (req, res) => {
  const buf = await getBlob(prizeKey(req.params.id));
  if (!buf) return res.status(404).json({ error: 'Sin imagen' });
  res.type('jpeg').send(buf);
});

// ---------- Solo con sesión ----------
router.use(requireAuth);

// GET /api/events — lista de eventos + activo.
router.get('/', (_req, res) => res.json({ items: getEvents(), activeEventId: db().activeEventId }));

// POST /api/events — crea un evento (y lo deja activo).
router.post('/', async (req, res) => {
  const b = req.body || {};
  const e = nuevoEvento({ name: clean(b.name, 120) || 'Evento nuevo' });
  aplicarCampos(e, b);
  await manejarImagen(e, b);
  e.actualizadoAt = new Date().toISOString();
  const data = db();
  data.events.push(e);
  // El nuevo evento se vuelve activo solo si no hay un activo vigente
  // (primer evento, o el activo estaba finalizado/ausente). No roba el activo actual.
  const activoVigente = data.events.some((x) => x.id === data.activeEventId && !x.finalizado);
  if (!activoVigente) data.activeEventId = e.id;
  save();
  res.status(201).json(e);
});

// PUT /api/events/:id — actualiza un evento.
router.put('/:id', async (req, res) => {
  const e = getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: 'Evento no encontrado' });
  aplicarCampos(e, req.body || {});
  await manejarImagen(e, req.body || {});
  e.actualizadoAt = new Date().toISOString();
  save();
  res.json(e);
});

// POST /api/events/:id/finalizar — marca el evento como finalizado (histórico).
router.post('/:id/finalizar', (req, res) => {
  const e = getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: 'Evento no encontrado' });
  e.finalizado = true;
  e.actualizadoAt = new Date().toISOString();
  save();
  res.json(e);
});

// POST /api/events/:id/reabrir — reabre un evento finalizado.
router.post('/:id/reabrir', (req, res) => {
  const e = getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: 'Evento no encontrado' });
  e.finalizado = false;
  e.actualizadoAt = new Date().toISOString();
  save();
  res.json(e);
});

// POST /api/events/:id/activate — marca el evento como activo.
router.post('/:id/activate', (req, res) => {
  const e = getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: 'Evento no encontrado' });
  db().activeEventId = e.id;
  save();
  res.json({ ok: true, activeEventId: e.id });
});

// DELETE /api/events/:id — elimina un evento (si no tiene leads y no es el único).
router.delete('/:id', async (req, res) => {
  const data = db();
  const e = getEvent(req.params.id);
  if (!e) return res.status(404).json({ error: 'Evento no encontrado' });
  if (data.events.length <= 1) return res.status(400).json({ error: 'Debe existir al menos un evento' });
  if (data.leads.some((l) => l.eventId === e.id)) {
    return res.status(400).json({ error: 'El evento tiene leads registrados; no se puede eliminar' });
  }
  data.events = data.events.filter((x) => x.id !== e.id);
  data.draws = data.draws.filter((d) => d.eventId !== e.id);
  if (data.activeEventId === e.id) data.activeEventId = data.events[0].id;
  await delBlob(prizeKey(e.id));
  save();
  res.json({ ok: true, activeEventId: data.activeEventId });
});

export default router;
