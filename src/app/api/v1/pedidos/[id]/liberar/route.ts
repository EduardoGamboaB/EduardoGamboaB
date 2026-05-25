import { NextRequest } from 'next/server'
import { forward } from '../../../_gateway'

export const POST = (req: NextRequest, { params }: { params: { id: string } }) =>
  forward(req, 'orders', `/pedidos/${encodeURIComponent(params.id)}/liberar`)
