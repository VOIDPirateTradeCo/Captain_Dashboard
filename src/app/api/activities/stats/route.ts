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

    const hours = parseInt(searchParams.get('hours') || '24');
    const since = Math.floor(Date.now() / 1000) - (hours * 3600);

    const activityStats = db.prepare(`
      SELECT type, COUNT(*) as count
      FROM activities
      WHERE created_at > ? AND workspace_id = ?
      GROUP BY type
      ORDER BY count DESC
    `).all(since, workspaceId) as { type: string; count: number }[];

    const activeActors = db.prepare(`
      SELECT actor, COUNT(*) as activity_count
      FROM activities
      WHERE created_at > ? AND workspace_id = ?
      GROUP BY actor
      ORDER BY activity_count DESC
      LIMIT 10
    `).all(since, workspaceId) as { actor: string; activity_count: number }[];

    const timeline = db.prepare(`
      SELECT (created_at / 3600) * 3600 as hour_bucket, COUNT(*) as count
      FROM activities
      WHERE created_at > ? AND workspace_id = ?
      GROUP BY hour_bucket
      ORDER BY hour_bucket ASC
    `).all(since, workspaceId) as { hour_bucket: number; count: number }[];

    return NextResponse.json({
      timeframe: `${hours} hours`,
      activityByType: activityStats,
      topActors: activeActors,
      timeline: timeline.map(item => ({
        timestamp: item.hour_bucket,
        count: item.count,
        hour: new Date(item.hour_bucket * 1000).toISOString()
      }))
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/activities/stats error');
    return NextResponse.json({ error: 'Failed to fetch activity stats' }, { status: 500 });
  }
}
