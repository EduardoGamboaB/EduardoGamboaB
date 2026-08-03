import { Router } from 'express';
import { asyncHandler, createLoginRateLimiter } from '@mallatex/shared/http';
import { requireAuth, adminOnly, revokeToken, purgeExpired } from '@mallatex/shared/auth';

/**
 * Rutas HTTP del contexto identity. Reciben los casos de uso ya construidos
 * (inyección de dependencias desde index.js).
 */
export function buildRoutes({ authService, accessService, userDAO }) {
  const router = Router();

  // ---- Auth ---------------------------------------------------------
  // Limitador de intentos FALLIDOS de login (10 fallos / 15 min por ip+cuenta).
  const loginLimiter = createLoginRateLimiter({
    max: Number(process.env.LOGIN_RATE_MAX || 10),
    windowMs: Number(process.env.LOGIN_RATE_WINDOW_MIN || 15) * 60 * 1000,
  });
  purgeExpired().catch(() => {}); // limpieza ocasional de la denylist al arrancar

  const auth = Router();
  auth.post(
    '/login',
    loginLimiter.guard,
    asyncHandler(async (req, res) => {
      const { email, password, code, pin } = req.body || {};
      try {
        if (email && password) {
          const out = await authService.loginAdmin(email, password);
          loginLimiter.succeed(req);
          return res.json(out);
        }
        if (code && pin) {
          const out = await authService.loginEmployee(code, pin);
          loginLimiter.succeed(req);
          return res.json(out);
        }
      } catch (e) {
        if (e?.status === 401) loginLimiter.fail(req);
        throw e;
      }
      return res.status(400).json({ error: 'Proporcione email+password o code+pin' });
    })
  );
  // Logout server-side: revoca el jti del token (denylist compartida). Los
  // demás servicios lo rechazan en cuanto refrescan su caché (≤30 s).
  auth.post(
    '/logout',
    requireAuth,
    asyncHandler(async (req, res) => {
      await revokeToken({ jti: req.auth.jti, sub: req.auth.sub, exp: req.auth.exp });
      res.json({ ok: true, revoked: true });
    })
  );
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
