/**
 * Helpers compartidos para los microservicios Fastify.
 * (Copiar a cada servicio o publicar como `@mallatex/svc-utils`.)
 */
import Fastify, { FastifyInstance } from 'fastify'
import { z, ZodError, ZodSchema } from 'zod'

export function buildServer(name: string): FastifyInstance {
  const app = Fastify({
    logger: {
      transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' },
      base: { svc: name },
    },
    trustProxy: true,
    requestIdHeader: 'x-trace-id',
  })

  app.get('/health', async () => ({ status: 'ok', svc: name, uptime: process.uptime() }))
  app.get('/ready', async () => {
    // Cada servicio puede sobreescribir esto para chequear su BD/Redis
    return { ready: true, svc: name }
  })
  app.get('/metrics', async () => {
    // Stub para Prometheus — sustituir por prom-client en producción
    return `# HELP svc_up 1 if the service is up\n# TYPE svc_up gauge\nsvc_up{svc="${name}"} 1\n`
  })

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: 'validation_error',
        details: err.flatten(),
        traceId: req.id,
      })
    }
    req.log.error(err)
    return reply.status(err.statusCode ?? 500).send({
      error: err.message ?? 'internal_error',
      traceId: req.id,
    })
  })

  // Propaga headers del gateway (X-User-Id, X-Role) al log
  app.addHook('onRequest', async (req) => {
    const userId = req.headers['x-user-id']
    const role = req.headers['x-role']
    if (userId) req.log.info({ userId, role }, 'request from gateway')
  })

  return app
}

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}

export type AppContext = {
  userId?: string
  role?: string
  traceId: string
}

export function ctx(req: { headers: Record<string, string | string[] | undefined>; id: string }): AppContext {
  return {
    userId: req.headers['x-user-id'] as string | undefined,
    role: req.headers['x-role'] as string | undefined,
    traceId: req.id,
  }
}
