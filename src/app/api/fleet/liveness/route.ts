import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

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
