import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Client-side error logging endpoint.
 * Called by ErrorBoundary when a React component throws.
 * Logs the error server-side for observability.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const { message, stack, componentStack, timestamp, url } = body

    logger.error({
      type: 'client_error',
      message,
      stack,
      componentStack,
      timestamp: timestamp || new Date().toISOString(),
      url: url || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    }, 'Client-side React error')

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error({ err }, 'Failed to log client error')
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
