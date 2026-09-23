import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import { agentTaskLimiter } from '@/lib/rate-limit'

/**
 * GET /api/agent-tasks?name=sir-green
 * List tasks for a specific agent: assigned (active) + inbox (claimable).
 * Auth: x-api-key + x-agent-name (must match ?name= param).
 *
 * Query params instead of slug route — avoids Next 16 standalone [name] bug.
 */
export async function GET(request: NextRequest) {
  const apiKey = (request.headers.get('x-api-key') || '').trim()
  const agentName = (request.headers.get('x-agent-name') || '').trim()
  const urlName = (request.nextUrl.searchParams.get('name') || '').trim()

  if (!agentName) return NextResponse.json({ error: 'Missing x-agent-name header' }, { status: 401 })
  if (urlName !== agentName) return NextResponse.json({ error: 'Agent name mismatch' }, { status: 403 })

  const envKey = (process.env.API_KEY || '').trim()
  if (!envKey || apiKey !== envKey) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  // Rate limit: max 20 requests/min per agent
  const rateLimitResponse = agentTaskLimiter(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const db = getDatabase()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    let query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.tags, t.assigned_to, t.created_at, t.updated_at,
             p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id AND p.workspace_id = 1
      WHERE t.workspace_id = 1
        AND (t.assigned_to = ? OR (t.assigned_to IS NULL AND t.status = 'inbox'))
    `
    const queryParams: any[] = [agentName]

    if (status) {
      query += ' AND t.status = ?'
      queryParams.push(status)
    }

    query += ' ORDER BY t.priority ASC, t.created_at ASC LIMIT ?'
    queryParams.push(limit)

    const tasks = db.prepare(query).all(...queryParams)
    const parsed = tasks.map((t: any) => ({
      ...t,
      tags: t.tags ? JSON.parse(t.tags) : [],
    }))

    return NextResponse.json({
      agent: agentName,
      tasks: parsed,
      count: parsed.length,
      assigned: parsed.filter((t: any) => t.status === 'assigned').length,
      inbox_available: parsed.filter((t: any) => t.status === 'inbox').length,
    })
  } catch (error: any) {
    logger.error({ err: error }, 'GET /api/agent-tasks error')
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
