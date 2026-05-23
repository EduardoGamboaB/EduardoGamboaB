import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const itemSchema = z.object({
  productoId: z.string(),
  cantidad: z.number().positive(),
  unidad: z.enum(['METRO_LINEAL', 'METRO_CUADRADO', 'KILOGRAMO', 'ROLLO', 'PIEZA']),
  precioUnitario: z.number().nonnegative().default(0),
  especificacionesItem: z.string().optional(),
})

const pedidoSchema = z.object({
  clienteId: z.string(),
  fechaCompromiso: z.string().datetime(),
  comercialId: z.string().optional(),
  notas: z.string().optional(),
  items: z.array(itemSchema).min(1),
})

export async function GET() {
  const pedidos = await db.pedido.findMany({
    orderBy: { creadoEn: 'desc' },
    include: {
      cliente: true,
      items: { include: { producto: true } },
    },
    take: 100,
  })
  return NextResponse.json(pedidos)
}

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = pedidoSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const { clienteId, fechaCompromiso, comercialId, notas, items } = parsed.data

  // Generación de folio simple: PED-YYYY-#####
  const year = new Date().getFullYear()
  const count = await db.pedido.count({
    where: { folio: { startsWith: `PED-${year}-` } },
  })
  const folio = `PED-${year}-${String(count + 1).padStart(5, '0')}`

  const total = items.reduce((a, i) => a + i.cantidad * (i.precioUnitario ?? 0), 0)

  const pedido = await db.pedido.create({
    data: {
      folio,
      clienteId,
      comercialId,
      notas,
      fechaCompromiso: new Date(fechaCompromiso),
      totalEstimado: total,
      items: {
        create: items.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
          unidad: i.unidad,
          precioUnitario: i.precioUnitario,
          especificacionesItem: i.especificacionesItem ?? '{}',
        })),
      },
    },
    include: { items: true },
  })

  return NextResponse.json(pedido, { status: 201 })
}
