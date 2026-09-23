import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const db = getDatabase();
    const workspaceId = auth.user.workspace_id ?? 1;

    const fleet = db.prepare(`
      SELECT 
        a.id as agent_id,
        a.name as agent_name,
        a.status as agent_status,
        a.runtime_type,
        COUNT(t.id) as active_tasks
      FROM agents a
      LEFT JOIN tasks t ON t.assigned_to = a.id AND t.status NOT IN ('done', 'archived')
      WHERE a.workspace_id = ?
      GROUP BY a.id
      ORDER BY active_tasks DESC
    `).all(workspaceId);

    const totalOnline = db.prepare(`
      SELECT COUNT(*) as count FROM agents WHERE workspace_id = ? AND status != 'offline'
    `).get(workspaceId) as { count: number };

    return NextResponse.json({
      fleet,
      total_online: totalOnline.count,
      total_agents: (fleet as any[]).length,
      workspace_id: workspaceId
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/fleet error');
    return NextResponse.json({ error: 'Failed to fetch fleet data' }, { status: 500 });
  }
}
