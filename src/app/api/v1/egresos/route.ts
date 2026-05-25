import { NextRequest } from 'next/server'
import { forward } from '../_gateway'

export const POST = (req: NextRequest) => forward(req, 'inventory', '/egresos')
