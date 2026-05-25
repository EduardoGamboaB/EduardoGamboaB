import { z } from 'zod'
import { FolioPedidoZ } from './orders'

export const EstadoRolloZ = z.enum(['almacen', 'reservado', 'en-linea', 'faltante'])
export type EstadoRollo = z.infer<typeof EstadoRolloZ>

export const RolloZ = z.object({
  id: z.string().regex(/^R-\d{5,}$/),               // R-04563
  material: z.string(),
  medida: z.string(),                                // "1.80 × 500"
  lote: z.string(),                                  // 4653
  peso: z.number().nonnegative(),
  ubicacion: z.string(),                             // "A-3-12"
  pedido: FolioPedidoZ.nullable(),
  estado: EstadoRolloZ,
  empezado: z.boolean(),                             // true → priorizar uso (MT-PC-002 política)
})
export type Rollo = z.infer<typeof RolloZ>

export const RecepcionZ = z.object({
  id: z.string(),                                    // REC-2026-0142
  fecha: z.string(),
  proveedor: z.string(),
  packingList: z.string(),
  factura: z.string(),
  rollos: z.number().int().positive(),
  pesoTotal: z.number().positive(),
  muestreoOK: z.boolean(),                           // resultado MT-PC-001 act. 13-19
  ingresadoSAE: z.boolean(),                         // máx 1 día hábil
  responsable: z.string(),
  incidencia: z.string().optional(),                 // si muestreoOK = false
})
export type Recepcion = z.infer<typeof RecepcionZ>

export const RecepcionCreateZ = RecepcionZ.omit({ id: true, ingresadoSAE: true }).partial({
  incidencia: true,
})

export const EgresoZ = z.object({
  id: z.string(),                                    // EGR-2026-0298
  fecha: z.string(),
  pedido: FolioPedidoZ,
  material: z.string(),
  rollos: z.number().int().positive(),
  m2: z.number().nonnegative(),
  empezadosUsados: z.number().int().nonnegative(),  // política: priorizar empezados
  responsableAlmacen: z.string(),
  responsableProd: z.string(),
  confirmado: z.boolean(),
})
export type Egreso = z.infer<typeof EgresoZ>

export const EgresoCreateZ = EgresoZ.omit({ id: true, confirmado: true })

export const RetornoZ = z.object({
  fecha: z.string(),
  pedido: FolioPedidoZ,
  material: z.string(),
  cantidadM: z.number().positive(),
  empezado: z.boolean(),
  responsable: z.string(),
})
export type Retorno = z.infer<typeof RetornoZ>
