// Rutas del sorteo (rifa de premios entre los leads capturados).

import { Router } from 'express';
import { db, save, newId } from '../store.js';

const router = Router();

// Devuelve los leads elegibles según opciones.
function elegibles(data, { soloConsentimiento, evitarRepetidos }) {
  const ganadoresPrevios = new Set(data.draws.map((d) => d.leadId));
  return data.leads.filter((l) => {
    if (soloConsentimiento && !l.consentimiento) return false;
    if (evitarRepetidos && ganadoresPrevios.has(l.id)) return false;
    return true;
  });
}

// GET /api/raffle/eligible — cuántos participan.
router.get('/eligible', (req, res) => {
  const data = db();
  const soloConsentimiento = req.query.consentimiento === '1';
  const evitarRepetidos = req.query.repetidos !== '0';
  res.json({
    total: elegibles(data, { soloConsentimiento, evitarRepetidos }).length,
    leadsTotales: data.leads.length,
    ganadores: data.draws.length,
  });
});

// POST /api/raffle/draw — realiza un sorteo y registra al ganador.
router.post('/draw', (req, res) => {
  const b = req.body || {};
  const premio = (b.premio || '').toString().trim().slice(0, 120) || 'Premio del evento';
  const soloConsentimiento = Boolean(b.soloConsentimiento);
  const evitarRepetidos = b.evitarRepetidos !== false; // por defecto true

  const data = db();
  const pool = elegibles(data, { soloConsentimiento, evitarRepetidos });
  if (pool.length === 0) {
    return res.status(400).json({ error: 'No hay leads elegibles para el sorteo' });
  }

  const ganador = pool[Math.floor(Math.random() * pool.length)];
  const draw = {
    id: newId('draw'),
    premio,
    leadId: ganador.id,
    nombre: ganador.nombre,
    empresa: ganador.empresa,
    telefono: ganador.telefono,
    email: ganador.email,
    participantes: pool.length,
    createdAt: new Date().toISOString(),
  };
  data.draws.push(draw);
  save();
  res.status(201).json({ ganador: draw });
});

// GET /api/raffle/winners — historial de ganadores.
router.get('/winners', (_req, res) => {
  res.json({ items: [...db().draws].reverse() });
});

// DELETE /api/raffle/winners/:id — anular un sorteo (repetir).
router.delete('/winners/:id', (req, res) => {
  const data = db();
  const idx = data.draws.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Sorteo no encontrado' });
  data.draws.splice(idx, 1);
  save();
  res.json({ ok: true });
});

export default router;
