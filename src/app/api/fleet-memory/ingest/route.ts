import { NextRequest, NextResponse } from 'next/server'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

/**
 * POST /api/fleet-memory/ingest?agent=<name>&file=<MEMORY.md|USER.md>
 * Body: raw file bytes. Auth: Bearer MC API key (same as other write routes).
 *
 * Remote PCs (PINKCADY, STEALTHATTACK) push their Hermes memory files here.
 * Stored under <dataDir>/fleet-memory/<agent>/ — picked up by fleet-memory.ts scanner.
 */

const ALLOWED_FILES = new Set(['MEMORY.md', 'USER.md'])
const ALLOWED_AGENTS = /^[a-z0-9-]+$/

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agent = searchParams.get('agent') || ''
    const file = searchParams.get('file') || ''

    if (!ALLOWED_AGENTS.test(agent)) {
      return NextResponse.json({ error: 'Invalid agent name' }, { status: 400 })
    }
    if (!ALLOWED_FILES.has(file)) {
      return NextResponse.json({ error: 'Invalid file (MEMORY.md or USER.md only)' }, { status: 400 })
    }
    // Size guard: 2MB max
    const body = await request.arrayBuffer()
    if (body.byteLength > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 413 })
    }

    const dir = join(config.dataDir, 'fleet-memory', agent)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, file), Buffer.from(body))

    logger.info({ agent, file, bytes: body.byteLength }, 'fleet-memory: ingested')
    return NextResponse.json({ ok: true, agent, file, bytes: body.byteLength })
  } catch (error) {
    logger.error({ err: error }, 'fleet-memory ingest error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
