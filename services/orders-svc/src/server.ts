/**
 * orders-svc · Pedidos del cliente, liberación por cobranza, estados.
 * Procesos formales: MT-PC-003 directiva ("ningún pedido pasa a producción sin pago").
 *
 * Endpoints:
 *   GET    /pedidos                  · lista con filtros
 *   GET    /pedidos/:id              · detalle
 *   POST   /pedidos                  · alta (cobranza-pendiente por defecto)
 *   PATCH  /pedidos/:id              · update parcial
 *   POST   /pedidos/:id/liberar      · cobranza libera pago → emite event
 *   POST   /pedidos/:id/entregar     · marca como entregado
 *   GET    /pedidos/:id/bitacora     · historial de cambios
 */
import cors from '@fastify/cors'
import { buildServer, ctx } from '../../_shared/server'
import { publish, makeEnvelope } from '../../_shared/events'
import { PedidoCreateZ, PedidoUpdateZ, LiberarPedidoZ, EstadoPedidoZ } from '@mallatex/shared-types'
import { db } from './db'

const app = buildServer('orders-svc')
await app.register(cors, { origin: true })

// Override readiness con check de Prisma
app.get('/ready', async () => {
  await db.$queryRaw`SELECT 1`
  return { ready: true, svc: 'orders-svc', db: 'ok' }
})

/** Generador de folio: si el cliente tiene prefijo conocido lo usa, si no usa 6 dígitos correlativo */
async function nextFolio(cliente: string, prefijoSugerido?: string): Promise<string> {
  if (prefijoSugerido) {
    const last = await db.pedido.findMany({
      where: { id: { startsWith: `${prefijoSugerido} ` } },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })
    const next = last[0] ? parseInt(last[0].id.split(' ').pop()!, 10) + 1 : 1
    return `${prefijoSugerido} ${next}`
  }
  // Fallback: 6 dígitos correlativo global
  const last = await db.pedido.findMany({
    where: { id: { not: { contains: ' ' } } },
    orderBy: { createdAt: 'desc' },
    take: 1,
  })
  const next = last[0] ? parseInt(last[0].id, 10) + 1 : 100000
  return String(next)
}

// ---------- GET /pedidos ----------
app.get('/pedidos', async (req) => {
  const q = req.query as { estado?: string; cliente?: string; pageSize?: string; page?: string }
  const where: any = {}
  if (q.estado) where.estado = q.estado.replace(/-/g, '_')
  if (q.cliente) where.cliente = { contains: q.cliente, mode: 'insensitive' }

  const pageSize = Math.min(parseInt(q.pageSize ?? '20', 10), 100)
  const page = Math.max(parseInt(q.page ?? '1', 10), 1)

  const [items, total] = await Promise.all([
    db.pedido.findMany({ where, take: pageSize, skip: (page - 1) * pageSize, orderBy: { createdAt: 'desc' } }),
    db.pedido.count({ where }),
  ])
  return { items, total, page, pageSize }
})

// ---------- GET /pedidos/:id ----------
app.get('/pedidos/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const p = await db.pedido.findUnique({ where: { id }, include: { bitacora: true, liberaciones: true } })
  if (!p) return reply.status(404).send({ error: 'pedido_not_found' })
  return p
})

// ---------- POST /pedidos ----------
app.post('/pedidos', async (req) => {
  const c = ctx(req)
  const parsed = PedidoCreateZ.parse(req.body)
  const id = parsed.id ?? (await nextFolio(parsed.cliente))

  const pedido = await db.pedido.create({
    data: {
      id,
      cliente: parsed.cliente,
      material: parsed.material,
      medida: parsed.medida,
      ancho: parsed.ancho,
      largo: parsed.largo,
      rollos: parsed.rollos,
      m2: parsed.m2,
      procesos: parsed.procesos,
      meta: parsed.meta,
      pendientes: parsed.meta,
      fechaPedido: new Date(parsed.fechaPedido),
      compromiso: new Date(parsed.compromiso),
      formaEntrega: parsed.formaEntrega.replace(/ /g, '_') as any,
      observaciones: parsed.observaciones,
      subPedidos: parsed.subPedidos ?? [],
      bitacora: { create: { toEstado: 'cobranza_pendiente', changedBy: c.userId ?? 'system' } },
    },
  })

  await publish(makeEnvelope('orders.created', 'orders-svc', { pedidoId: pedido.id, cliente: pedido.cliente, m2: pedido.m2 }))
  return pedido
})

// ---------- PATCH /pedidos/:id ----------
app.patch('/pedidos/:id', async (req, reply) => {
  const { id } = req.params as { id: string }
  const c = ctx(req)
  const patch = PedidoUpdateZ.parse(req.body)

  const before = await db.pedido.findUnique({ where: { id } })
  if (!before) return reply.status(404).send({ error: 'pedido_not_found' })

  const data: any = { ...patch }
  if (patch.estado) data.estado = patch.estado.replace(/-/g, '_')
  if (patch.formaEntrega) data.formaEntrega = patch.formaEntrega.replace(/ /g, '_')
  if (patch.fechaPedido) data.fechaPedido = new Date(patch.fechaPedido)
  if (patch.compromiso) data.compromiso = new Date(patch.compromiso)

  const updated = await db.pedido.update({
    where: { id },
    data: {
      ...data,
      ...(patch.estado && patch.estado !== EstadoPedidoZ.parse(before.estado.replace(/_/g, '-'))
        ? { bitacora: { create: { fromEstado: before.estado, toEstado: data.estado, changedBy: c.userId ?? 'system' } } }
        : {}),
    },
  })
  return updated
})

// ---------- POST /pedidos/:id/liberar (cobranza) ----------
app.post('/pedidos/:id/liberar', async (req, reply) => {
  const { id } = req.params as { id: string }
  const parsed = LiberarPedidoZ.parse({ ...((req.body as object) ?? {}), pedidoId: id })

  const before = await db.pedido.findUnique({ where: { id } })
  if (!before) return reply.status(404).send({ error: 'pedido_not_found' })
  if (before.pagoConfirmado) return reply.status(409).send({ error: 'already_released' })

  const updated = await db.pedido.update({
    where: { id },
    data: {
      pagoConfirmado: true,
      estado: 'liberado',
      liberaciones: { create: { responsable: parsed.responsable, tipo: parsed.tipo, monto: parsed.monto, notas: parsed.notas } },
      bitacora: { create: { fromEstado: before.estado, toEstado: 'liberado', changedBy: parsed.responsable, reason: parsed.tipo } },
    },
  })

  await publish(makeEnvelope('orders.released', 'orders-svc', { pedidoId: id, by: parsed.responsable }))
  return updated
})

// ---------- POST /pedidos/:id/entregar ----------
app.post('/pedidos/:id/entregar', async (req, reply) => {
  const { id } = req.params as { id: string }
  const c = ctx(req)
  const before = await db.pedido.findUnique({ where: { id } })
  if (!before) return reply.status(404).send({ error: 'pedido_not_found' })

  const updated = await db.pedido.update({
    where: { id },
    data: {
      estado: 'entregado',
      entregados: before.meta,
      enPiso: 0,
      bitacora: { create: { fromEstado: before.estado, toEstado: 'entregado', changedBy: c.userId ?? 'system' } },
    },
  })
  await publish(makeEnvelope('orders.delivered', 'orders-svc', { pedidoId: id, fecha: new Date().toISOString() }))
  return updated
})

// ---------- GET /pedidos/:id/bitacora ----------
app.get('/pedidos/:id/bitacora', async (req) => {
  const { id } = req.params as { id: string }
  return db.bitacoraEvento.findMany({ where: { pedidoId: id }, orderBy: { createdAt: 'asc' } })
})

const port = parseInt(process.env.PORT ?? '3001', 10)
await app.listen({ port, host: '0.0.0.0' })
app.log.info(`orders-svc escuchando en :${port}`)
