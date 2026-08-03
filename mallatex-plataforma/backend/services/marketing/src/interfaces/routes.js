import { Router } from 'express';
import { asyncHandler } from '@mallatex/shared/http';
import { requireAuth, requireModule, requireEmployee } from '@mallatex/shared/auth';

/**
 * Rutas HTTP del contexto marketing, todas bajo /api/mkt. Reciben los casos de
 * uso ya construidos (inyección de dependencias desde index.js). Dos
 * superficies sobre el mismo dominio: marketing en la web (módulos mkt-*) y
 * empleados en la app móvil (lecturas, solicitudes de formato y salidas de
 * inventario).
 */
export function buildRoutes({ assetService, formatRequestService, postService, campaignService, printService }) {
  const router = Router();
  const mkt = Router();

  const actor = (req) => req.auth?.name || req.auth?.email || '';
  const empId = (req) => Number(req.auth.sub);
  const esEmpleado = (req) => req.auth?.principal === 'employee';
  const tieneModulo = (req, key) =>
    req.auth?.role === 'admin' || (req.auth?.modules || []).includes(key);

  // ================================================================
  //  BANCO DE ACTIVOS — lecturas para cualquier sesión; escrituras mkt-banco
  // ================================================================
  const assets = Router();

  assets.get('/', requireAuth, asyncHandler(async (req, res) => res.json(await assetService.listar(req.query))));
  assets.get('/s3-status', requireAuth, requireModule('mkt-banco'), asyncHandler(async (_req, res) => res.json(await assetService.s3Status())));
  assets.post('/sync-s3', requireAuth, requireModule('mkt-banco'), asyncHandler(async (_req, res) => res.json(await assetService.syncS3())));
  assets.post(
    '/',
    requireAuth,
    requireModule('mkt-banco'),
    asyncHandler(async (req, res) =>
      res.status(201).json(await assetService.crear(req.body || {}, { uploadedBy: actor(req) }))
    )
  );
  assets.get(
    '/:id/file',
    requireAuth,
    asyncHandler(async (req, res) => {
      const archivo = await assetService.archivo(req.params.id);
      if (archivo.kind === 'blob') return res.type(archivo.mime).send(archivo.data);
      return res.redirect(302, archivo.url);
    })
  );
  assets.put('/:id', requireAuth, requireModule('mkt-banco'), asyncHandler(async (req, res) => res.json(await assetService.actualizar(req.params.id, req.body || {}))));
  assets.delete('/:id', requireAuth, requireModule('mkt-banco'), asyncHandler(async (req, res) => res.json(await assetService.eliminar(req.params.id))));
  mkt.use('/assets', assets);

  // ================================================================
  //  SOLICITUDES DE FORMATO — empleado (móvil) y marketing (mkt-formatos)
  // ================================================================
  const formatos = Router();

  formatos.post(
    '/',
    requireAuth,
    requireEmployee,
    asyncHandler(async (req, res) =>
      res.status(201).json(
        await formatRequestService.crear(req.body || {}, {
          solicitanteId: empId(req),
          solicitante: req.auth.name || `Empleado ${req.auth.sub}`,
        })
      )
    )
  );
  formatos.get('/mine', requireAuth, requireEmployee, asyncHandler(async (req, res) => res.json(await formatRequestService.mias(empId(req)))));
  formatos.get('/', requireAuth, requireModule('mkt-formatos'), asyncHandler(async (req, res) => res.json(await formatRequestService.listar(req.query))));
  formatos.post('/:id/estado', requireAuth, requireModule('mkt-formatos'), asyncHandler(async (req, res) => res.json(await formatRequestService.cambiarEstado(req.params.id, req.body || {}))));

  // Mensajes: el vendedor sólo en sus solicitudes; marketing en cualquiera.
  formatos.post(
    '/:id/message',
    requireAuth,
    asyncHandler(async (req, res) => {
      const message = (req.body || {}).message;
      if (esEmpleado(req)) {
        return res.json(
          await formatRequestService.mensaje(req.params.id, {
            by: req.auth.name || `Empleado ${req.auth.sub}`,
            role: 'vendedor',
            message,
            employeeId: empId(req),
          })
        );
      }
      if (!tieneModulo(req, 'mkt-formatos')) {
        return res.status(403).json({ error: 'Módulo no autorizado: mkt-formatos' });
      }
      return res.json(
        await formatRequestService.mensaje(req.params.id, {
          by: actor(req) || 'Marketing',
          role: 'marketing',
          message,
        })
      );
    })
  );
  mkt.use('/format-requests', formatos);

  // ================================================================
  //  PUBLICACIONES — lecturas con sesión; escrituras mkt-publicaciones
  // ================================================================
  const posts = Router();

  posts.get('/unseen-count', requireAuth, requireEmployee, asyncHandler(async (req, res) => res.json(await postService.unseenCount(empId(req)))));
  posts.post('/seen', requireAuth, requireEmployee, asyncHandler(async (req, res) => res.json(await postService.marcarVistas(empId(req), req.body || {}))));
  posts.get('/', requireAuth, asyncHandler(async (req, res) => res.json(await postService.listar(req.query))));
  posts.post(
    '/',
    requireAuth,
    requireModule('mkt-publicaciones'),
    asyncHandler(async (req, res) =>
      res.status(201).json(await postService.crear(req.body || {}, { publicadoPor: actor(req) }))
    )
  );
  posts.delete('/:id', requireAuth, requireModule('mkt-publicaciones'), asyncHandler(async (req, res) => res.json(await postService.eliminar(req.params.id))));
  mkt.use('/posts', posts);

  // ================================================================
  //  CALENDARIO DE CAMPAÑAS — lecturas con sesión; escrituras mkt-calendario
  // ================================================================
  const campaigns = Router();

  campaigns.get('/', requireAuth, asyncHandler(async (req, res) => res.json(await campaignService.listar(req.query))));
  campaigns.post(
    '/',
    requireAuth,
    requireModule('mkt-calendario'),
    asyncHandler(async (req, res) =>
      res.status(201).json(await campaignService.crear(req.body || {}, { createdBy: actor(req) }))
    )
  );
  campaigns.put('/:id', requireAuth, requireModule('mkt-calendario'), asyncHandler(async (req, res) => res.json(await campaignService.actualizar(req.params.id, req.body || {}))));
  campaigns.post('/:id/cerrar', requireAuth, requireModule('mkt-calendario'), asyncHandler(async (req, res) => res.json(await campaignService.cerrar(req.params.id))));
  mkt.use('/campaigns', campaigns);

  // ================================================================
  //  INVENTARIO DE IMPRESOS — lecturas con sesión; admin mkt-impresos;
  //  los empleados sólo registran salidas.
  // ================================================================
  const impresos = Router();

  impresos.get('/', requireAuth, asyncHandler(async (_req, res) => res.json(await printService.listar())));
  impresos.post('/', requireAuth, requireModule('mkt-impresos'), asyncHandler(async (req, res) => res.status(201).json(await printService.crear(req.body || {}))));
  impresos.get('/:id/movements', requireAuth, asyncHandler(async (req, res) => res.json(await printService.movimientos(req.params.id))));
  impresos.put('/:id', requireAuth, requireModule('mkt-impresos'), asyncHandler(async (req, res) => res.json(await printService.actualizar(req.params.id, req.body || {}))));
  impresos.delete('/:id', requireAuth, requireModule('mkt-impresos'), asyncHandler(async (req, res) => res.json(await printService.eliminar(req.params.id))));
  mkt.use('/print-items', impresos);

  mkt.post(
    '/print-movements',
    requireAuth,
    asyncHandler(async (req, res) => {
      // Marketing (módulo) registra cualquier tipo; el empleado sólo salidas
      // (la regla de "sólo salida" la aplica el dominio con soloSalida).
      if (!esEmpleado(req) && !tieneModulo(req, 'mkt-impresos')) {
        return res.status(403).json({ error: 'Módulo no autorizado: mkt-impresos' });
      }
      const movimiento = await printService.registrarMovimiento(req.body || {}, {
        actor: { principal: req.auth.principal, name: req.auth.name || actor(req) },
      });
      res.status(201).json(movimiento);
    })
  );

  router.use('/api/mkt', mkt);
  return router;
}
