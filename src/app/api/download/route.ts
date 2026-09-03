import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'unknown'

  return NextResponse.json({
    status: 'ok',
    type,
    message: 'Download endpoint ready',
    timestamp: Date.now()
  })
}
