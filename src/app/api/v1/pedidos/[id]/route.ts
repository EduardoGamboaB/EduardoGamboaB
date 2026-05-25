import { NextRequest } from 'next/server'
import { forward } from '../../_gateway'

export const GET   = (req: NextRequest, { params }: { params: { id: string } }) =>
  forward(req, 'orders', `/pedidos/${encodeURIComponent(params.id)}`)
export const PATCH = (req: NextRequest, { params }: { params: { id: string } }) =>
  forward(req, 'orders', `/pedidos/${encodeURIComponent(params.id)}`)
