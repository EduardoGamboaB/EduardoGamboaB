// Administración de la configuración del evento (premio, dinámica, fecha, tipo…).
// Los datos alimentan la landing y los Términos y Condiciones de forma dinámica.

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { db, save, DATA_DIR } from '../store.js';
import { requireStaff } from '../auth.js';

const router = Router();
const EVENT_DIR = path.join(DATA_DIR, 'event');
const PRIZE_FILE = path.join(EVENT_DIR, 'premio.jpg');

function clean(v, max = 2000) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}

// Subconjunto público (lo que consumen landing y términos). Sin datos sensibles.
function publicEvent() {
  const e = db().event;
  return {
    name: e.name, edition: e.edition, tipo: e.tipo, premio: e.premio,
    dinamica: e.dinamica, fecha: e.fecha, hora: e.hora, lugar: e.lugar,
    plazoContactoDias: e.plazoContactoDias, premioImagen: !!e.premioImagen,
  };
}

// GET /api/event/public — configuración pública del evento.
router.get('/public', (_req, res) => res.json(publicEvent()));

// GET /api/event/premio-imagen — imagen del premio (pública, para landing/términos).
router.get('/premio-imagen', (_req, res) => {
  if (!fs.existsSync(PRIZE_FILE)) return res.status(404).json({ error: 'Sin imagen' });
  res.type('jpeg').sendFile(PRIZE_FILE);
});

// A partir de aquí, solo personal.
router.use(requireStaff);

// GET /api/event — configuración completa (edición por staff).
router.get('/', (_req, res) => res.json(db().event));

// PUT /api/event — actualiza la configuración del evento.
router.put('/', (req, res) => {
  const b = req.body || {};
  const e = db().event;
  if (b.name !== undefined) e.name = clean(b.name, 120) || 'Evento';
  if (b.edition !== undefined) e.edition = clean(b.edition, 40);
  if (b.tipo !== undefined) e.tipo = clean(b.tipo, 80);
  if (b.premio !== undefined) e.premio = clean(b.premio, 300);
  if (b.dinamica !== undefined) e.dinamica = clean(b.dinamica, 2000);
  if (b.fecha !== undefined) e.fecha = clean(b.fecha, 10);
  if (b.hora !== undefined) e.hora = clean(b.hora, 5);
  if (b.lugar !== undefined) e.lugar = clean(b.lugar, 160);
  if (b.plazoContactoDias !== undefined) e.plazoContactoDias = clean(b.plazoContactoDias, 4).replace(/\D/g, '');

  // Imagen del premio (dataURL) opcional: se guarda en disco, no en el JSON.
  if (typeof b.premioImagen === 'string') {
    const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(b.premioImagen);
    if (m) {
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length <= 6 * 1024 * 1024) {
        if (!fs.existsSync(EVENT_DIR)) fs.mkdirSync(EVENT_DIR, { recursive: true });
        fs.writeFileSync(PRIZE_FILE, buf);
        e.premioImagen = true;
      }
    }
  } else if (b.premioImagen === false || b.quitarImagen === true) {
    try { fs.rmSync(PRIZE_FILE); } catch { /* no había */ }
    e.premioImagen = false;
  }

  e.actualizadoAt = new Date().toISOString();
  save();
  res.json(db().event);
});

export default router;
