import { Router } from 'express';
import { asyncHandler, createIpRateLimiter } from '@mallatex/shared/http';
import { requireAuth, adminOnly } from '@mallatex/shared/auth';

/**
 * Rutas HTTP del contexto leads. Reciben los casos de uso ya construidos
 * (inyección de dependencias desde index.js), replicando el estilo de identity.
 */
export function buildRoutes({ eventService, leadService, raffleService, statsService }) {
  const router = Router();

  // Envía un blob de imagen ({ mime, data }) o 404.
  const sendImage = (res, blob, msg) => {
    if (!blob || !blob.data) return res.status(404).json({ error: msg });
    res.type(blob.mime || 'image/jpeg').send(blob.data);
  };

  // ---- Eventos ------------------------------------------------------
  const events = Router();

  // Público (landing / QR / términos).
  events.get('/public/active', asyncHandler(async (_req, res) => res.json(await eventService.publicActive())));
  events.get('/public/:id', asyncHandler(async (req, res) => res.json(await eventService.publicById(req.params.id))));
  events.get(
    '/:id/premio-imagen',
    asyncHandler(async (req, res) => sendImage(res, await eventService.premioImagen(req.params.id), 'Sin imagen'))
  );

  // Administración (solo admin).
  const eventsAdmin = Router();
  eventsAdmin.use(requireAuth, adminOnly);
  eventsAdmin.get('/', asyncHandler(async (_req, res) => res.json(await eventService.listar())));
  eventsAdmin.post('/', asyncHandler(async (req, res) => res.status(201).json(await eventService.crear(req.body || {}))));
  eventsAdmin.put('/:id', asyncHandler(async (req, res) => res.json(await eventService.actualizar(req.params.id, req.body || {}))));
  eventsAdmin.post('/:id/finalizar', asyncHandler(async (req, res) => res.json(await eventService.finalizar(req.params.id))));
  eventsAdmin.post('/:id/reabrir', asyncHandler(async (req, res) => res.json(await eventService.reabrir(req.params.id))));
  eventsAdmin.post('/:id/activate', asyncHandler(async (req, res) => res.json(await eventService.activar(req.params.id))));
  eventsAdmin.delete('/:id', asyncHandler(async (req, res) => res.json(await eventService.eliminar(req.params.id))));
  events.use(eventsAdmin);
  router.use('/api/events', events);

  // ---- Leads --------------------------------------------------------
  const leads = Router();

  // Resuelve el evento objetivo desde body o query (?event=<id>).
  const conEvento = (req) => ({ ...(req.body || {}), event: (req.body && req.body.event) || req.query.event });

  // Captura por el personal administrativo (requiere sesión admin). forzar salta el duplicado.
  leads.post(
    '/',
    requireAuth,
    adminOnly,
    asyncHandler(async (req, res) => {
      const body = conEvento(req);
      res.status(201).json(await leadService.capturar(body, { forzar: Boolean(body.forzar) }));
    })
  );

  // Autoregistro público (landing/QR): limitado por IP para frenar spam/DoS
  // (además del honeypot y la deduplicación del servicio). Requiere TRUST_PROXY
  // para ver la IP real detrás del gateway.
  const registroLimiter = createIpRateLimiter({
    max: Number(process.env.LEADS_REGISTRO_MAX || 20),
    windowMs: Number(process.env.LEADS_REGISTRO_WINDOW_MIN || 5) * 60 * 1000,
  });
  leads.post('/registro', registroLimiter, asyncHandler(async (req, res) => res.status(201).json(await leadService.autoregistro(conEvento(req)))));

  // Catálogos para el formulario (público).
  leads.get('/meta', asyncHandler(async (_req, res) => res.json(await leadService.meta())));

  // A partir de aquí, PII y operaciones destructivas: solo administración.
  leads.get('/', requireAuth, adminOnly, asyncHandler(async (req, res) => res.json(await leadService.listar(req.query))));
  leads.get(
    '/export.csv',
    requireAuth,
    adminOnly,
    asyncHandler(async (req, res) => {
      const csv = await leadService.exportCsv(req.query.event);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="leads-anaberries.csv"');
      res.send(csv);
    })
  );
  leads.get(
    '/:id/badge',
    requireAuth,
    adminOnly,
    asyncHandler(async (req, res) => sendImage(res, await leadService.badge(req.params.id), 'Sin foto'))
  );
  leads.delete('/:id', requireAuth, adminOnly, asyncHandler(async (req, res) => res.json(await leadService.eliminar(req.params.id))));
  router.use('/api/leads', leads);

  // ---- Sorteo (solo administración) --------------------------------
  const raffle = Router();
  raffle.use(requireAuth, adminOnly);
  raffle.get('/eligible', asyncHandler(async (req, res) => res.json(await raffleService.eligible(req.query))));
  raffle.post('/draw', asyncHandler(async (req, res) => res.status(201).json(await raffleService.draw({ ...(req.body || {}), event: (req.body && req.body.event) || req.query.event }))));
  raffle.get('/winners', asyncHandler(async (req, res) => res.json(await raffleService.winners(req.query))));
  raffle.post('/winners/:id/resend', asyncHandler(async (req, res) => res.json(await raffleService.resend(req.params.id))));
  raffle.delete('/winners/:id', asyncHandler(async (req, res) => res.json(await raffleService.deleteWinner(req.params.id))));
  raffle.post(
    '/test-mail',
    asyncHandler(async (req, res) => res.json(await raffleService.testMail({ to: (req.body && req.body.to) || req.auth?.email })))
  );
  router.use('/api/raffle', raffle);

  // ---- Estadísticas (solo administración) --------------------------
  const stats = Router();
  stats.use(requireAuth, adminOnly);
  stats.get('/', asyncHandler(async (req, res) => res.json(await statsService.dashboard(req.query))));
  router.use('/api/stats', stats);

  return router;
}
