import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/fleet/security
 *
 * Fleet security posture summary.
 * For now this aggregates agent status and metadata.
 * Crew machines will later POST live security telemetry.
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

    const security = agents.map((agent) => {
      const config = agent.config ? JSON.parse(agent.config) : {}
      return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        last_seen: agent.last_seen,
        ship: config.ship || null,
        framework: config.framework || null,
        security: config.security || null,
      }
    })

    return NextResponse.json({
      generated_at: Date.now(),
      count: security.length,
      security,
    })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/fleet/security error')
    return NextResponse.json({ error: 'Failed to load fleet security' }, { status: 500 })
  }
}
