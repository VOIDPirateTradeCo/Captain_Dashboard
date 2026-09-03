import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { getDatabase } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { readLimiter, mutationLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { canonicalizeMemoryRelativePath, isPathAllowed, resolveSafeMemoryPath, MEMORY_PATH } from '@/lib/memory-path'

const CREW_PERSONA_FILES: Record<string, string> = {
  captain: `# Captain persona\n\n- Role: Captain Brewbeard Ledgerbane\n- Style: terse OODA, evidence-first\n- Fleet: SQUIDSTATION command, mission control owner\n- Preferences: LAN-only, no git rewrite, verify-before-claim\n`,
  'sir-green': `# Sir Green persona\n\n- Role: fleet ops + automation\n- Style: OODA loop, batch-safe Trello automation, rate-limited API usage\n- Duties: dashboard builds, integrations, fleet panel, skills library\n- Constraints: no touching tr3asure cards, no closing Cobalt cards without approval\n`,
  'sir-cobalt': `# Sir Cobalt persona\n\n- Role: bug hunter + tr3asure mAp lead\n- Style: systematic, evidence-first, read-only audits when blocked\n- Duties: tr3asure mAp bug hunts, memory-safe investigations\n- Constraints: owns tr3asure cards; others must not close without approval\n`,
  'sir-azure': `# Sir Azure persona\n\n- Role: offensive + recon lead\n- Style: stealth, ops-first, verification-heavy\n- Duties: LAN recon, crew workstation setup, IDS feeds\n- Platforms: STEALTHATTACK GPU Lab\n`,
  'sir-violet': `# Sir Violet persona\n\n- Role: security + hardening\n- Style: cautious, scan-driven, policy-first\n- Duties: security score improvements, firewall/IDS tuning, compliance\n`,
  'miss-pink': `# Miss Pink persona\n\n- Role: QA + cross-board review\n- Style: verification-focused, reviewer mindset\n- Duties: Torus Ops final review, evidence validation, crew comms\n- Platforms: PINKCADY Comms\n`,
  'mr-blue': `# Mr Blue persona\n\n- Role: remote + mobile crew\n- Style: async reporting, heartbeat-based updates\n- Duties: phone/tablet mission control access, Tailscale connectivity\n- Platforms: mobile/laptop via Tailscale\n`,
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  const base = MEMORY_PATH
  if (!base || !existsSync(base)) {
    return NextResponse.json({ personas: {} })
  }

  const personas: Record<string, { path: string; exists: boolean; preview?: string }> = {}
  for (const [agent, content] of Object.entries(CREW_PERSONA_FILES)) {
    const rel = `crew-personas/${agent}.md`
    const full = join(base, rel)
    let exists = false
    let preview: string | undefined
    try {
      const raw = await readFile(full, 'utf8')
      exists = true
      preview = raw.slice(0, 240)
    } catch {
      preview = content.slice(0, 240)
    }
    personas[agent] = { path: rel, exists, preview }
  }

  return NextResponse.json({ base, personas })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'operator')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  const body = await request.json().catch(() => ({}))
  const agent = typeof body.agent === 'string' ? body.agent : ''
  const content = typeof body.content === 'string' ? body.content : ''
  if (!agent || !content) {
    return NextResponse.json({ error: 'agent and content are required' }, { status: 400 })
  }

  const base = MEMORY_PATH
  if (!base) {
    return NextResponse.json({ error: 'Memory directory not configured' }, { status: 500 })
  }

  const rel = `crew-personas/${agent}.md`
  if (!canonicalizeMemoryRelativePath(rel)) {
    return NextResponse.json({ error: 'Invalid memory path' }, { status: 400 })
  }

  const full = join(base, rel)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, content, 'utf8')

  try {
    const db = getDatabase()
    db.prepare('INSERT OR REPLACE INTO memory_index(path, scope, title, body, mtime) VALUES(?, ?, ?, ?, ?)').run(
      rel,
      'fleet-persona',
      `${agent} persona`,
      content,
      Date.now()
    )
  } catch (err) {
    logger.warn({ err }, 'memory index update failed')
  }

  return NextResponse.json({ ok: true, path: rel, agent })
}
