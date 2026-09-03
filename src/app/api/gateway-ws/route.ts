import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // If this is a WebSocket upgrade request, the browser is trying to connect
  // through the MC proxy path. We can't actually handle WS in a route handler,
  // so return the direct localhost URL and let the browser connect directly.
  const { searchParams } = new URL(request.url)
  const targetPath = searchParams.get('path') || '/'

  // Return the direct localhost gateway URL — the browser is on the same host
  // as the MC container, so it can reach 127.0.0.1 directly.
  return NextResponse.json({
    wsUrl: `ws://127.0.0.1:${config.gatewayPort}${targetPath}`,
    gatewayHost: config.gatewayHost,
    gatewayPort: config.gatewayPort,
    note: 'Connect directly to localhost gateway.',
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
