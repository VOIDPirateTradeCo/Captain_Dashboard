import { NextRequest, NextResponse } from 'next/server'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

/**
 * POST /api/fleet-memory/ingest-conversations?agent=<name>
 * Body: SQLite bytes (raw or gzip — detected by magic number 0x1F8B).
 * Auth: Bearer MC API key.
 *
 * Stored at <dataDir>/fleet-conversations/<agent>.db — searched by /api/conversations.
 */

const ALLOWED_AGENTS = /^[a-z0-9-]+$/
const GZIP_MAGIC = Buffer.from([0x1f, 0x8b])

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agent = searchParams.get('agent') || ''

    if (!ALLOWED_AGENTS.test(agent)) {
      return NextResponse.json({ error: 'Invalid agent name' }, { status: 400 })
    }
    let body = Buffer.from(await request.arrayBuffer())
    if (body.byteLength > 200 * 1024 * 1024) {
      return NextResponse.json({ error: 'Export too large (max 200MB)' }, { status: 413 })
    }

    // Gunzip if the payload starts with the gzip magic bytes
    let compressed = false
    if (body.length > 2 && body.subarray(0, 2).equals(GZIP_MAGIC)) {
      body = gunzipSync(body)
      compressed = true
    }

    const dir = join(config.dataDir, 'fleet-conversations')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${agent}.db`), body)

    logger.info({ agent, bytes: body.byteLength, compressed }, 'fleet-conversations: ingested')
    return NextResponse.json({ ok: true, agent, bytes: body.byteLength, compressed })
  } catch (error) {
    logger.error({ err: error }, 'fleet-conversations ingest error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
