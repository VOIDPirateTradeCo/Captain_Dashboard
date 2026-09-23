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
  if (!envKey || apiKey !== envKey) return { ok: false, error: 'Invalid API key', status: 401 }
  return { ok: true, agentName }
}

/**
 * POST /api/tasks/[id]/complete
 * Complete a task. Moves assigned → done.
 * Body: { outcome?: string, resolution?: string }
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

    let body: any = {}
    try { body = await request.json() } catch { /* empty body allowed */ }
    const outcome = body.outcome || 'completed'
    const resolution = body.resolution || null

    // Verify task is assigned to this agent
    const task = db.prepare(`
      SELECT id, assigned_to, title, workspace_id, status
      FROM tasks WHERE id = ? AND status = 'assigned'
    `).get(taskId) as { id: number; assigned_to: string | null; title: string; workspace_id: number; status: string } | undefined

    if (!task) return NextResponse.json({ error: 'Task not found or not assigned' }, { status: 404 })
    if (task.assigned_to !== agentName) return NextResponse.json({ error: 'Not assigned to this agent' }, { status: 403 })

    const now = Math.floor(Date.now() / 1000)

    db.prepare(`
      UPDATE tasks SET status = 'done', updated_at = ?, completed_at = ?, outcome = ?, resolution = ?
      WHERE id = ? AND assigned_to = ? AND status = 'assigned'
    `).run(now, now, outcome, resolution, taskId, agentName)

    // Verify the update actually happened
    const updated = db.prepare(`SELECT id FROM tasks WHERE id = ? AND status = 'done' AND assigned_to = ?`).get(taskId, agentName)
    if (!updated) return NextResponse.json({ error: 'Task not found, not assigned, or already completed' }, { status: 404 })

    db_helpers.logActivity('task_completed', 'task', taskId, agentName,
      `Task "${task.title}" completed by ${agentName}`,
      { agent: agentName, outcome, resolution },
      task.workspace_id)

    eventBus.broadcast('task.status_changed', {
      id: taskId, status: 'done', previous_status: 'assigned',
      assigned_to: agentName, workspace_id: task.workspace_id
    })

    logger.info({ taskId, agent: agentName, outcome }, 'task completed')
    return NextResponse.json({ ok: true, task_id: taskId, status: 'done' })
  } catch (error: any) {
    logger.error({ err: error }, 'POST /api/tasks/[id]/complete error')
    return NextResponse.json({ error: 'Complete failed' }, { status: 500 })
  }
}
