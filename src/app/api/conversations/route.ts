import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

/**
 * GET /api/conversations?q=<text>  → FTS search across all fleet chat transcripts
 *   ?q=...&profile=X   → restrict to one profile
 *   ?q=...&days=7      → restrict to last N days
 *
 * Sources (read-only):
 * - %LOCALAPPDATA%/hermes/state.db (main Hermes, Sir Green)
 * - %LOCALAPPDATA%/hermes/profiles/<name>/state.db (named profiles)
 * - Fleet-pushed: <dataDir>/fleet-conversations/<agent>.db (remote PCs)
 */

interface SearchHit {
  agent: string
  sessionId: string
  sessionTitle: string | null
  role: string
  content: string | null
  timestamp: number
  snippet: string
}

function openReadOnly(path: string): Database.Database | null {
  if (!existsSync(path)) return null
  try {
    return new Database(path, { readonly: true, fileMustExist: true })
  } catch {
    return null
  }
}

function searchDb(
  db: Database.Database,
  agent: string,
  q: string,
  days: number | null,
): SearchHit[] {
  const hits: SearchHit[] = []
  try {
    const since = days ? `AND m.timestamp >= ${(Date.now() / 1000 - days * 86400).toFixed(0)}` : ''
    // FTS join back to messages for role/timestamp/session
    const stmt = db.prepare(`
      SELECT m.session_id, m.role, m.content, m.timestamp,
             s.title, s.display_name
      FROM messages_fts f
      JOIN messages m ON m.id = f.rowid
      LEFT JOIN sessions s ON s.id = m.session_id
      WHERE messages_fts MATCH ?
      ${since}
      ORDER BY m.timestamp DESC
      LIMIT 200
    `)
    const rows = stmt.all(q) as Array<{
      session_id: string; role: string; content: string; timestamp: number
      title: string | null; display_name: string | null
    }>
    for (const r of rows) {
      const content = (r.content || '').toString()
      if (!content) continue
      const idx = content.toLowerCase().indexOf(q.toLowerCase())
      const start = Math.max(0, idx - 100)
      hits.push({
        agent,
        sessionId: r.session_id,
        sessionTitle: r.title || r.display_name || null,
        role: r.role,
        content: content.length <= 500 ? content : null,
        timestamp: r.timestamp,
        snippet: content.substr(start, 400) || '',
      })
    }
  } catch (err) {
    logger.warn({ err, agent }, 'conversations: FTS query failed for db')
  }
  return hits
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const profile = searchParams.get('profile')
    const daysRaw = searchParams.get('days')
    const days = daysRaw ? parseInt(daysRaw, 10) : null

    if (!q) {
      return NextResponse.json({
        error: 'Missing q parameter',
        usage: 'GET /api/conversations?q=<text>[&profile=<name>][&days=<n>]',
      }, { status: 400 })
    }

    const hits: SearchHit[] = []

    // 1. Main Hermes state.db (Sir Green)
    const hermesDir = process.env.HERMES_DATA_DIR
      ? process.env.HERMES_DATA_DIR
      : process.env.LOCALAPPDATA
        ? join(process.env.LOCALAPPDATA, 'hermes')
        : join(config.homeDir, '.hermes')

    if (!profile || profile === 'sir-green') {
      const main = openReadOnly(join(hermesDir, 'state.db'))
      if (main) {
        hits.push(...searchDb(main, 'sir-green', q, days))
        main.close()
      }
    }

    // 2. Named local profiles
    if (!profile) {
      const profilesDir = join(hermesDir, 'profiles')
      if (existsSync(profilesDir)) {
        const { readdirSync } = require('node:fs')
        for (const name of readdirSync(profilesDir)) {
          const db = openReadOnly(join(profilesDir, name, 'state.db'))
          if (db) {
            hits.push(...searchDb(db, name, q, days))
            db.close()
          }
        }
      }
    } else if (profile !== 'sir-green') {
      const db = openReadOnly(join(hermesDir, 'profiles', profile, 'state.db'))
      if (db) {
        hits.push(...searchDb(db, profile, q, days))
        db.close()
      }
    }

    // 3. Fleet-pushed conversation DBs (remote agents)
    const fleetConvDir = join(config.dataDir, 'fleet-conversations')
    if (existsSync(fleetConvDir)) {
      const { readdirSync } = require('node:fs')
      for (const file of readdirSync(fleetConvDir)) {
        if (!file.endsWith('.db')) continue
        const agent = file.replace(/\.db$/, '')
        if (profile && profile !== agent) continue
        const db = openReadOnly(join(fleetConvDir, file))
        if (db) {
          hits.push(...searchDb(db, agent, q, days))
          db.close()
        }
      }
    }

    // Newest first, cap 200
    hits.sort((a, b) => b.timestamp - a.timestamp)
    const capped = hits.slice(0, 200)

    return NextResponse.json({
      query: q,
      profile: profile || null,
      days: days,
      matches: capped.length,
      results: capped,
    })
  } catch (error) {
    logger.error({ err: error }, 'Conversations API error')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
