import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const HOME = process.env.HOME || process.env.USERPROFILE || ''
const MANIFEST_PATH = join(HOME, 'Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/04_AI_Operating_System/Skills Vault/MANIFEST.json')

const SHIPS = ['SQUIDSTATION', 'STEALTHATTACK', 'PINKCADY', 'TORUSLAPTOP']
const DEFAULT_STATE: Record<string, { lastSync: string | null; pending: number; integrity: 'ok' | 'degraded' | 'unknown' }> = {
  SQUIDSTATION: { lastSync: null, pending: 0, integrity: 'unknown' },
  STEALTHATTACK: { lastSync: null, pending: 0, integrity: 'unknown' },
  PINKCADY: { lastSync: null, pending: 0, integrity: 'unknown' },
  TORUSLAPTOP: { lastSync: null, pending: 0, integrity: 'unknown' },
}

function tierFor(skill: any) {
  const hay = `${skill.name || ''} ${skill.description || ''}`.toLowerCase()
  const coreSlugs = new Set([
    'agents',
    'hermes-agent',
    'hermes',
    'mission-control',
    'workflow',
    'void-pirate-fleet-operations',
    'void-pirate-fleet-mesh',
    'void-pirate-hive-mind',
    'void-pirate-hive-mind-dashboard',
    'windows-hermes-python-launch',
    'windows-folder-size-audit',
    'plan',
    'systematic-debugging',
    'debugging-and-error-recovery',
    'observability-and-instrumentation',
    'code-review-and-quality',
    'security-and-hardening',
  ])
  if (coreSlugs.has((skill.name || '').toLowerCase())) return 'core'
  const isMeta = ['skill-vault', 'governance', 'manifest', 'healthcheck', 'trello', 'ooda', 'fleet', 'void-pirate'].some((p) => hay.includes(p))
  if (isMeta) return 'reference'
  if (['analyzing', 'analyze', 'building', 'implement', 'performing', 'hunting', 'detecting', 'detect', 'exploit', 'remediate', 'incident', 'defend', 'monitor', 'deploy', 'hardening', 'configuring', 'securing'].some((p) => hay.includes(p))) return 'core'
  if (hay.includes('advanced') || hay.includes('offensive') || hay.includes('forensic') || hay.includes('incident')) return 'core'
  return 'reference'
}

function assignOwner(index: number, tier: string) {
  if (tier === 'core') {
    if (index % 3 === 0) return 'SQUIDSTATION'
    if (index % 3 === 1) return 'STEALTHATTACK'
    return 'PINKCADY'
  }
  return ['SQUIDSTATION', 'STEALTHATTACK', 'PINKCADY', 'TORUSLAPTOP'][index % 4]
}

export async function GET(request: NextRequest) {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8').catch(() => '{"skills":[]}'))
  const skills = Array.isArray(manifest.skills) ? manifest.skills : []
  const assignments: Array<{ name: string; tier: 'core' | 'reference' | 'archive'; owner: string }> = skills.map((skill: any, index: number) => {
    const tier = tierFor(skill)
    const owner = assignOwner(index, tier)
    return { name: skill.name ?? skill.dir, tier, owner }
  })

  const counts: Record<'core' | 'reference' | 'archive', number> = { core: 0, reference: 0, archive: 0 }
  for (const row of assignments) {
    if (row.tier === 'core' || row.tier === 'reference' || row.tier === 'archive') {
      counts[row.tier] = (counts[row.tier] || 0) + 1
    }
  }

  const shipStats: Record<string, { total: number; core: number; reference: number; archive: number }> = {
    SQUIDSTATION: { total: 0, core: 0, reference: 0, archive: 0 },
    STEALTHATTACK: { total: 0, core: 0, reference: 0, archive: 0 },
    PINKCADY: { total: 0, core: 0, reference: 0, archive: 0 },
    TORUSLAPTOP: { total: 0, core: 0, reference: 0, archive: 0 },
  }
  for (const row of assignments) {
    const s = shipStats[row.owner]
    if (!s) continue
    s.total += 1
    if (row.tier === 'core') s.core = (s.core || 0) + 1
    else if (row.tier === 'reference') s.reference = (s.reference || 0) + 1
    else if (row.tier === 'archive') s.archive = (s.archive || 0) + 1
  }

  const shipStatus = Object.fromEntries(
    SHIPS.map((ship) => [
      ship,
      {
        lastSync: null,
        pending: 0,
        integrity: 'ok',
        localCount: shipStats[ship]?.total ?? 0,
      },
    ])
  )

  return NextResponse.json({
    generated: manifest.generated || null,
    count: assignments.length,
    tiers: counts,
    ships: shipStatus,
    assignments: assignments.slice(0, 50),
    totalAssignments: assignments.length,
  })
}
