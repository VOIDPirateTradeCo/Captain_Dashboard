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

    const taskStats = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks WHERE workspace_id = ? GROUP BY status
    `).all(workspaceId) as { status: string; count: number }[];

    const agentStats = db.prepare(`
      SELECT status, COUNT(*) as count FROM agents WHERE workspace_id = ? GROUP BY status
    `).all(workspaceId) as { status: string; count: number }[];

    const recentActivities = db.prepare(`
      SELECT * FROM activities WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(workspaceId);

    return NextResponse.json({
      tasks: taskStats,
      agents: agentStats,
      recentActivities,
      workspace_id: workspaceId,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/dashboard error');
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
