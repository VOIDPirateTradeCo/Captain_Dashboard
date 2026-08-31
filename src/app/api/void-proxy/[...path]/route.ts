import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

/**
 * VOID host-collector proxy.
 *
 * MC runs in a container with no host FS/docker/tailscale access. The Pirate
 * Captain's Dashboard collectors (dashboard_server.py, bound 0.0.0.0:8080 on the
 * host) provide that data as JSON. This route is the single, allow-listed bridge
 * VOID panels use to reach them.
 *
 * GET /api/void-proxy/<name>[/<sub>...]  →  http://<COLLECTOR>/api/<name>[/<sub>]
 *
 * - `viewer` role required (session cookie; same as other read routes).
 * - Only paths whose first segment is in ALLOW pass; everything else is 404.
 * - GET only, 4s timeout, response body capped, always JSON.
 * - host.docker.internal is already mapped via `extra_hosts` in the base
 *   docker-compose.yml — no compose change needed.
 */

const COLLECTOR_BASE =
  process.env.VOID_COLLECTOR_URL?.replace(/\/+$/, '') || 'http://host.docker.internal:8080'

// First path segment allow-list. Extend as VOID panels need more collectors.
const ALLOW = new Set([
  'status',
  'fleet',
  'fleet_mesh',
  'ships',
  'pinkcady',
  'hw',
  'monitor',
  'monitoring',
  'vault',
  'opsec',
  'scanner',
  'security',
  'comms',
  'crew',
  'crew_heartbeat',
  'dataview',
  'containers',
  'traffic',
])

const TIMEOUT_MS = 4000
const MAX_BYTES = 512 * 1024

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { path } = await params
  const segments = (path || []).filter(s => s && s !== '..' && !s.includes('/'))
  if (segments.length === 0 || !ALLOW.has(segments[0])) {
    return NextResponse.json({ error: 'Unknown or disallowed collector path' }, { status: 404 })
  }

  const target = `${COLLECTOR_BASE}/api/${segments.join('/')}`

  let res: Response
  try {
    res = await fetch(target, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'TimeoutError'
    logger.warn({ target, err: err instanceof Error ? err.message : String(err) }, 'void-proxy fetch failed')
    return NextResponse.json(
      { error: aborted ? 'Collector timed out' : 'Collector unreachable', target },
      { status: 502 }
    )
  }

  const buf = await res.arrayBuffer()
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Collector response too large' }, { status: 502 })
  }

  const text = new TextDecoder().decode(buf)
  let body: unknown
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    return NextResponse.json({ error: 'Collector returned non-JSON', status: res.status }, { status: 502 })
  }

  return NextResponse.json(body, { status: res.ok ? 200 : res.status })
}
