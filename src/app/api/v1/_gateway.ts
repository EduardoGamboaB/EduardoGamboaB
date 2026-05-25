/**
 * Gateway interno — reenvía a los microservicios MES, agrega headers
 * de propagación (trace-id, user-id, role) y normaliza errores.
 */
import { NextRequest, NextResponse } from 'next/server'

export const SERVICES = {
  orders:     process.env.ORDERS_SVC_URL     ?? 'http://localhost:3001',
  inventory:  process.env.INVENTORY_SVC_URL  ?? 'http://localhost:3002',
  production: process.env.PRODUCTION_SVC_URL ?? 'http://localhost:3003',
  identity:   process.env.IDENTITY_SVC_URL   ?? 'http://localhost:3004',
  sae:        process.env.SAE_BRIDGE_URL     ?? 'http://localhost:3005',
} as const

export type ServiceName = keyof typeof SERVICES

/** Reenvía la petición tal cual al servicio destino, conservando el body y los query params. */
export async function forward(req: NextRequest, svc: ServiceName, path: string) {
  const url = new URL(req.url)
  const target = `${SERVICES[svc]}${path}${url.search}`
  const headers = new Headers(req.headers)
  // Hop-by-hop headers que no deberían reenviarse
  headers.delete('host')
  headers.delete('connection')
  // Propagación de auth (extraída del JWT decodificado por middleware)
  const userId = req.headers.get('x-user-id')
  const role = req.headers.get('x-role')
  if (userId) headers.set('x-user-id', userId)
  if (role) headers.set('x-role', role)
  // Trace id
  headers.set('x-trace-id', req.headers.get('x-trace-id') ?? crypto.randomUUID())

  let body: BodyInit | null = null
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text()
    headers.set('content-type', headers.get('content-type') ?? 'application/json')
  }

  try {
    const res = await fetch(target, { method: req.method, headers, body, cache: 'no-store' })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'service_unavailable', svc, detail: e.message },
      { status: 502 },
    )
  }
}
