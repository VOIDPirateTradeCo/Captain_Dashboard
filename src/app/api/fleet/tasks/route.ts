import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, db_helpers } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/fleet/tasks
 *
 * Fleet task view across all crew agents.
 * Returns recent task assignments and agent activity.
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const db = getDatabase()
    const workspaceId = auth.user.workspace_id ?? 1

    const { searchParams } = new URL(request.url)
    const agentFilter = searchParams.get('agent')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    let query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.assigned_to, t.created_at, t.updated_at
      FROM tasks t
      WHERE t.workspace_id = ?
    `
    const params: any[] = [workspaceId]

    if (agentFilter) {
      query += ' AND t.assigned_to = ?'
      params.push(agentFilter)
    }

    query += ' ORDER BY t.created_at DESC LIMIT ?'
    params.push(limit)

    const tasks = db.prepare(query).all(...params) as any[]

    // Get agent status for each assigned agent
    const agentNames = [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))]
    const agents = db.prepare(
      'SELECT name, status, last_seen FROM agents WHERE name IN (' +
      agentNames.map(() => '?').join(',') +
      ') AND workspace_id = ?'
    ).all(...agentNames, workspaceId) as any[]

    const agentMap = new Map(agents.map(a => [a.name, a]))

    const enriched = tasks.map(task => {
      const agent = agentMap.get(task.assigned_to)
      return {
        ...task,
        agent_status: agent?.status || null,
        agent_last_seen: agent?.last_seen || null,
      }
    })

    return NextResponse.json({
      generated_at: Date.now(),
      count: enriched.length,
      tasks: enriched,
    })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/fleet/tasks error')
    return NextResponse.json({ error: 'Failed to load fleet tasks' }, { status: 500 })
  }
}
