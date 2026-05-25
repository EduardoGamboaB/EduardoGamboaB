/**
 * BFF · agrega datos de orders + inventory + production en una sola respuesta
 * optimizada para el DirectorApp (4 KPIs + OEE + lista de pedidos).
 *
 * Ahorra 3 round-trips al cliente y aprovecha la red interna entre servicios.
 */
import { NextResponse } from 'next/server'
import { SERVICES } from '../../_gateway'

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return fallback
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

export async function GET() {
  const [pedidos, oee, mermas, terminados] = await Promise.all([
    safeFetch<{ items: any[]; total: number }>(`${SERVICES.orders}/pedidos?pageSize=100`, { items: [], total: 0 }),
    safeFetch<{ disponibilidad: number; rendimiento: number; calidad: number; oee: number }>(
      `${SERVICES.production}/productividad/oee`,
      { disponibilidad: 0, rendimiento: 0, calidad: 0, oee: 0 },
    ),
    safeFetch<any[]>(`${SERVICES.production}/mermas`, []),
    safeFetch<any[]>(`${SERVICES.production}/op?estado=terminada`, []),
  ])

  const items = pedidos.items ?? []
  const totalM2 = items.reduce((a, p) => a + (p.m2 ?? 0), 0)
  const pendientes = items.filter((p) => p.estado !== 'entregado').length
  const aTiempo = items.length === 0
    ? 100
    : Math.round((items.filter((p) => new Date(p.compromiso) > new Date()).length / items.length) * 100)
  const costoMerma = Math.round((Array.isArray(mermas) ? mermas : []).reduce((a, m) => a + (m.metros ?? 0) * 8, 0))

  return NextResponse.json({
    kpis: {
      m2Producidos: totalM2,
      oeePromedio: oee.oee,
      pedidosATiempo: aTiempo,
      costoMerma,
    },
    oee,
    pedidos: items,
    pendientes,
    terminados: Array.isArray(terminados) ? terminados.length : 0,
  })
}
