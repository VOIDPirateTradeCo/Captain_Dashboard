import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { readLimiter } from '@/lib/rate-limit';
import https from 'node:https';

const SHIPS = [
  { key: 'SQUIDSTATION', host: '192.168.0.39', port: 3100, protocol: 'https' },
  { key: 'STEALTHATTACK', host: '192.168.0.68', port: 3000, protocol: 'http' },
  { key: 'PINKCADY', host: '192.168.0.3', port: 3000, protocol: 'http' },
  { key: 'TORUSLAPTOP', host: '192.168.0.3', port: 3000, protocol: 'http' },
] as const

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  const { searchParams } = new URL(request.url)
  const shipParam = (searchParams.get('ship') || '').trim() || null

  const results = await Promise.allSettled(
    SHIPS.map((ship) => probeShip(ship))
  )

  const ships: Record<string, any> = {}
  for (let i = 0; i < SHIPS.length; i++) {
    const ship = SHIPS[i]
    const result = results[i]
    const entry = result.status === 'fulfilled' ? result.value : { reachable: false, latency_ms: null, last_seen: null, error: 'probe_failed' }
    ships[ship.key] = entry
  }

  const response = { status: 'ok', generated_at: Date.now(), ships }

  if (shipParam) {
    const key = Object.keys(ships).find(k => k.toUpperCase() === shipParam.toUpperCase())
    const shipData = key ? ships[key] : null
    return NextResponse.json({ status: 'ok', ship: key || shipParam, data: shipData })
  }

  return NextResponse.json(response)
}

async function probeShip(ship: { key: string; host: string; port: number; protocol: 'http' | 'https' }) {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2000)

    const response = await fetch(`${ship.protocol}://${ship.host}:${ship.port}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      // @ts-ignore-next-line
      agent: ship.protocol === 'https' ? httpsAgent : undefined,
    })

    clearTimeout(timer)

    if (!response.ok) {
      return { reachable: false, latency_ms: Date.now() - start, last_seen: Math.floor(Date.now() / 1000), status: response.status }
    }

    const data = await response.text()
    return { reachable: true, latency_ms: Date.now() - start, last_seen: Math.floor(Date.now() / 1000), status: response.status, body: data.slice(0, 200) }
  } catch (error: any) {
    return { reachable: false, latency_ms: Date.now() - start, last_seen: null, error: error?.message || 'probe_failed' }
  }
}
