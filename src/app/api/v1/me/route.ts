import { NextRequest } from 'next/server'
import { forward } from '../_gateway'

export const GET = (req: NextRequest) => forward(req, 'identity', '/me')
