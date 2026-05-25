import { z } from 'zod'
import { FolioPedidoZ } from './orders'
import { LineaIdZ, CategoriaMermaZ } from './production'

/** Sobre estándar de evento de dominio publicado en `mes:events` (Redis Streams) */
export const DomainEventEnvelopeZ = z.object({
  id: z.string(),                         // evt_01HX...
  type: z.string(),
  occurredAt: z.string().datetime(),
  producer: z.string(),                   // qué servicio lo publicó
  payload: z.unknown(),
})
export type DomainEventEnvelope = z.infer<typeof DomainEventEnvelopeZ>

// ---------- Eventos de orders ----------
export const PedidoCreadoZ = DomainEventEnvelopeZ.extend({
  type: z.literal('orders.created'),
  payload: z.object({ pedidoId: FolioPedidoZ, cliente: z.string(), m2: z.number() }),
})
export const PedidoLiberadoZ = DomainEventEnvelopeZ.extend({
  type: z.literal('orders.released'),
  payload: z.object({ pedidoId: FolioPedidoZ, by: z.string() }),
})
export const PedidoEntregadoZ = DomainEventEnvelopeZ.extend({
  type: z.literal('orders.delivered'),
  payload: z.object({ pedidoId: FolioPedidoZ, fecha: z.string() }),
})

// ---------- Eventos de inventory ----------
export const RecepcionRegistradaZ = DomainEventEnvelopeZ.extend({
  type: z.literal('inventory.receipt.registered'),
  payload: z.object({ recepcionId: z.string(), proveedor: z.string(), muestreoOK: z.boolean() }),
})
export const EgresoConfirmadoZ = DomainEventEnvelopeZ.extend({
  type: z.literal('inventory.egreso.confirmed'),
  payload: z.object({ egresoId: z.string(), pedidoId: FolioPedidoZ }),
})

// ---------- Eventos de production ----------
export const OPIniciadaZ = DomainEventEnvelopeZ.extend({
  type: z.literal('production.op.started'),
  payload: z.object({ opId: z.string(), pedidoId: FolioPedidoZ, linea: LineaIdZ }),
})
export const OPTerminadaZ = DomainEventEnvelopeZ.extend({
  type: z.literal('production.op.finished'),
  payload: z.object({ opId: z.string(), hechas: z.number(), meta: z.number() }),
})
export const MermaRegistradaZ = DomainEventEnvelopeZ.extend({
  type: z.literal('production.merma.registered'),
  payload: z.object({ pedidoId: FolioPedidoZ, linea: LineaIdZ, categoria: CategoriaMermaZ, metros: z.number() }),
})
export const AvisoCreadoZ = DomainEventEnvelopeZ.extend({
  type: z.literal('production.aviso.created'),
  payload: z.object({ linea: LineaIdZ, tipo: z.string(), operador: z.string() }),
})

export const DomainEventZ = z.discriminatedUnion('type', [
  PedidoCreadoZ, PedidoLiberadoZ, PedidoEntregadoZ,
  RecepcionRegistradaZ, EgresoConfirmadoZ,
  OPIniciadaZ, OPTerminadaZ, MermaRegistradaZ, AvisoCreadoZ,
])
export type DomainEvent = z.infer<typeof DomainEventZ>

export const EVENT_STREAM = 'mes:events'
