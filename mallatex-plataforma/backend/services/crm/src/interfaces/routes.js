import { Router } from 'express';
import { asyncHandler } from '@mallatex/shared/http';
import { requireAuth, adminOnly, requireRole, requireEmployee, requireCommercialProfile } from '@mallatex/shared/auth';

/**
 * Rutas HTTP del contexto crm. Reciben los casos de uso ya construidos
 * (inyección de dependencias desde index.js). Tres superficies sobre el mismo
 * dominio: gerente (web), vendedor (móvil) y webhook de integraciones.
 */
export function buildRoutes({ salesService, commercialService, productService, integrationService }) {
  const router = Router();
  const empId = (req) => Number(req.auth.sub);

  // ================================================================
  //  WEBHOOK — Aspel (sin sesión de usuario; secreto compartido)
  // ================================================================
  const webhook = Router();
  webhook.post(
    '/aspel/payment',
    asyncHandler(async (req, res) => {
      integrationService.assertWebhookSecret(req.get('x-webhook-secret') || req.query.secret || '');
      res.json(await integrationService.registerAspelPayment(req.body));
    })
  );
  router.use('/api/integrations', webhook);

  // ================================================================
  //  MÓVIL — vendedor (empleado con perfil comercial)
  // ================================================================
  const sales = Router();
  sales.use(requireAuth, requireEmployee, requireCommercialProfile);

  sales.post('/advisor', asyncHandler(async (req, res) => res.json(await salesService.advisor(req.body))));

  sales.get('/my-clients', asyncHandler(async (req, res) => res.json(await salesService.myClients(empId(req)))));
  sales.post('/my-clients', asyncHandler(async (req, res) => res.status(201).json(await salesService.createClient(empId(req), req.body))));
  sales.get('/clients/:id', asyncHandler(async (req, res) => res.json(await salesService.clientDetail(empId(req), req.params.id))));
  sales.post('/clients', asyncHandler(async (req, res) => res.status(201).json(await salesService.createClient(empId(req), req.body))));

  sales.post('/routes/start', asyncHandler(async (req, res) => {
    const { route, created } = await salesService.startRoute(empId(req), req.body);
    res.status(created ? 201 : 200).json(route);
  }));
  sales.get('/routes/active', asyncHandler(async (req, res) => res.json(await salesService.activeRoute(empId(req)))));
  sales.post('/routes/:id/track', asyncHandler(async (req, res) => res.json(await salesService.trackRoute(empId(req), req.params.id, req.body))));
  sales.post('/routes/:id/end', asyncHandler(async (req, res) => res.json(await salesService.endRoute(empId(req), req.params.id))));

  sales.get('/visits', asyncHandler(async (req, res) => res.json(await salesService.listVisits(empId(req), req.query))));
  sales.post('/visits', asyncHandler(async (req, res) => res.status(201).json(await salesService.createVisit(empId(req), req.body))));

  sales.get('/products', asyncHandler(async (req, res) => res.json(await salesService.searchProducts(req.query))));

  sales.get('/quotes', asyncHandler(async (req, res) => res.json(await salesService.listQuotes(empId(req)))));
  sales.post('/quotes', asyncHandler(async (req, res) => res.status(201).json(await salesService.createQuote(empId(req), req.body))));

  sales.get('/orders', asyncHandler(async (req, res) => res.json(await salesService.listOrders(empId(req)))));
  sales.post('/orders', asyncHandler(async (req, res) => res.status(201).json(await salesService.createOrder(empId(req), req.body))));

  sales.get('/expense-requests', asyncHandler(async (req, res) => res.json(await salesService.listExpenseRequests(empId(req)))));
  sales.post('/expense-requests', asyncHandler(async (req, res) => res.status(201).json(await salesService.createExpenseRequest(empId(req), req.body))));

  sales.get('/expenses', asyncHandler(async (req, res) => res.json(await salesService.listExpenses(empId(req)))));
  sales.post('/expenses', asyncHandler(async (req, res) => res.status(201).json(await salesService.createExpense(empId(req), req.body))));

  sales.get('/invoices', asyncHandler(async (req, res) => res.json(await salesService.listInvoices(empId(req)))));
  sales.post('/invoices', asyncHandler(async (req, res) => res.status(201).json(await salesService.createInvoice(empId(req), req.body))));

  sales.get('/objectives/me', asyncHandler(async (req, res) => res.json(await salesService.myObjectives(empId(req)))));

  router.use('/api/sales', sales);

  // ================================================================
  //  WEB — gerente comercial (admin o rol comercial/contador)
  // ================================================================
  const crm = Router();
  crm.use(requireAuth, requireRole('comercial', 'contador'));
  const actor = (req) => req.auth?.name || 'Gerente';

  crm.get('/clients', asyncHandler(async (req, res) => res.json(await commercialService.listClients(req.query))));
  crm.post('/clients', asyncHandler(async (req, res) => res.status(201).json(await commercialService.createClient(req.body))));
  crm.put('/clients/:id', asyncHandler(async (req, res) => res.json(await commercialService.updateClient(req.params.id, req.body))));
  crm.get('/clients/:id/visits', asyncHandler(async (req, res) => res.json(await commercialService.clientVisits(req.params.id))));

  crm.post('/assign', asyncHandler(async (req, res) => res.json(await commercialService.assign(req.body))));

  crm.get('/objectives', asyncHandler(async (req, res) => res.json(await commercialService.listObjectives(req.query))));
  crm.post('/objectives', asyncHandler(async (req, res) => {
    const { objective, created } = await commercialService.upsertObjective(req.body);
    res.status(created ? 201 : 200).json(objective);
  }));

  crm.get('/expense-requests', asyncHandler(async (req, res) => res.json(await commercialService.listExpenseRequests(req.query))));
  crm.post('/expense-requests/:id/decision', asyncHandler(async (req, res) => res.json(await commercialService.decideExpenseRequest(req.params.id, req.body, actor(req)))));

  crm.get('/expenses', asyncHandler(async (req, res) => res.json(await commercialService.listExpenses(req.query))));
  crm.get('/expenses/:id/photo', asyncHandler(async (req, res) => res.json(await commercialService.expensePhoto(req.params.id))));
  crm.post('/expenses/:id/decision', asyncHandler(async (req, res) => res.json(await commercialService.decideExpense(req.params.id, req.body, actor(req)))));

  crm.get('/invoices', asyncHandler(async (req, res) => res.json(await commercialService.listInvoices(req.query))));
  crm.post('/invoices/:id/emit', asyncHandler(async (req, res) => res.json(await commercialService.emitInvoice(req.params.id, req.body, actor(req)))));
  crm.post('/invoices/:id/cancel', asyncHandler(async (req, res) => res.json(await commercialService.cancelInvoice(req.params.id))));

  crm.get('/integrations/status', asyncHandler(async (_req, res) => res.json(commercialService.integrationsStatus())));

  router.use('/api/crm', crm);

  // ================================================================
  //  WEB — catálogo de productos (adminOnly)
  // ================================================================
  const products = Router();
  products.use(requireAuth, adminOnly);
  products.get('/', asyncHandler(async (req, res) => res.json(await productService.list(req.query))));
  products.get('/:id', asyncHandler(async (req, res) => res.json(await productService.get(req.params.id))));
  products.post('/', asyncHandler(async (req, res) => res.status(201).json(await productService.create(req.body))));
  products.put('/:id', asyncHandler(async (req, res) => res.json(await productService.update(req.params.id, req.body))));
  products.delete('/:id', asyncHandler(async (req, res) => res.json(await productService.remove(req.params.id))));
  router.use('/api/products', products);

  return router;
}
