import { NextRequest, NextResponse } from 'next/server'
import { getFleetMemory, getFleetMemorySummary } from '@/lib/fleet-memory'
import { logger } from '@/lib/logger'

/**
 * GET /api/fleet-memory
 *   ?summary=1  → per-agent rollup (default when no query)
 *   ?agent=X    → all entries for one agent
 *   ?q=text     → search across all fleet memory content
 */

function matchesQuery(content: string | null, q: string): boolean {
  if (!content) return false
  return content.toLowerCase().includes(q.toLowerCase())
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const summary = searchParams.get('summary')
    const agent = searchParams.get('agent')
    const q = searchParams.get('q')

    if (q) {
      const entries = getFleetMemory().filter((e) => matchesQuery(e.content, q))
      return NextResponse.json({
        query: q,
        matches: entries.length,
        results: entries.map((e) => ({
          agent: e.agent,
          runtime: e.runtime,
          host: e.host,
          source: e.source,
          kind: e.kind,
          modifiedAt: e.modifiedAt,
          // snippet: first match position ± 200 chars
          snippet: e.content
            ? e.content.substr(
                Math.max(0, e.content.toLowerCase().indexOf(q.toLowerCase()) - 100),
                400,
              )
            : null,
        })),
      })
    }

    if (agent) {
      const entries = getFleetMemory().filter((e) => e.agent === agent)
      return NextResponse.json({ agent, files: entries.length, entries })
    }

    if (summary) {
      return NextResponse.json(getFleetMemorySummary())
    }

    const all = getFleetMemory()
    return NextResponse.json({
      totalFiles: all.length,
      summary: getFleetMemorySummary().agents,
      entries: all.map((e) => ({ ...e, content: undefined })),
    })
  } catch (error) {
    logger.error({ err: error }, 'Fleet memory API error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
