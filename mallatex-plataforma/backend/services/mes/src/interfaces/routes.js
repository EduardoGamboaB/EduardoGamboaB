import { Router } from 'express';
import { asyncHandler } from '@mallatex/shared/http';
import { requireAuth, requireModule, requireEmployee } from '@mallatex/shared/auth';

/**
 * Rutas HTTP del contexto MES. Reciben los casos de uso ya construidos
 * (inyección de dependencias desde index.js). La superficie web se protege por
 * módulo según los 6 perfiles MES (producción, almacén, operaciones, cobranza,
 * dirección); la tablet de línea usa sesión de empleado con perfil 'linea'.
 */

/** Guarda de tablet: exige empleado con perfil de línea (admin pasa). */
function requireLinea(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'No autenticado' });
  if (req.auth.role === 'admin') return next();
  if (req.auth.principal !== 'employee' || req.auth.profile !== 'linea') {
    return res.status(403).json({ error: 'Requiere tablet de línea' });
  }
  next();
}

export function buildRoutes({ productionService, shopFloorService, warehouseService, boardService }) {
  const router = Router();

  // ---- Pedidos de producción (MT-PC-003) ---------------------------
  const orders = Router();
  orders.use(requireAuth, requireModule('mes-produccion'));
  // Sin ?page: arreglo plano (con tope); con ?page: { items, total, ... }.
  orders.get('/', asyncHandler(async (req, res) => res.json(await productionService.list(req.query))));
  orders.post(
    '/',
    asyncHandler(async (req, res) => {
      const saved = await productionService.create(req.body);
      res.status(201).json(saved.toPublic());
    })
  );
  orders.get('/:id', asyncHandler(async (req, res) => res.json(await productionService.getById(req.params.id))));
  orders.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const updated = await productionService.update(req.params.id, req.body);
      res.json(updated.toPublic());
    })
  );
  orders.post(
    '/:id/liberar',
    asyncHandler(async (req, res) => res.json((await productionService.liberar(req.params.id)).toPublic()))
  );
  orders.post(
    '/:id/avanzar',
    asyncHandler(async (req, res) => res.json((await productionService.avanzarProceso(req.params.id)).toPublic()))
  );
  orders.post(
    '/:id/terminados',
    asyncHandler(async (req, res) =>
      res.json((await productionService.registrarTerminados(req.params.id, req.body?.cantidad)).toPublic())
    )
  );
  router.use('/api/mes/orders', orders);

  // ---- Líneas -------------------------------------------------------
  const lines = Router();
  lines.use(requireAuth, requireModule('mes-produccion'));
  lines.get('/', asyncHandler(async (_req, res) => res.json(await shopFloorService.lines())));
  lines.post('/', asyncHandler(async (req, res) => res.status(201).json(await shopFloorService.createLine(req.body))));
  lines.put('/:id', asyncHandler(async (req, res) => res.json(await shopFloorService.updateLine(req.params.id, req.body))));
  router.use('/api/mes/lines', lines);

  // ---- Operadores ---------------------------------------------------
  const operators = Router();
  operators.use(requireAuth, requireModule('mes-produccion'));
  operators.get(
    '/',
    asyncHandler(async (req, res) => res.json(await shopFloorService.operators({ lineId: req.query.line })))
  );
  operators.post('/', asyncHandler(async (req, res) => res.status(201).json(await shopFloorService.createOperator(req.body))));
  operators.put('/:id', asyncHandler(async (req, res) => res.json(await shopFloorService.updateOperator(req.params.id, req.body))));
  router.use('/api/mes/operators', operators);

  // ---- Rollos (escaneo por código) ---------------------------------
  const rolls = Router();
  rolls.use(requireAuth, requireModule('mes-produccion'));
  rolls.get(
    '/scan/:code',
    asyncHandler(async (req, res) => {
      const roll = await shopFloorService.scanRoll(req.params.code);
      if (!roll) return res.status(404).json({ error: 'Rollo no encontrado' });
      res.json(roll.toPlain());
    })
  );
  // Sin ?page: arreglo plano (con tope); con ?page: { items, total, ... }.
  rolls.get('/', asyncHandler(async (req, res) => res.json(await shopFloorService.rolls(req.query))));
  rolls.post('/', asyncHandler(async (req, res) => res.status(201).json((await shopFloorService.createRoll(req.body)).toPlain())));
  rolls.put('/:id', asyncHandler(async (req, res) => res.json((await shopFloorService.updateRoll(req.params.id, req.body)).toPlain())));
  router.use('/api/mes/rolls', rolls);

  // ---- Avisos de piso ----------------------------------------------
  const avisos = Router();
  avisos.use(requireAuth, requireModule('mes-produccion'));
  // Sin ?page: arreglo plano (con tope); con ?page: { items, total, ... }.
  avisos.get('/', asyncHandler(async (req, res) => res.json(await shopFloorService.avisos(req.query))));
  avisos.post('/', asyncHandler(async (req, res) => res.status(201).json((await shopFloorService.createAviso(req.body)).toPlain())));
  avisos.put('/:id', asyncHandler(async (req, res) => res.json((await shopFloorService.updateAviso(req.params.id, req.body)).toPlain())));
  router.use('/api/mes/avisos', avisos);

  // ---- Mermas (por categoría) --------------------------------------
  const mermas = Router();
  mermas.use(requireAuth, requireModule('mes-produccion'));
  // Sin ?page: arreglo plano (con tope); con ?page: { items, total, ... }.
  mermas.get('/', asyncHandler(async (req, res) => res.json(await shopFloorService.mermas(req.query))));
  mermas.post('/', asyncHandler(async (req, res) => res.status(201).json((await shopFloorService.createMerma(req.body)).toPlain())));
  router.use('/api/mes/mermas', mermas);

  // ---- Productividad por turno -------------------------------------
  const productividad = Router();
  productividad.use(requireAuth, requireModule('mes-produccion'));
  // Sin ?page: arreglo plano (con tope); con ?page: { items, total, ... }.
  productividad.get('/', asyncHandler(async (req, res) => res.json(await shopFloorService.productividad(req.query))));
  productividad.post('/', asyncHandler(async (req, res) => res.status(201).json(await shopFloorService.createProductividad(req.body))));
  router.use('/api/mes/productividad', productividad);

  // ---- Almacén: recepciones (MT-DT-001) ----------------------------
  const recepciones = Router();
  recepciones.use(requireAuth, requireModule('mes-almacen'));
  recepciones.get('/', asyncHandler(async (_req, res) => res.json(await warehouseService.recepciones())));
  recepciones.post('/', asyncHandler(async (req, res) => res.status(201).json(await warehouseService.createRecepcion(req.body))));
  router.use('/api/mes/recepciones', recepciones);

  // ---- Almacén: egresos (MT-DT-002) --------------------------------
  const egresos = Router();
  egresos.use(requireAuth, requireModule('mes-almacen'));
  egresos.get('/', asyncHandler(async (req, res) => res.json(await warehouseService.egresos({ orderId: req.query.order }))));
  egresos.post('/', asyncHandler(async (req, res) => res.status(201).json(await warehouseService.createEgreso(req.body))));
  router.use('/api/mes/egresos', egresos);

  // ---- Producto terminado: pesaje (MT-DT-006) ----------------------
  const terminados = Router();
  terminados.use(requireAuth, requireModule('mes-almacen'));
  terminados.get(
    '/',
    asyncHandler(async (req, res) => res.json(await warehouseService.productosTerminados({ orderId: req.query.order })))
  );
  terminados.post('/', asyncHandler(async (req, res) => res.status(201).json(await warehouseService.createProductoTerminado(req.body))));
  router.use('/api/mes/productos-terminados', terminados);

  // ---- Ubicaciones --------------------------------------------------
  const locations = Router();
  locations.use(requireAuth, requireModule('mes-almacen'));
  locations.get('/', asyncHandler(async (_req, res) => res.json(await warehouseService.locations())));
  locations.post('/', asyncHandler(async (req, res) => res.status(201).json(await warehouseService.createLocation(req.body))));
  router.use('/api/mes/locations', locations);

  // ---- Tablero (KPIs operativos) -----------------------------------
  const tablero = Router();
  tablero.use(requireAuth, requireModule('mes-produccion'));
  tablero.get('/', asyncHandler(async (_req, res) => res.json(await boardService.tablero())));
  router.use('/api/mes/tablero', tablero);

  // ---- KPIs ejecutivos (dirección) ---------------------------------
  const kpis = Router();
  kpis.use(requireAuth, requireModule('mes-direccion'));
  kpis.get('/', asyncHandler(async (_req, res) => res.json(await boardService.kpis())));
  router.use('/api/mes/kpis', kpis);

  // ---- Cobranza (libera pedidos) -----------------------------------
  const cobranza = Router();
  cobranza.use(requireAuth, requireModule('mes-cobranza'));
  cobranza.get(
    '/pendientes',
    asyncHandler(async (_req, res) => {
      const list = await productionService.cobranzaPendientes();
      res.json(list.map((o) => o.toPublic()));
    })
  );
  cobranza.post(
    '/:id/confirmar-pago',
    asyncHandler(async (req, res) => res.json((await productionService.confirmarPago(req.params.id)).toPublic()))
  );
  router.use('/api/mes/cobranza', cobranza);

  // ---- Catálogo público para kioscos de planta ---------------------
  // Sólo código/nombre/tipo de las líneas activas: permite que un kiosco
  // recién instalado se configure sin sesión (datos no sensibles).
  const kiosk = Router();
  kiosk.get(
    '/lines',
    asyncHandler(async (_req, res) => {
      const lines = await shopFloorService.lines();
      res.json(lines.filter((l) => l.active !== false).map((l) => ({ code: l.code, name: l.name, type: l.type })));
    })
  );
  router.use('/api/mes/kiosk', kiosk);

  // ---- Tablet de línea (móvil, perfil 'linea') ---------------------
  const tablet = Router();
  tablet.use(requireAuth, requireEmployee, requireLinea);
  tablet.get('/lines', asyncHandler(async (_req, res) => res.json(await shopFloorService.lines())));
  tablet.post(
    '/scan',
    asyncHandler(async (req, res) => res.json((await shopFloorService.tabletScan(req.body || {})).toPlain()))
  );
  tablet.post('/alert', asyncHandler(async (req, res) => res.status(201).json((await shopFloorService.tabletAlert(req.body)).toPlain())));
  // Avance de producción desde piso: endpoint propio (no contamina las alertas).
  // Con orderId registra terminados sobre el pedido; si no, deja constancia
  // como aviso informativo de avance en la línea.
  tablet.post(
    '/avance',
    asyncHandler(async (req, res) => {
      const { orderId, cantidad, lineId, descripcion } = req.body || {};
      if (orderId) {
        const order = await productionService.registrarTerminados(orderId, Number(cantidad) || 0);
        return res.json(order.toPublic());
      }
      const aviso = await shopFloorService.tabletAlert({
        lineId,
        tipo: 'avance',
        descripcion: descripcion || `Avance reportado: ${Number(cantidad) || 0} piezas`,
      });
      res.status(201).json(aviso.toPlain());
    })
  );
  tablet.post('/merma', asyncHandler(async (req, res) => res.status(201).json((await shopFloorService.tabletMerma(req.body)).toPlain())));
  router.use('/api/mes/tablet', tablet);

  return router;
}
