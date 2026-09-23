import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, db_helpers } from '@/lib/db'
import { eventBus } from '@/lib/event-bus'
import { logger } from '@/lib/logger'
import { agentTaskLimiter } from '@/lib/rate-limit'

function authenticateAgent(request: NextRequest): { ok: true; agentName: string } | { ok: false; error: string; status: number } {
  const apiKey = (request.headers.get('x-api-key') || '').trim()
  const agentName = (request.headers.get('x-agent-name') || '').trim()
  if (!agentName) return { ok: false, error: 'Missing x-agent-name header', status: 401 }
  const envKey = (process.env.API_KEY || '').trim()
  if (!envKey || apiKey !== envKey) {
    return { ok: false, error: 'Invalid API key', status: 401 }
  }
  return { ok: true, agentName }
}

/**
 * POST /api/tasks/[id]/claim
 * Claim an inbox task (or one assigned to this agent). Moves inbox → assigned.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = authenticateAgent(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  // Rate limit: max 20 requests/min per agent
  const rateLimitResponse = agentTaskLimiter(request)
  if (rateLimitResponse) return rateLimitResponse

  const { agentName } = auth

  try {
    const db = getDatabase()
    const resolvedParams = await params
    const taskId = parseInt(resolvedParams.id)
    if (isNaN(taskId)) return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })

    // Find task — either unassigned in inbox, or assigned to this agent
    const task = db.prepare(`
      SELECT id, status, assigned_to, title, workspace_id
      FROM tasks
      WHERE id = ? AND status IN ('inbox', 'assigned')
    `).get(taskId) as { id: number; status: string; assigned_to: string | null; title: string; workspace_id: number } | undefined

    if (!task) {
      return NextResponse.json({ error: 'Task not found or not claimable' }, { status: 404 })
    }
    if (task.assigned_to && task.assigned_to !== agentName) {
      return NextResponse.json({ error: `Task already assigned to ${task.assigned_to}` }, { status: 403 })
    }

    const now = Math.floor(Date.now() / 1000)

    // Atomic claim: only flip if still unassigned or assigned to us
    const claim = db.prepare(`
      UPDATE tasks SET status = 'assigned', assigned_to = ?, updated_at = ?
      WHERE id = ? AND (assigned_to IS NULL OR assigned_to = ?) AND status IN ('inbox', 'assigned')
    `).run(agentName, now, taskId, agentName)

    if (claim.changes === 0) {
      return NextResponse.json({ error: 'Task was claimed by another agent' }, { status: 409 })
    }

    db_helpers.logActivity('task_claimed', 'task', taskId, agentName,
      `Agent "${agentName}" claimed task "${task.title}"`,
      { agent: agentName, previous_status: task.status },
      task.workspace_id)

    eventBus.broadcast('task.status_changed', {
      id: taskId, status: 'assigned', assigned_to: agentName,
      previous_status: task.status, workspace_id: task.workspace_id
    })

    logger.info({ taskId, agent: agentName }, 'task claimed by agent')
    return NextResponse.json({ ok: true, task_id: taskId, status: 'assigned', assigned_to: agentName })
  } catch (error: any) {
    logger.error({ err: error }, 'POST /api/tasks/[id]/claim error')
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
  }
}
