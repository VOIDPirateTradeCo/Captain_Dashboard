import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter } from '@/lib/rate-limit'
import https from 'node:https'

const SHIPS = [
  { key: 'SQUIDSTATION', host: '192.168.0.39', port: 3100, protocol: 'http' as const },
  { key: 'STEALTHATTACK', host: '192.168.0.68', port: 3000, protocol: 'http' as const },
  { key: 'STEALTHATTACK_TAILSCALE', host: '100.110.238.68', port: 3000, protocol: 'http' as const },
  { key: 'PINKCADY', host: '192.168.0.180', port: 3000, protocol: 'http' as const },
  { key: 'PINKCADY_TAILSCALE', host: '100.106.235.103', port: 3000, protocol: 'http' as const },
  { key: 'TORUSLAPTOP', host: '192.168.0.3', port: 3000, protocol: 'http' as const },
]

const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  const ships: Record<string, any> = {
    SQUIDSTATION: { reachable: true, latency_ms: 0, last_seen: Math.floor(Date.now() / 1000), status: 200, body: '{"status":"ok","db":"ok"}' },
  }

  const remoteResults = await Promise.allSettled(
    SHIPS.filter((ship) => ship.key !== 'SQUIDSTATION').map((ship) => probeShip(ship))
  )

  const remoteShips = SHIPS.filter((ship) => ship.key !== 'SQUIDSTATION')
  for (let i = 0; i < remoteShips.length; i++) {
    const ship = remoteShips[i]
    const result = remoteResults[i]
    let entry: any
    if (result.status === 'fulfilled' && result.value) {
      entry = result.value
    } else if (result.status === 'fulfilled') {
      entry = { reachable: false, latency_ms: null, last_seen: null, error: 'no_response' }
    } else {
      entry = { reachable: false, latency_ms: null, last_seen: null, error: result.reason || 'probe_failed' }
    }
    const baseKey = ship.key.replace(/_TAILSCALE$/, '').replace(/_LAN$/, '')
    ships[ship.key] = entry
    if (!ships[baseKey]) {
      ships[baseKey] = entry
    } else if (entry.reachable && !ships[baseKey].reachable) {
      ships[baseKey] = entry
    }
  }

  const response = {
    status: 'ok',
    generated_at: Date.now(),
    ships,
    mesh_summary: {
      total_endpoints: SHIPS.length,
      reachable: Object.values(ships).filter((s: any) => s.reachable).length,
      unreachable: Object.values(ships).filter((s: any) => !s.reachable).length,
    },
  }

  return NextResponse.json(response)
}

async function probeShip(ship: { key: string; host: string; port: number; protocol: 'http' | 'https' }) {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)

    const healthPaths = ['/health', '/api/health', '/']
    let response: Response | null = null
    for (const path of healthPaths) {
      try {
        response = await fetch(`${ship.protocol}://${ship.host}:${ship.port}${path}`, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          // @ts-ignore-next-line
          agent: ship.protocol === 'https' ? httpsAgent : undefined,
        })
        if (response) break
      } catch {
        response = null
      }
    }

    clearTimeout(timer)
    if (!response) {
      return { reachable: false, latency_ms: Date.now() - start, last_seen: null, error: 'no_response' }
    }

    const body = await response.text()
    return {
      reachable: response.ok,
      latency_ms: Date.now() - start,
      last_seen: Math.floor(Date.now() / 1000),
      status: response.status,
      body: body.slice(0, 200),
    }
  } catch (error: any) {
    return { reachable: false, latency_ms: Date.now() - start, last_seen: null, error: error?.message || 'probe_failed' }
  }
}
