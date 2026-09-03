import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

const API_KEY = process.env.TWELVEDATA_API_KEY?.trim()
const BASE = 'https://api.twelvedata.com'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (!API_KEY) {
    return NextResponse.json({ error: 'Twelve Data API key not configured' }, { status: 500 })
  }

  const symbol = request.nextUrl.searchParams.get('symbol')?.trim()
  const type = request.nextUrl.searchParams.get('type')?.trim() || 'quote'
  const interval = request.nextUrl.searchParams.get('interval')?.trim() || '1min'
  const exchange = request.nextUrl.searchParams.get('exchange')?.trim() || ''

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 })
  }

  const url = new URL(`${BASE}/${type}`)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)
  url.searchParams.set('apikey', API_KEY)
  if (exchange) url.searchParams.set('exchange', exchange)
  url.searchParams.set('format', 'JSON')

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Twelve Data request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
