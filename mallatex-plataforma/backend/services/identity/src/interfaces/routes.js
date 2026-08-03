import { Router } from 'express';
import { asyncHandler } from '@mallatex/shared/http';
import { requireAuth, adminOnly } from '@mallatex/shared/auth';

/**
 * Rutas HTTP del contexto identity. Reciben los casos de uso ya construidos
 * (inyección de dependencias desde index.js).
 */
export function buildRoutes({ authService, accessService, userDAO }) {
  const router = Router();

  // ---- Auth ---------------------------------------------------------
  const auth = Router();
  auth.post(
    '/login',
    asyncHandler(async (req, res) => {
      const { email, password, code, pin } = req.body || {};
      if (email && password) {
        return res.json(await authService.loginAdmin(email, password));
      }
      if (code && pin) {
        return res.json(await authService.loginEmployee(code, pin));
      }
      return res.status(400).json({ error: 'Proporcione email+password o code+pin' });
    })
  );
  auth.post('/logout', (_req, res) => res.json({ ok: true }));
  auth.get(
    '/me',
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({
        sub: req.auth.sub,
        principal: req.auth.principal,
        role: req.auth.role,
        profile: req.auth.profile,
        name: req.auth.name,
        modules: req.auth.modules || [],
        portalModules: req.auth.portalModules || [],
      });
    })
  );
  router.use('/api/auth', auth);

  // ---- Usuarios (admin) --------------------------------------------
  const users = Router();
  users.use(requireAuth, adminOnly);
  users.get('/', asyncHandler(async (_req, res) => res.json((await userDAO.findAll()).map((u) => u.toPublic()))));
  users.post(
    '/',
    asyncHandler(async (req, res) => {
      const user = await authService.createUser(req.body);
      res.status(201).json(user.toPublic());
    })
  );
  users.put(
    '/:id',
    asyncHandler(async (req, res) => {
      const updated = await userDAO.update(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(updated.toPublic());
    })
  );
  users.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      await userDAO.delete(req.params.id);
      res.json({ ok: true });
    })
  );
  router.use('/api/users', users);

  // ---- Matriz de acceso (admin) ------------------------------------
  const access = Router();
  access.use(requireAuth, adminOnly);
  access.get('/catalog', asyncHandler(async (req, res) => res.json(await accessService.catalog(req.query.surface || 'web'))));
  access.get('/matrix', asyncHandler(async (_req, res) => res.json(await accessService.getMatrix())));
  access.put(
    '/grants',
    asyncHandler(async (req, res) => {
      const { subjectType, subjectKey, surface, moduleKeys } = req.body || {};
      res.json(await accessService.setGrants(subjectType, subjectKey, surface, moduleKeys || []));
    })
  );
  router.use('/api/access', access);

  return router;
}
