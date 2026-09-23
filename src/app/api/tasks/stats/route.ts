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

    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM tasks
      WHERE workspace_id = ?
      GROUP BY status
      ORDER BY count DESC
    `).all(workspaceId) as { status: string; count: number }[];

    const priorityCounts = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      WHERE workspace_id = ?
      GROUP BY priority
      ORDER BY count DESC
    `).all(workspaceId) as { priority: string; count: number }[];

    const totalTasks = db.prepare('SELECT COUNT(*) as total FROM tasks WHERE workspace_id = ?').get(workspaceId) as { total: number };

    const completedToday = db.prepare(`
      SELECT COUNT(*) as count FROM tasks
      WHERE workspace_id = ? AND status = 'done'
      AND completed_at > strftime('%s', 'now', '-24 hours')
    `).get(workspaceId) as { count: number };

    return NextResponse.json({
      byStatus: statusCounts,
      byPriority: priorityCounts,
      total: totalTasks.total,
      completedLast24h: completedToday.count
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/tasks/stats error');
    return NextResponse.json({ error: 'Failed to fetch task stats' }, { status: 500 });
  }
}
