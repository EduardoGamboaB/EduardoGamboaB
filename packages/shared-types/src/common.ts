import { z } from 'zod'

export const UnidadMedidaZ = z.enum(['METRO_LINEAL', 'METRO_CUADRADO', 'KILOGRAMO', 'ROLLO', 'PIEZA'])
export type UnidadMedida = z.infer<typeof UnidadMedidaZ>

export const TurnoZ = z.enum(['MATUTINO', 'VESPERTINO', 'NOCTURNO'])
export type Turno = z.infer<typeof TurnoZ>

export const PaginationQ = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type Pagination = z.infer<typeof PaginationQ>

export const ApiError = z.object({
  error: z.string(),
  details: z.unknown().optional(),
  traceId: z.string().optional(),
})
export type ApiError = z.infer<typeof ApiError>
