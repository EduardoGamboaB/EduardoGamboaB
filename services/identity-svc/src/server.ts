/**
 * identity-svc · Usuarios, roles (Mallatex), competencias A/B/C/D, JWT.
 *
 * Endpoints:
 *   POST   /auth/login                · email+pwd → access (15m) + refresh (7d)
 *   POST   /auth/refresh              · rotate refresh → nuevo par
 *   POST   /auth/logout               · revoca refresh
 *   GET    /me                        · payload del JWT
 *   GET    /usuarios                  · lista con filtros (role, tipo, linea)
 *   POST   /usuarios                  · alta
 *   PATCH  /usuarios/:id              · update parcial (cambio de tipo, línea, etc.)
 *   GET    /usuarios/:id/competencias · MT-PC-003 § 2 — qué máquinas puede operar
 */
import cors from '@fastify/cors'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { buildServer } from '../../_shared/server'
import { LoginZ, UsuarioCreateZ } from '@mallatex/shared-types'
import { PrismaClient } from '../prisma/generated/client'

const db = new PrismaClient()
const app = buildServer('identity-svc')
await app.register(cors, { origin: true })

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-cambiar')
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-cambiar')
const ACCESS_TTL = 15 * 60                  // 15 min
const REFRESH_TTL = 7 * 24 * 60 * 60        // 7 días

app.get('/ready', async () => {
  await db.$queryRaw`SELECT 1`
  return { ready: true, svc: 'identity-svc', db: 'ok' }
})

async function issueTokens(user: { id: number; name: string; role: string; tipo: string | null; linea: string | null }) {
  const access = await new SignJWT({ sub: String(user.id), name: user.name, role: user.role, tipo: user.tipo, linea: user.linea })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(ACCESS_SECRET)

  const refreshPayload = await new SignJWT({ sub: String(user.id) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TTL}s`)
    .sign(REFRESH_SECRET)

  const tokenHash = await bcrypt.hash(refreshPayload, 8)
  await db.refreshToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + REFRESH_TTL * 1000) } })

  return {
    accessToken: access,
    accessExpiresInSec: ACCESS_TTL,
    refreshToken: refreshPayload,
    refreshExpiresInSec: REFRESH_TTL,
    user: { id: user.id, name: user.name, role: user.role, tipo: user.tipo, linea: user.linea },
  }
}

// ---------- AUTH ----------
app.post('/auth/login', async (req, reply) => {
  const { email, password } = LoginZ.parse(req.body)
  const u = await db.usuario.findFirst({ where: { email, activo: true } })
  if (!u || !u.passwordHash) return reply.status(401).send({ error: 'invalid_credentials' })
  const ok = await bcrypt.compare(password, u.passwordHash)
  if (!ok) return reply.status(401).send({ error: 'invalid_credentials' })

  await db.auditLog.create({ data: { userId: u.id, action: 'login', ip: req.ip } })
  return issueTokens({ id: u.id, name: u.name, role: u.role, tipo: u.tipo, linea: u.linea })
})

app.post('/auth/refresh', async (req, reply) => {
  const { refreshToken } = req.body as { refreshToken: string }
  try {
    const { payload } = await jwtVerify(refreshToken, REFRESH_SECRET)
    const userId = parseInt(String(payload.sub), 10)
    const tokens = await db.refreshToken.findMany({ where: { userId, revokedAt: null } })
    let match = null
    for (const t of tokens) if (await bcrypt.compare(refreshToken, t.tokenHash)) match = t
    if (!match) return reply.status(401).send({ error: 'invalid_refresh' })

    // Rotación: revoca el anterior, emite uno nuevo
    await db.refreshToken.update({ where: { id: match.id }, data: { revokedAt: new Date() } })
    const u = await db.usuario.findUnique({ where: { id: userId } })
    if (!u) return reply.status(401).send({ error: 'user_not_found' })
    return issueTokens({ id: u.id, name: u.name, role: u.role, tipo: u.tipo, linea: u.linea })
  } catch {
    return reply.status(401).send({ error: 'invalid_refresh' })
  }
})

app.post('/auth/logout', async (req) => {
  const { refreshToken } = req.body as { refreshToken: string }
  const tokens = await db.refreshToken.findMany({ where: { revokedAt: null } })
  for (const t of tokens) {
    if (await bcrypt.compare(refreshToken, t.tokenHash)) {
      await db.refreshToken.update({ where: { id: t.id }, data: { revokedAt: new Date() } })
      break
    }
  }
  return { ok: true }
})

app.get('/me', async (req, reply) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ error: 'no_token' })
  try {
    const { payload } = await jwtVerify(auth.slice(7), ACCESS_SECRET)
    return payload
  } catch {
    return reply.status(401).send({ error: 'invalid_token' })
  }
})

// ---------- USUARIOS ----------
app.get('/usuarios', async (req) => {
  const q = req.query as { role?: string; tipo?: string; linea?: string }
  const where: any = { activo: true }
  if (q.role) where.role = q.role
  if (q.tipo) where.tipo = q.tipo
  if (q.linea) where.linea = q.linea
  return db.usuario.findMany({ where, orderBy: { name: 'asc' } })
})

app.post('/usuarios', async (req) => {
  const parsed = UsuarioCreateZ.parse(req.body)
  return db.usuario.create({ data: parsed as any })
})

app.patch('/usuarios/:id', async (req) => {
  const { id } = req.params as { id: string }
  return db.usuario.update({ where: { id: parseInt(id, 10) }, data: req.body as any })
})

app.get('/usuarios/:id/competencias', async (req, reply) => {
  const { id } = req.params as { id: string }
  const u = await db.usuario.findUnique({ where: { id: parseInt(id, 10) } })
  if (!u) return reply.status(404).send({ error: 'user_not_found' })
  const max = { A: 1, B: 2, C: 3, D: 4 }[u.tipo ?? 'A'] ?? 0
  return { tipo: u.tipo, maquinas: u.maquinas, capacidad: max }
})

const port = parseInt(process.env.PORT ?? '3004', 10)
await app.listen({ port, host: '0.0.0.0' })
app.log.info(`identity-svc escuchando en :${port}`)
