import { z } from 'zod'
import { UnidadMedidaZ } from './common'

export const EstadoPedidoZ = z.enum([
  'cobranza-pendiente',
  'liberado',
  'stock-faltante',
  'compra-pendiente',
  'material-egresado',
  'en-produccion',
  'terminado',
  'entregado',
  'detenido',
  'cancelado',
])
export type EstadoPedido = z.infer<typeof EstadoPedidoZ>

export const FormaEntregaZ = z.enum([
  'ALMACEN', 'MALLATEX', 'MALLATEX envía campo', 'PAQUETERIA', 'TRES GUERRAS',
])

/** Folio Mallatex: prefijo cliente + numero (VFGC 872) o sólo dígitos (183674) */
export const FolioPedidoZ = z.string().regex(/^([A-Z][A-Z.]{1,4}\s?)?\d{1,6}$/, 'folio inválido')

export const PedidoZ = z.object({
  id: FolioPedidoZ,
  cliente: z.string().min(1),
  material: z.string().min(1),
  medida: z.string(),                              // "11.10 × 50 m"
  ancho: z.number().positive(),
  largo: z.number().positive(),
  rollos: z.number().int().positive(),
  m2: z.number().nonnegative(),
  procesos: z.array(z.string()).min(1),            // ['costura','embobinado']
  procesoActual: z.string().nullable(),
  linea: z.string().nullable(),
  operador: z.array(z.number().int()),
  meta: z.number().int().nonnegative(),
  hechas: z.number().int().nonnegative(),
  terminados: z.number().int().nonnegative(),
  entregados: z.number().int().nonnegative(),
  pendientes: z.number().int().nonnegative(),
  enPiso: z.number().int().nonnegative(),
  fechaPedido: z.string(),                         // ISO date
  compromiso: z.string(),
  formaEntrega: FormaEntregaZ,
  estado: EstadoPedidoZ,
  pagoConfirmado: z.boolean(),
  materialEgresado: z.boolean(),
  observaciones: z.string().optional(),
  subPedidos: z.array(z.string()).optional(),
})
export type Pedido = z.infer<typeof PedidoZ>

export const PedidoCreateZ = PedidoZ.omit({
  id: true,
  hechas: true, terminados: true, entregados: true, pendientes: true, enPiso: true,
  procesoActual: true, linea: true, operador: true,
  estado: true, pagoConfirmado: true, materialEgresado: true,
}).extend({
  // El folio puede venir explícito; si no, el servicio lo genera.
  id: FolioPedidoZ.optional(),
})
export type PedidoCreate = z.infer<typeof PedidoCreateZ>

export const PedidoUpdateZ = PedidoZ.partial().omit({ id: true })
export type PedidoUpdate = z.infer<typeof PedidoUpdateZ>

export const LiberarPedidoZ = z.object({
  pedidoId: FolioPedidoZ,
  responsable: z.string(),               // userId de Cobranza
  tipo: z.enum(['LIQUIDACION', 'CREDITO']),
  monto: z.number().positive().optional(),
  notas: z.string().optional(),
})
export type LiberarPedido = z.infer<typeof LiberarPedidoZ>
