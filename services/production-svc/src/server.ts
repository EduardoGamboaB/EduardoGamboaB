/**
 * production-svc · Órdenes de producción, líneas, mermas, productividad, peso final.
 *
 * Endpoints:
 *   GET    /op                         · lista OP con filtros (linea, estado, pedido)
 *   POST   /op                         · alta de OP (también disparado por orders.released)
 *   POST   /op/:id/iniciar             · marca en-proceso + fechaInicio
 *   POST   /op/:id/terminar            · marca terminada + fechaFin
 *   POST   /op/:id/registro            · operador hace "+1 pieza"
 *   GET    /lineas/:id/estado          · OP activa + último registro + avisos
 *   POST   /mermas                     · alta de merma (MT-DT-003)
 *   GET    /mermas                     · lista filtrable (categoría, fecha, pedido)
 *   POST   /avisos                     · operador reporta problema
 *   PATCH  /avisos/:id                 · cambiar estado (urgente → resuelto)
 *   GET    /productividad              · turnos registrados
 *   POST   /productividad              · alta de turno
 *   GET    /productividad/oee          · OEE planta (disponibilidad × rendimiento × calidad)
 *   POST   /pesaje                     · MT-DT-006 verificación de peso
 */
import cors from '@fastify/cors'
import { buildServer, ctx } from '../../_shared/server'
import { publish, makeEnvelope, consume } from '../../_shared/events'
import { MermaCreateZ, ProductividadTurnoZ } from '@mallatex/shared-types'
import { db } from './db'

const app = buildServer('production-svc')
await app.register(cors, { origin: true })

app.get('/ready', async () => {
  await db.$queryRaw`SELECT 1`
  return { ready: true, svc: 'production-svc', db: 'ok' }
})

// ---------- OP ----------
app.get('/op', async (req) => {
  const q = req.query as { linea?: string; estado?: string; pedido?: string }
  const where: any = {}
  if (q.linea) where.linea = q.linea
  if (q.estado) where.estado = q.estado.replace(/-/g, '_')
  if (q.pedido) where.pedidoFolio = q.pedido
  return db.ordenProduccion.findMany({ where, orderBy: { fechaPlan: 'asc' }, take: 200 })
})

app.post('/op', async (req) => {
  const body = req.body as any
  const year = new Date().getFullYear()
  const count = await db.ordenProduccion.count()
  const id = `OP-${year}-${String(count + 1).padStart(5, '0')}`
  return db.ordenProduccion.create({
    data: {
      id,
      pedidoFolio: body.pedidoFolio,
      productoMat: body.productoMat,
      linea: body.linea,
      operadorIds: body.operadorIds ?? [],
      meta: body.meta,
      procesoActual: body.procesoActual,
      fechaPlan: new Date(body.fechaPlan),
    },
  })
})

app.post('/op/:id/iniciar', async (req) => {
  const { id } = req.params as { id: string }
  const op = await db.ordenProduccion.update({
    where: { id },
    data: { estado: 'en_proceso', fechaInicio: new Date() },
  })
  await publish(makeEnvelope('production.op.started', 'production-svc', {
    opId: op.id, pedidoId: op.pedidoFolio, linea: op.linea as any,
  }))
  return op
})

app.post('/op/:id/terminar', async (req) => {
  const { id } = req.params as { id: string }
  const op = await db.ordenProduccion.update({
    where: { id },
    data: { estado: 'terminada', fechaFin: new Date() },
  })
  await publish(makeEnvelope('production.op.finished', 'production-svc', {
    opId: op.id, hechas: op.hechas, meta: op.meta,
  }))
  return op
})

app.post('/op/:id/registro', async (req) => {
  const { id } = req.params as { id: string }
  const body = req.body as { operadorId: number; turno: 'MATUTINO' | 'VESPERTINO' | 'NOCTURNO'; piezas?: number; metrosLin?: number; rolloUsado?: string }
  const reg = await db.registroProduccion.create({
    data: { opId: id, operadorId: body.operadorId, turno: body.turno, piezas: body.piezas ?? 1, metrosLin: body.metrosLin, rolloUsado: body.rolloUsado },
  })
  // Auto-incrementar hechas en la OP
  await db.ordenProduccion.update({ where: { id }, data: { hechas: { increment: body.piezas ?? 1 } } })
  return reg
})

// ---------- LINEAS ----------
app.get('/lineas/:id/estado', async (req) => {
  const { id } = req.params as { id: string }
  const ops = await db.ordenProduccion.findMany({ where: { linea: id as any, estado: { in: ['en_proceso', 'pausada'] } } })
  const avisos = await db.aviso.findMany({ where: { linea: id as any, estado: 'urgente' } })
  return { linea: id, opActivas: ops, avisosUrgentes: avisos }
})

// ---------- MERMAS ----------
app.get('/mermas', async (req) => {
  const q = req.query as { categoria?: string; pedido?: string; desde?: string; hasta?: string }
  const where: any = {}
  if (q.categoria) where.categoria = q.categoria
  if (q.pedido) where.pedidoFolio = q.pedido
  if (q.desde || q.hasta) where.fecha = { gte: q.desde ? new Date(q.desde) : undefined, lte: q.hasta ? new Date(q.hasta) : undefined }
  return db.merma.findMany({ where, orderBy: { fecha: 'desc' }, take: 200 })
})

app.post('/mermas', async (req) => {
  const parsed = MermaCreateZ.parse(req.body)
  const m = await db.merma.create({
    data: {
      fecha: new Date(parsed.fecha ?? new Date()),
      pedidoFolio: parsed.pedido,
      operadorName: parsed.operador,
      linea: parsed.linea as any,
      material: parsed.material,
      metros: parsed.metros,
      categoria: parsed.categoria as any,
      defecto: parsed.defecto,
      evidenciaUrl: parsed.evidenciaUrl,
    },
  })
  await publish(makeEnvelope('production.merma.registered', 'production-svc', {
    pedidoId: m.pedidoFolio, linea: m.linea as any, categoria: m.categoria as any, metros: m.metros,
  }))
  return m
})

// ---------- AVISOS ----------
app.get('/avisos', async (req) => {
  const q = req.query as { estado?: string; linea?: string }
  const where: any = {}
  if (q.estado) where.estado = q.estado
  if (q.linea) where.linea = q.linea
  return db.aviso.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 })
})

app.post('/avisos', async (req) => {
  const c = ctx(req)
  const body = req.body as any
  const a = await db.aviso.create({
    data: {
      hora: body.hora ?? new Date().toTimeString().slice(0, 5),
      linea: body.linea,
      operador: body.operador,
      tipo: body.tipo,
      desc: body.desc,
      tiempo: '00:01',
      estado: 'urgente',
    },
  })
  await publish(makeEnvelope('production.aviso.created', 'production-svc', {
    linea: a.linea as any, tipo: a.tipo, operador: a.operador,
  }))
  return a
})

app.patch('/avisos/:id', async (req) => {
  const { id } = req.params as { id: string }
  const body = req.body as { estado?: string }
  return db.aviso.update({ where: { id }, data: { estado: body.estado } })
})

// ---------- PRODUCTIVIDAD ----------
app.get('/productividad', async (req) => {
  const q = req.query as { fecha?: string; operador?: string; linea?: string }
  const where: any = {}
  if (q.fecha) where.fecha = new Date(q.fecha)
  if (q.operador) where.operadorName = q.operador
  if (q.linea) where.linea = q.linea
  return db.productividadTurno.findMany({ where, orderBy: { fecha: 'desc' }, take: 200 })
})

app.post('/productividad', async (req) => {
  const parsed = ProductividadTurnoZ.parse(req.body)
  return db.productividadTurno.create({
    data: {
      fecha: new Date(parsed.fecha),
      linea: parsed.linea as any,
      operadorName: parsed.operador,
      horaInicio: parsed.horaInicio,
      horaFinal: parsed.horaFinal,
      imprevistos: parsed.imprevistos,
      tiempoEfectivo: parsed.tiempoEfectivo,
      mLTurno: parsed.mLTurno,
      piezasTurno: parsed.piezasTurno,
      descripcion: parsed.descripcion,
    },
  })
})

// ---------- OEE ----------
app.get('/productividad/oee', async () => {
  // Cálculo simplificado para el demo. En real se usaría: disp = (T efectivo / T disponible),
  // rend = (mLProducidos / capacidadLinea), calidad = (1 - mermas/total).
  const [t, mermas, terminados] = await Promise.all([
    db.productividadTurno.aggregate({ _sum: { tiempoEfectivo: true, imprevistos: true, mLTurno: true } }),
    db.merma.aggregate({ _sum: { metros: true } }),
    db.productoTerminado.count({ where: { verificado: true } }),
  ])
  const efectivo = t._sum.tiempoEfectivo ?? 1
  const impr = t._sum.imprevistos ?? 0
  const disp = efectivo / (efectivo + impr) * 100
  const ml = t._sum.mLTurno ?? 0
  const rend = Math.min(100, (ml / (efectivo * 5)) * 100)  // 5 mL/min capacidad teórica
  const totalProducido = ml + (mermas._sum.metros ?? 0)
  const calidad = totalProducido > 0 ? ((totalProducido - (mermas._sum.metros ?? 0)) / totalProducido) * 100 : 100
  const oee = (disp * rend * calidad) / 10000
  return {
    disponibilidad: Math.round(disp),
    rendimiento: Math.round(rend),
    calidad: Math.round(calidad),
    oee: Math.round(oee),
    turnosConsiderados: terminados,
  }
})

// ---------- PESAJE (MT-DT-006) ----------
app.post('/pesaje', async (req) => {
  const body = req.body as any
  const id = `PT-${body.pedido.replace(/\s/g, '')}-${String(await db.productoTerminado.count() + 1).padStart(2, '0')}`
  return db.productoTerminado.create({
    data: {
      id,
      pedidoFolio: body.pedido,
      material: body.material,
      medida: body.medida,
      rollos: body.rollos,
      pesoTeorico: body.pesoTeorico,
      pesoReal: body.pesoReal,
      fecha: new Date(),
      hora: new Date().toTimeString().slice(0, 5),
      verificado: Math.abs((body.pesoReal - body.pesoTeorico) / body.pesoTeorico * 100) < 5,
      responsable: body.responsable,
    },
  })
})

// ---------- Consumidor: pedido liberado → crear OP automática ----------
consume('production-svc', 'prod-1', async (evt) => {
  if (evt.type === 'orders.released') {
    const p = evt.payload as any
    app.log.info({ pedidoId: p.pedidoId }, 'orders.released → crear OP automática (stub)')
    // En producción aquí se llamaría al gateway o se haría join con info del pedido.
  }
}).catch((e) => app.log.error(e))

const port = parseInt(process.env.PORT ?? '3003', 10)
await app.listen({ port, host: '0.0.0.0' })
app.log.info(`production-svc escuchando en :${port}`)
