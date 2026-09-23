import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const workspaceId = auth.user.workspace_id ?? 1;

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM agents
      WHERE workspace_id = ?
      GROUP BY status
      ORDER BY count DESC
    `).all(workspaceId) as { status: string; count: number }[];

    const byRuntime = db.prepare(`
      SELECT runtime_type, COUNT(*) as count
      FROM agents
      WHERE workspace_id = ?
      GROUP BY runtime_type
      ORDER BY runtime_type
    `).all(workspaceId) as { runtime_type: string; count: number }[];

    const totalAgents = db.prepare('SELECT COUNT(*) as total FROM agents WHERE workspace_id = ?').get(workspaceId) as { total: number };

    const topAssignees = db.prepare(`
      SELECT a.name as agent_name, a.id as agent_id, COUNT(t.id) as task_count
      FROM agents a
      LEFT JOIN tasks t ON t.assigned_to = a.id AND t.status != 'done'
      WHERE a.workspace_id = ?
      GROUP BY a.id
      ORDER BY task_count DESC
      LIMIT 10
    `).all(workspaceId) as { agent_name: string; agent_id: string; task_count: number }[];

    return NextResponse.json({
      byStatus,
      byRuntime,
      total: totalAgents.total,
      topAssignees
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/agents/stats error');
    return NextResponse.json({ error: 'Failed to fetch agent stats' }, { status: 500 });
  }
}
