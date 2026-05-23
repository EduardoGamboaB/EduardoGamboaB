import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

const registroSchema = z.object({
  ordenId: z.string(),
  operarioId: z.string(),
  maquinaId: z.string().optional(),
  turno: z.enum(['MATUTINO', 'VESPERTINO', 'NOCTURNO']),
  inicio: z.string().datetime(),
  fin: z.string().datetime().optional(),
  cantidadOk: z.number().nonnegative(),
  cantidadMerma: z.number().nonnegative().default(0),
  notas: z.string().optional(),
})

export async function POST(req: Request) {
  const json = await req.json()
  const parsed = registroSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const data = parsed.data
  const registro = await db.registroProduccion.create({
    data: {
      ordenId: data.ordenId,
      operarioId: data.operarioId,
      maquinaId: data.maquinaId,
      turno: data.turno,
      inicio: new Date(data.inicio),
      fin: data.fin ? new Date(data.fin) : null,
      cantidadOk: data.cantidadOk,
      cantidadMerma: data.cantidadMerma,
      notas: data.notas,
    },
  })

  // Si la orden está vinculada a un pedido, suma producción al item correspondiente
  const orden = await db.ordenProduccion.findUnique({
    where: { id: data.ordenId },
    select: { pedidoId: true, productoId: true },
  })
  if (orden?.pedidoId) {
    const item = await db.itemPedido.findFirst({
      where: { pedidoId: orden.pedidoId, productoId: orden.productoId },
    })
    if (item) {
      await db.itemPedido.update({
        where: { id: item.id },
        data: { cantidadProducida: { increment: data.cantidadOk } },
      })
    }
  }

  return NextResponse.json(registro, { status: 201 })
}
