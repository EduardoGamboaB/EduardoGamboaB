// Rutas de estadísticas para el Dashboard de seguimiento de leads.

import { Router } from 'express';
import { db } from '../store.js';

const router = Router();

function contarPor(items, key) {
  const map = new Map();
  for (const it of items) {
    const k = it[key] || 'Sin especificar';
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

// GET /api/stats — resumen del dashboard (opcionalmente por evento ?event=<id>).
router.get('/', (req, res) => {
  const data = db();
  const event = req.query.event;
  const leads = event ? data.leads.filter((l) => l.eventId === event) : data.leads;
  const draws = event ? data.draws.filter((d) => d.eventId === event) : data.draws;
  const hoy = new Date().toISOString().slice(0, 10);
  const leadsHoy = leads.filter((l) => (l.createdAt || '').slice(0, 10) === hoy).length;
  const conConsentimiento = leads.filter((l) => l.consentimiento).length;

  // Línea de tiempo por hora (para la jornada del evento).
  const porHora = new Map();
  for (const l of leads) {
    const h = (l.createdAt || '').slice(0, 13); // YYYY-MM-DDTHH
    if (!h) continue;
    porHora.set(h, (porHora.get(h) || 0) + 1);
  }
  const timeline = [...porHora.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, value]) => ({ label: k.slice(11) + ':00', value }));

  res.json({
    total: leads.length,
    hoy: leadsHoy,
    conConsentimiento,
    tasaConsentimiento: leads.length ? Math.round((conConsentimiento / leads.length) * 100) : 0,
    ganadores: draws.length,
    porInteres: contarPor(leads, 'interes'),
    porFuente: contarPor(leads, 'fuente'),
    porCaptador: contarPor(leads.filter((l) => l.capturadoPor), 'capturadoPor'),
    timeline,
  });
});

export default router;
