import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

/**
 * WHITE WHALE bridge — classified. Kept OUT of the generic `void-proxy` route.
 *
 * `POST /api/void-whale`  body: { passphrase, threat_detected?, action? }
 *
 * - Requires MC `admin` role (not `viewer`).
 * - The passphrase is SHA-256'd server-side and forwarded to the host collector
 *   as `?passphrase_hash=…` — it never appears in a browser URL, a query string
 *   the browser sees, or any log line here.
 * - Collector: `GET http://<COLLECTOR>/api/whale?passphrase_hash=…&threat_detected=…`
 *   (dashboard_server.py `handle_whale_api`, constant-time hash compare).
 */

const COLLECTOR_BASE =
  process.env.VOID_COLLECTOR_URL?.replace(/\/+$/, '') || 'http://host.docker.internal:8080'

const TIMEOUT_MS = 5000
const MAX_BYTES = 512 * 1024

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'admin')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let payload: { passphrase?: unknown; threat_detected?: unknown; action?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 })
  }

  const passphrase = typeof payload.passphrase === 'string' ? payload.passphrase : ''
  if (!passphrase) {
    return NextResponse.json({ error: 'passphrase required' }, { status: 400 })
  }

  const passphraseHash = createHash('sha256').update(passphrase, 'utf8').digest('hex')
  const threatDetected = payload.threat_detected === false ? 'false' : 'true'
  const action = typeof payload.action === 'string' ? payload.action : ''

  const qs = new URLSearchParams({ passphrase_hash: passphraseHash, threat_detected: threatDetected })
  if (action) qs.set('action', action)
  const target = `${COLLECTOR_BASE}/api/whale?${qs.toString()}`

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
    // deliberately does NOT log the target (carries the hash)
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'void-whale collector fetch failed')
    return NextResponse.json(
      { error: aborted ? 'Collector timed out' : 'Collector unreachable' },
      { status: 502 }
    )
  }

  const buf = await res.arrayBuffer()
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Collector response too large' }, { status: 502 })
  }

  let body: unknown
  try {
    const text = new TextDecoder().decode(buf)
    body = text ? JSON.parse(text) : {}
  } catch {
    return NextResponse.json({ error: 'Collector returned non-JSON', status: res.status }, { status: 502 })
  }

  // Audit: who opened WHITE WHALE, not the secret.
  logger.info({ actor: auth.user.username, ok: res.ok }, 'void-whale access')
  return NextResponse.json(body, { status: res.ok ? 200 : res.status })
}
