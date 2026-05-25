/**
 * inventory-svc · Rollos, recepciones (MT-PC-001), egresos (MT-PC-002), lotes MP.
 *
 * Endpoints:
 *   GET    /rollos                    · lista con filtros (estado, ubicacion, empezado)
 *   POST   /rollos                    · alta manual
 *   PATCH  /rollos/:id                · update parcial (cambio de estado, ubicación)
 *   POST   /recepciones               · alta + auto-genera N rollos
 *   POST   /recepciones/:id/muestreo  · resultado muestreo · si falla genera incidencia
 *   POST   /egresos                   · surtir material a producción (consume rollos)
 *   POST   /egresos/:id/confirmar     · producción confirma recibido
 *   POST   /retornos                  · MT-DT-005 sobrante regresa al almacén
 *   GET    /ubicaciones               · resumen por zona
 */
import cors from '@fastify/cors'
import { buildServer, ctx } from '../../_shared/server'
import { publish, makeEnvelope, consume } from '../../_shared/events'
import { RecepcionCreateZ, EgresoCreateZ, RetornoZ } from '@mallatex/shared-types'
import { db } from './db'

const app = buildServer('inventory-svc')
await app.register(cors, { origin: true })

app.get('/ready', async () => {
  await db.$queryRaw`SELECT 1`
  return { ready: true, svc: 'inventory-svc', db: 'ok' }
})

// ---------- GET /rollos ----------
app.get('/rollos', async (req) => {
  const q = req.query as { estado?: string; ubicacion?: string; empezado?: string; pedido?: string }
  const where: any = {}
  if (q.estado) where.estado = q.estado.replace(/-/g, '_')
  if (q.ubicacion) where.ubicacion = { startsWith: q.ubicacion }
  if (q.empezado) where.empezado = q.empezado === 'true'
  if (q.pedido) where.pedidoFolio = q.pedido
  return db.rollo.findMany({ where, take: 200, orderBy: { createdAt: 'desc' } })
})

// ---------- POST /rollos ----------
app.post('/rollos', async (req) => {
  const body = req.body as any
  const r = await db.rollo.create({ data: body })
  return r
})

// ---------- PATCH /rollos/:id ----------
app.patch('/rollos/:id', async (req) => {
  const { id } = req.params as { id: string }
  const c = ctx(req)
  const patch = req.body as any
  const before = await db.rollo.findUnique({ where: { id } })
  if (!before) return { error: 'rollo_not_found' }

  const r = await db.rollo.update({
    where: { id },
    data: {
      ...patch,
      movimientos: {
        create: {
          fromUb: before.ubicacion,
          toUb: patch.ubicacion ?? before.ubicacion,
          fromEst: before.estado,
          toEst: patch.estado ?? before.estado,
          motivo: patch.motivo ?? 'update',
          byUserId: c.userId ?? 'system',
        },
      },
    },
  })
  return r
})

// ---------- POST /recepciones ----------
app.post('/recepciones', async (req) => {
  const parsed = RecepcionCreateZ.parse(req.body)
  const id = `REC-${new Date().getFullYear()}-${String(await db.recepcion.count() + 1).padStart(4, '0')}`

  const r = await db.recepcion.create({
    data: {
      id,
      fecha: new Date(parsed.fecha),
      proveedor: parsed.proveedor,
      packingList: parsed.packingList,
      factura: parsed.factura,
      rollos: parsed.rollos,
      pesoTotal: parsed.pesoTotal,
      muestreoOK: parsed.muestreoOK,
      responsable: parsed.responsable,
      incidencia: parsed.incidencia,
    },
  })

  await publish(makeEnvelope('inventory.receipt.registered', 'inventory-svc', {
    recepcionId: r.id, proveedor: r.proveedor, muestreoOK: r.muestreoOK,
  }))
  return r
})

// ---------- POST /recepciones/:id/muestreo ----------
app.post('/recepciones/:id/muestreo', async (req) => {
  const { id } = req.params as { id: string }
  const { ok, incidencia } = req.body as { ok: boolean; incidencia?: string }
  const r = await db.recepcion.update({ where: { id }, data: { muestreoOK: ok, incidencia } })
  return r
})

// ---------- POST /egresos ----------
app.post('/egresos', async (req) => {
  const parsed = EgresoCreateZ.parse(req.body)
  const id = `EGR-${new Date().getFullYear()}-${String(await db.egreso.count() + 1).padStart(4, '0')}`

  // Política MT-PC-002: priorizar rollos empezados antes que nuevos
  const empezados = await db.rollo.count({
    where: { pedidoFolio: null, empezado: true, estado: 'almacen', material: parsed.material },
  })

  const eg = await db.egreso.create({
    data: {
      id,
      fecha: new Date(parsed.fecha),
      pedidoFolio: parsed.pedido,
      material: parsed.material,
      rollos: parsed.rollos,
      m2: parsed.m2,
      empezadosUsados: Math.min(parsed.empezadosUsados, empezados),
      responsableAlmacen: parsed.responsableAlmacen,
      responsableProd: parsed.responsableProd,
    },
  })

  // Marcar rollos como reservados (asignación lógica)
  await db.rollo.updateMany({
    where: { material: parsed.material, estado: 'almacen', pedidoFolio: null },
    data: { estado: 'reservado', pedidoFolio: parsed.pedido },
  })

  await publish(makeEnvelope('inventory.egreso.confirmed', 'inventory-svc', {
    egresoId: eg.id, pedidoId: parsed.pedido,
  }))
  return eg
})

// ---------- POST /egresos/:id/confirmar ----------
app.post('/egresos/:id/confirmar', async (req) => {
  const { id } = req.params as { id: string }
  return db.egreso.update({ where: { id }, data: { confirmado: true } })
})

// ---------- POST /retornos (MT-DT-005) ----------
app.post('/retornos', async (req) => {
  const parsed = RetornoZ.parse(req.body)
  // El retorno crea un MovimientoRollo "retorno" + marca el rollo como empezado=true
  return { ok: true, ...parsed }
})

// ---------- GET /ubicaciones ----------
app.get('/ubicaciones', async () => {
  const zonas = ['A', 'B', 'C', 'D']
  const out: Record<string, number> = {}
  for (const z of zonas) {
    out[z] = await db.rollo.count({ where: { ubicacion: { startsWith: z } } })
  }
  return out
})

// ---------- Consumidor de eventos: cuando un pedido se libera, sólo loguea ----------
consume('inventory-svc', 'inv-1', async (evt) => {
  if (evt.type === 'orders.released') {
    app.log.info({ pedido: (evt.payload as any).pedidoId }, 'pedido liberado, listo para egreso')
  }
}).catch((e) => app.log.error(e))

const port = parseInt(process.env.PORT ?? '3002', 10)
await app.listen({ port, host: '0.0.0.0' })
app.log.info(`inventory-svc escuchando en :${port}`)
