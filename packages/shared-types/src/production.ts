import { z } from 'zod'
import { TurnoZ } from './common'
import { FolioPedidoZ } from './orders'

export const TipoOperacionZ = z.enum([
  'corte', 'perforacion', 'costura', 'embobinado',
])
export type TipoOperacion = z.infer<typeof TipoOperacionZ>

export const LineaIdZ = z.enum(['LC1', 'LC2', 'LC3', 'LC4', 'LK', 'LP', 'LE'])
export type LineaId = z.infer<typeof LineaIdZ>

export const EstadoOPZ = z.enum(['pendiente', 'en-proceso', 'pausada', 'terminada', 'cancelada'])
export type EstadoOP = z.infer<typeof EstadoOPZ>

/** Una OP (orden de producción) es un slice de un pedido sobre una línea concreta */
export const OrdenProduccionZ = z.object({
  id: z.string(),                          // OP-2026-00131
  pedidoId: FolioPedidoZ,
  productoMaterial: z.string(),            // texto descriptivo del producto
  linea: LineaIdZ,
  operadorIds: z.array(z.number().int()),
  meta: z.number().positive(),             // unidades planeadas
  hechas: z.number().nonnegative(),
  procesoActual: TipoOperacionZ,
  estado: EstadoOPZ,
  fechaPlan: z.string(),                   // ISO date
  fechaInicio: z.string().nullable(),
  fechaFin: z.string().nullable(),
})
export type OrdenProduccion = z.infer<typeof OrdenProduccionZ>

export const CategoriaMermaZ = z.enum(['sobrante', 'defecto', 'desperdicio'])
export type CategoriaMerma = z.infer<typeof CategoriaMermaZ>

export const DefectoMermaZ = z.enum([
  'corte-mal', 'quemado', 'perforado', 'rollo-defectuoso', 'falla-equipo', 'otro',
])
export type DefectoMerma = z.infer<typeof DefectoMermaZ>

export const MermaZ = z.object({
  id: z.number().int(),
  fecha: z.string(),
  operador: z.string(),
  linea: LineaIdZ,
  material: z.string(),
  metros: z.number().positive(),
  categoria: CategoriaMermaZ,
  defecto: DefectoMermaZ.optional(),
  pedido: FolioPedidoZ,
  evidenciaUrl: z.string().url().optional(),
})
export type Merma = z.infer<typeof MermaZ>

export const MermaCreateZ = MermaZ.omit({ id: true, fecha: true }).extend({
  fecha: z.string().optional(),
})

export const AvisoZ = z.object({
  id: z.number().int(),
  hora: z.string(),                        // "09:14"
  linea: LineaIdZ,
  operador: z.string(),
  tipo: z.enum(['falla', 'sin-material', 'sin-hilo', 'sin-luz', 'montacargas', 'comida', 'bano', 'otro']),
  desc: z.string(),
  tiempo: z.string(),                       // "14:32" (duración mm:ss)
  estado: z.enum(['urgente', 'revisar', 'resuelto']),
})
export type Aviso = z.infer<typeof AvisoZ>

export const ProductividadTurnoZ = z.object({
  fecha: z.string(),
  linea: LineaIdZ,
  operador: z.string(),
  horaInicio: z.string(),
  horaFinal: z.string(),
  imprevistos: z.number().int().nonnegative(),
  tiempoEfectivo: z.number().int().nonnegative(),
  mLTurno: z.number().nonnegative(),
  piezasTurno: z.number().int().nonnegative(),
  descripcion: z.string(),
})
export type ProductividadTurno = z.infer<typeof ProductividadTurnoZ>

export const ProductoTerminadoZ = z.object({
  id: z.string(),                          // PT-VFGC886-01
  pedido: FolioPedidoZ,
  material: z.string(),
  medida: z.string(),
  rollos: z.number().int().positive(),
  pesoTeorico: z.number().positive(),
  pesoReal: z.number().positive(),
  fecha: z.string(),
  hora: z.string(),
  verificado: z.boolean(),
  responsable: z.string(),
})
export type ProductoTerminado = z.infer<typeof ProductoTerminadoZ>

/** Métricas OEE de un periodo */
export const OEEZ = z.object({
  disponibilidad: z.number().min(0).max(100),
  rendimiento: z.number().min(0).max(100),
  calidad: z.number().min(0).max(100),
  oee: z.number().min(0).max(100),         // disponibilidad × rendimiento × calidad
})
export type OEE = z.infer<typeof OEEZ>

export { TurnoZ as TurnoSchema }
