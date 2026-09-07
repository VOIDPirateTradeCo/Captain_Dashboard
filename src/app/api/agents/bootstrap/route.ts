import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { logger } from '@/lib/logger';

const DEFAULT_AGENTS = [
  { name: 'sir-green', role: 'admin', source: 'manual', runtime_type: 'hermes', hidden: 0 },
  { name: 'miss-pink', role: 'operator', source: 'manual', runtime_type: 'hermes', hidden: 0 },
  { name: 'miss-orange', role: 'operator', source: 'manual', runtime_type: 'hermes', hidden: 0 },
  { name: 'miss-blue', role: 'operator', source: 'manual', runtime_type: 'hermes', hidden: 0 },
  { name: 'sir-cobalt', role: 'viewer', source: 'manual', runtime_type: 'claude', hidden: 0 },
  { name: 'sir-azure', role: 'viewer', source: 'manual', runtime_type: 'hermes', hidden: 0 },
  { name: 'sir-violet', role: 'operator', source: 'manual', runtime_type: 'hermes', hidden: 0 },
  { name: 'augur-ai', role: 'viewer', source: 'manual', runtime_type: 'openai', hidden: 0 },
];

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'admin');
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const db = getDatabase();
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
    if (existingCount.count > 0) {
      return NextResponse.json({ ok: true, skipped: true, count: existingCount.count });
    }

    const insert = db.prepare(
      'INSERT INTO agents (name, role, status, source, runtime_type, hidden, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())'
    );

    const results = [];
    for (const agent of DEFAULT_AGENTS) {
      const result = insert.run(agent.name, agent.role, 'offline', agent.source, agent.runtime_type ?? null, agent.hidden ?? 0);
      results.push({ id: Number(result.lastInsertRowid), ...agent });
    }

    logger.info({ agents: results.map(a => a.name) }, 'Bootstrapped default agents');
    return NextResponse.json({ ok: true, skipped: false, agents: results });
  } catch (error) {
    logger.error({ err: error }, '/api/agents/bootstrap error');
    return NextResponse.json({ error: 'Failed to bootstrap agents' }, { status: 500 });
  }
}
