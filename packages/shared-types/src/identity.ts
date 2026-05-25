import { z } from 'zod'
import { TipoOperacionZ } from './production'

export const RolZ = z.enum([
  'operaciones',
  'almacen',
  'produccion',
  'montacargas',
  'operador',
  'cobranza',
  'compras',
])
export type Rol = z.infer<typeof RolZ>

/** Política MT-PC-003 § 2 — competencias por operador */
export const TipoOperadorZ = z.enum(['A', 'B', 'C', 'D'])
export type TipoOperador = z.infer<typeof TipoOperadorZ>

export const UsuarioZ = z.object({
  id: z.number().int(),
  email: z.string().email().optional(),
  name: z.string().min(1),
  role: RolZ,
  tipo: TipoOperadorZ.nullable(),
  maquinas: z.array(TipoOperacionZ),
  linea: z.string().nullable(),
  promedioMLhr: z.number().int().optional(),
  color: z.string(),
  initial: z.string().length(1),
  activo: z.boolean().default(true),
})
export type Usuario = z.infer<typeof UsuarioZ>

export const UsuarioCreateZ = UsuarioZ.omit({ id: true })

// ----- Auth
export const LoginZ = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
export type Login = z.infer<typeof LoginZ>

export const TokensZ = z.object({
  accessToken: z.string(),
  accessExpiresInSec: z.number().int(),
  refreshToken: z.string(),
  refreshExpiresInSec: z.number().int(),
  user: UsuarioZ.pick({ id: true, name: true, role: true, tipo: true, linea: true }),
})
export type Tokens = z.infer<typeof TokensZ>
