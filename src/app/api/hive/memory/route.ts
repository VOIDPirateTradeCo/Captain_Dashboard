import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/hive/memory — List hive memory entries.
 * Query params: agent_name?, memory_type?, limit?, offset?
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()
    const params: any[] = []
    const where: string[] = []

    const agentName = request.nextUrl.searchParams.get('agent_name')
    const memoryType = request.nextUrl.searchParams.get('memory_type')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')

    if (agentName) {
      where.push('agent_name = ?')
      params.push(agentName)
    }
    if (memoryType) {
      where.push('memory_type = ?')
      params.push(memoryType)
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const rows = db.prepare(`
      SELECT id, agent_name, memory_type, content, importance, created_at, updated_at
      FROM hive_memory
      ${whereSql}
      ORDER BY importance DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset)

    const total = db.prepare(`SELECT COUNT(*) as c FROM hive_memory ${whereSql}`).get(...params) as { c: number }

    return NextResponse.json({ entries: rows, total: total.c, limit, offset })
  } catch (error) {
    logger.error({ err: error }, 'GET /api/hive/memory error')
    return NextResponse.json({ error: 'Failed to fetch hive memory' }, { status: 500 })
  }
}

/**
 * POST /api/hive/memory — Write a hive memory entry.
 * Body: { agent_name, memory_type, content, importance? }
 */
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const agentName = typeof body?.agent_name === 'string' ? body.agent_name.trim() : ''
  const memoryType = typeof body?.memory_type === 'string' ? body.memory_type.trim() : 'general'
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const importance = typeof body?.importance === 'number' ? body.importance : 0

  if (!agentName) return NextResponse.json({ error: 'agent_name required' }, { status: 400 })
  if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 })

  try {
    const db = getDatabase()
    const now = Math.floor(Date.now() / 1000)
    const result = db.prepare(`
      INSERT INTO hive_memory (agent_name, memory_type, content, importance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(agentName, memoryType, content, importance, now, now)

    return NextResponse.json({
      id: Number(result.lastInsertRowid),
      agent_name: agentName,
      memory_type: memoryType,
      content,
      importance,
      created_at: now,
    }, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'POST /api/hive/memory error')
    return NextResponse.json({ error: 'Failed to write memory' }, { status: 500 })
  }
}
