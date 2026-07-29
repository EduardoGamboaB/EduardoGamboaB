// Rutas del sorteo (rifa de premios entre los leads de un evento).

import { Router } from 'express';
import { db, save, newId, getEvent, activeEvent } from '../store.js';
import { sendWinnerEmail, sendTestEmail, mailerEnabled, mailerProvider } from '../mailer.js';

const router = Router();

// Resuelve el evento objetivo (query/body ?event=<id> o el activo).
function eventoDe(req) {
  const id = (req.query.event || req.body?.event || '').toString();
  return (id && getEvent(id)) || activeEvent();
}

// Resuelve el evento SOLO si está vigente (existe y no finalizado). Se usa para
// sortear: si no hay un evento vigente, no se puede generar sorteo.
function eventoVigente(req) {
  const id = (req.query.event || req.body?.event || '').toString();
  if (id) { const ev = getEvent(id); return ev && !ev.finalizado ? ev : null; }
  const a = activeEvent();
  return a && !a.finalizado ? a : null;
}

// Clave de identidad de una persona (para cruzar ganadores entre eventos).
function persona(l) { return (l.email || '').toLowerCase() || l.telefono || l.id; }

// Leads elegibles de un evento según opciones y el toggle del evento.
function elegibles(data, ev, { soloConsentimiento, evitarRepetidos }) {
  const ganadoresEsteEvento = new Set(data.draws.filter((d) => d.eventId === ev.id).map((d) => d.leadId));
  // Personas que ya ganaron en OTROS eventos (para el toggle permiteGanadoresPrevios).
  const ganadoresOtros = new Set(
    data.draws.filter((d) => d.eventId !== ev.id)
      .map((d) => data.leads.find((l) => l.id === d.leadId))
      .filter(Boolean).map(persona)
  );
  return data.leads.filter((l) => {
    if (l.eventId !== ev.id) return false;
    if (soloConsentimiento && !l.consentimiento) return false;
    if (evitarRepetidos && ganadoresEsteEvento.has(l.id)) return false;
    if (!ev.permiteGanadoresPrevios && ganadoresOtros.has(persona(l))) return false;
    return true;
  });
}

// Genera un folio legible: ANB-XXXXXX.
function nuevoFolio() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return 'ANB-' + s;
}

// GET /api/raffle/eligible — cuántos participan (por evento).
router.get('/eligible', (req, res) => {
  const data = db();
  const ev = eventoVigente(req);
  // Sin evento vigente: no hay sorteo posible (total 0).
  if (!ev) {
    return res.json({ eventId: null, vigente: false, total: 0, leadsTotales: 0, ganadores: 0, correoActivo: mailerEnabled(), correoProveedor: mailerProvider() });
  }
  const soloConsentimiento = req.query.consentimiento === '1';
  const evitarRepetidos = req.query.repetidos !== '0';
  res.json({
    eventId: ev.id,
    vigente: true,
    total: elegibles(data, ev, { soloConsentimiento, evitarRepetidos }).length,
    leadsTotales: data.leads.filter((l) => l.eventId === ev.id).length,
    ganadores: data.draws.filter((d) => d.eventId === ev.id).length,
    permiteGanadoresPrevios: ev.permiteGanadoresPrevios,
    correoActivo: mailerEnabled(),
    correoProveedor: mailerProvider(),
  });
});

// POST /api/raffle/test-mail — envía un correo de prueba (verifica la integración).
router.post('/test-mail', async (req, res) => {
  if (!mailerEnabled()) return res.status(400).json({ error: 'El envío de correo no está configurado (Mailchimp/SMTP).' });
  const to = (req.body?.to || req.user?.email || '').toString().trim();
  if (!to) return res.status(400).json({ error: 'Indica un correo destino' });
  const r = await sendTestEmail(to);
  if (r.sent) return res.json({ ok: true, to, proveedor: mailerProvider() });
  res.status(502).json({ error: r.error || 'No se pudo enviar el correo de prueba', skipped: !!r.skipped });
});

// POST /api/raffle/draw — realiza un sorteo, genera folio y notifica por correo.
router.post('/draw', async (req, res) => {
  const b = req.body || {};
  const ev = eventoVigente(req);
  if (!ev) {
    return res.status(400).json({ error: 'No hay un evento activo para sortear. Selecciona o activa un evento vigente (no finalizado).' });
  }
  const premio = (b.premio || ev.premio || '').toString().trim().slice(0, 120) || 'Premio del evento';
  const soloConsentimiento = Boolean(b.soloConsentimiento);
  const evitarRepetidos = b.evitarRepetidos !== false; // por defecto true

  const data = db();
  const pool = elegibles(data, ev, { soloConsentimiento, evitarRepetidos });
  if (pool.length === 0) {
    return res.status(400).json({ error: 'No hay leads elegibles para el sorteo' });
  }

  const ganador = pool[Math.floor(Math.random() * pool.length)];
  const draw = {
    id: newId('draw'),
    eventId: ev.id,
    premio,
    folio: ganador.folio || nuevoFolio(),
    leadId: ganador.id,
    nombre: ganador.nombre,
    empresa: ganador.empresa,
    telefono: ganador.telefono,
    email: ganador.email,
    participantes: pool.length,
    emailEnviado: false,
    createdAt: new Date().toISOString(),
  };

  // Notificación por correo (best-effort; el folio queda registrado siempre).
  const r = await sendWinnerEmail({
    to: ganador.email, nombre: ganador.nombre, premio, folio: draw.folio,
    evento: ev.name, fecha: ev.fecha, hora: ev.hora, lugar: ev.lugar,
  });
  draw.emailEnviado = !!r.sent;
  draw.emailEstado = r.sent ? 'enviado' : (r.skipped ? 'omitido' : 'error');

  data.draws.push(draw);
  save();
  res.status(201).json({ ganador: draw });
});

// GET /api/raffle/winners — historial de ganadores (del evento).
router.get('/winners', (req, res) => {
  const ev = eventoDe(req);
  res.json({ items: db().draws.filter((d) => d.eventId === ev.id).reverse() });
});

// POST /api/raffle/winners/:id/resend — reenvía el correo al ganador.
router.post('/winners/:id/resend', async (req, res) => {
  const data = db();
  const d = data.draws.find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Sorteo no encontrado' });
  const ev = getEvent(d.eventId) || activeEvent();
  const r = await sendWinnerEmail({ to: d.email, nombre: d.nombre, premio: d.premio, folio: d.folio, evento: ev.name, fecha: ev.fecha, hora: ev.hora, lugar: ev.lugar });
  d.emailEnviado = !!r.sent;
  d.emailEstado = r.sent ? 'enviado' : (r.skipped ? 'omitido' : 'error');
  save();
  res.json({ ok: true, estado: d.emailEstado });
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
