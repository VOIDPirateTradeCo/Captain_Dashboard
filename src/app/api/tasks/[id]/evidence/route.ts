import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, db_helpers } from '@/lib/db'
import { eventBus } from '@/lib/event-bus'
import { logger } from '@/lib/logger'
import { resolveMentionRecipients } from '@/lib/mentions'
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
 * POST /api/tasks/[id]/evidence
 * Post evidence (comment) to a task. Only the assigned agent or admin can post.
 * Body: { content: string }
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
    const content = (body.content || '').trim()
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 })
    if (content.length > 100_000) return NextResponse.json({ error: 'Content exceeds 100KB limit' }, { status: 400 })

    // Verify task is assigned to this agent
    const task = db.prepare(`
      SELECT id, assigned_to, title, workspace_id
      FROM tasks WHERE id = ? AND status = 'assigned'
    `).get(taskId) as { id: number; assigned_to: string | null; title: string; workspace_id: number } | undefined

    if (!task) return NextResponse.json({ error: 'Task not found or not assigned' }, { status: 404 })
    if (task.assigned_to !== agentName) return NextResponse.json({ error: 'Not assigned to this agent' }, { status: 403 })

    const now = Math.floor(Date.now() / 1000)

    // Insert comment
    const result = db.prepare(`
      INSERT INTO comments (task_id, author, content, created_at, workspace_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(taskId, agentName, content, now, task.workspace_id)

    db_helpers.logActivity('task_evidence_posted', 'task', taskId, agentName,
      `Evidence posted by ${agentName}`,
      { agent: agentName, comment_id: result.lastInsertRowid },
      task.workspace_id)

    eventBus.broadcast('task.updated', {
      task_id: taskId, author: agentName, content, workspace_id: task.workspace_id
    })

    logger.info({ taskId, agent: agentName }, 'evidence posted')
    return NextResponse.json({ ok: true, comment_id: result.lastInsertRowid, task_id: taskId })
  } catch (error: any) {
    logger.error({ err: error }, 'POST /api/tasks/[id]/evidence error')
    return NextResponse.json({ error: 'Post evidence failed' }, { status: 500 })
  }
}
