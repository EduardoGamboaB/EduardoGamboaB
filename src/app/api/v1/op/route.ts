import { NextRequest } from 'next/server'
import { forward } from '../_gateway'

export const GET  = (req: NextRequest) => forward(req, 'production', '/op')
export const POST = (req: NextRequest) => forward(req, 'production', '/op')
