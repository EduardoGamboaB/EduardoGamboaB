import { NextRequest } from 'next/server'
import { forward } from '../_gateway'

export const GET  = (req: NextRequest) => forward(req, 'inventory', '/rollos')
export const POST = (req: NextRequest) => forward(req, 'inventory', '/rollos')
