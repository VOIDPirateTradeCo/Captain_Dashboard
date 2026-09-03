import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/fleet/storage
 *
 * Fleet network storage view.
 * Current source of truth:
 * - Crew agent metadata in agents.config for mapped shares / paths
 *
 * Crew machines will later POST live telemetry; this endpoint
 * will merge live SMB/Tailscale share health with MC state.
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = getDatabase()
    const workspaceId = auth.user.workspace_id ?? 1

    const agents = db.prepare(
      'SELECT id, name, status, last_seen, config FROM agents WHERE workspace_id = ? AND hidden = 0',
    ).all(workspaceId) as any[]

    const storage = agents.map((agent) => {
      const config = agent.config ? JSON.parse(agent.config) : {}
      const shares = Array.isArray(config.shares) ? config.shares : []
      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        last_seen: agent.last_seen,
        ship: config.ship || null,
        shares,
      }
    })

    return NextResponse.json({
      generated_at: Date.now(),
      count: storage.length,
      storage,
    })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/fleet/storage error')
    return NextResponse.json({ error: 'Failed to load fleet storage' }, { status: 500 })
  }
}
