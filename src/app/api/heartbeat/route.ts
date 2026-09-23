import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/heartbeat — Fleet PC heartbeat ping.
 * Called by crew_heartbeat.py daemon on each fleet PC.
 * Body: { hostname, ip, status, timestamp, tailscale_ip?, agent_version? }
 */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const hostname = typeof body?.hostname === 'string' ? body.hostname.trim() : ''
  const ip = typeof body?.ip === 'string' ? body.ip.trim() : ''
  const status = typeof body?.status === 'string' ? body.status.trim() : 'online'
  const timestamp = typeof body?.timestamp === 'number' ? body.timestamp : Math.floor(Date.now() / 1000)
  const tailscaleIp = typeof body?.tailscale_ip === 'string' ? body.tailscale_ip.trim() : null
  const agentVersion = typeof body?.agent_version === 'string' ? body.agent_version.trim() : null

  if (!hostname) {
    return NextResponse.json({ error: 'hostname required' }, { status: 400 })
  }

  try {
    const db = getDatabase()
    const now = Math.floor(Date.now() / 1000)

    const existing = db.prepare('SELECT id FROM fleet_heartbeat WHERE hostname = ?').get(hostname)
    if (existing) {
      db.prepare(`
        UPDATE fleet_heartbeat 
        SET ip = ?, status = ?, last_seen = ?, timestamp = ?, tailscale_ip = ?, agent_version = ?, updated_at = ?
        WHERE hostname = ?
      `).run(ip, status, now, timestamp, tailscaleIp, agentVersion, now, hostname)
    } else {
      db.prepare(`
        INSERT INTO fleet_heartbeat (hostname, ip, status, first_seen, last_seen, timestamp, tailscale_ip, agent_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(hostname, ip, status, now, now, timestamp, tailscaleIp, agentVersion, now, now)
    }

    return NextResponse.json({ ok: true, hostname, received_at: now })
  } catch (error) {
    logger.error({ err: error }, 'POST /api/heartbeat error')
    return NextResponse.json({ error: 'Heartbeat failed' }, { status: 500 })
  }
}

/**
 * GET /api/fleet/liveness — Fleet PC online/offline status.
 * Public endpoint (no auth) so status can be checked without login.
 */
export async function GET(_request: NextRequest) {
  try {
    const db = getDatabase()
    const now = Math.floor(Date.now() / 1000)
    const STALE_THRESHOLD = 120

    const rows = db.prepare(`
      SELECT hostname, ip, status, first_seen, last_seen, timestamp, tailscale_ip, agent_version, updated_at
      FROM fleet_heartbeat
      ORDER BY last_seen DESC
    `).all() as any[]

    const pcs = rows.map((row: any) => {
      const secondsAgo = now - row.last_seen
      const computedStatus = secondsAgo < STALE_THRESHOLD ? 'online' : 'stale'
      return {
        hostname: row.hostname,
        ip: row.ip,
        tailscale_ip: row.tailscale_ip,
        agent_version: row.agent_version,
        last_seen: row.last_seen,
        seconds_ago: secondsAgo,
        status: row.status === 'offline' ? 'offline' : computedStatus,
      }
    })

    return NextResponse.json({
      pcs,
      total: pcs.length,
      online: pcs.filter((p: any) => p.status === 'online').length,
      stale: pcs.filter((p: any) => p.status === 'stale').length,
      generated_at: now,
    })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/fleet/liveness error')
    return NextResponse.json({ error: 'Failed to fetch liveness' }, { status: 500 })
  }
}
