import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SHIPS = ['SQUIDSTATION', 'STEALTHATTACK', 'PINKCADY', 'TORUSLAPTOP']
const HOME = process.env.HOME || process.env.USERPROFILE || ''

const PRIORITY_PATTERNS = [
  'analyzing',
  'analyze',
  'building',
  'implement',
  'performing',
  'hunting',
  'detecting',
  'detect',
  'exploit',
  'remediate',
  'incident',
  'defend',
  'monitor',
  'deploy',
  'hardening',
  'configuring',
  'securing',
]
const META_PATTERNS = ['skill-vault', 'governance', 'manifest', 'healthcheck', 'trello', 'ooda', 'fleet', 'void-pirate']
const CORE_SLUGS = new Set([
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

function tierFor(skill: { name?: string; description?: string }) {
  const hay = `${skill.name || ''} ${skill.description || ''}`.toLowerCase()
  if (CORE_SLUGS.has((skill.name || '').toLowerCase())) return 'core'
  const isMeta = META_PATTERNS.some((p) => hay.includes(p))
  const isPriority = PRIORITY_PATTERNS.some((p) => hay.includes(p))
  if (isMeta) return 'reference'
  if (isPriority) return 'core'
  if (hay.includes('advanced') || hay.includes('offensive') || hay.includes('forensic') || hay.includes('incident')) return 'core'
  return 'reference'
}

function assignShip(tier: string, index: number) {
  if (tier === 'core') {
    if (index % 3 === 0) return 'SQUIDSTATION'
    if (index % 3 === 1) return 'STEALTHATTACK'
    return 'PINKCADY'
  }
  const rotation = ['SQUIDSTATION', 'STEALTHATTACK', 'PINKCADY', 'TORUSLAPTOP']
  return rotation[index % rotation.length]
}

export async function GET() {
  const manifestPath = join(HOME, 'Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/04_AI_Operating_System/Skills Vault/MANIFEST.json')
  const payload = await readFile(manifestPath, 'utf8').catch(() => '')
  let manifest: any = null
  try {
    manifest = JSON.parse(payload)
  } catch {
    manifest = null
  }

  const skills = Array.isArray(manifest?.skills) ? manifest.skills : []
  const rows: Array<{ name: string; dir: string; description?: string; tier: 'core' | 'reference' | 'archive'; owner: string; caches: string[] }> = skills.map((skill: any, index: number) => {
    const tier: 'core' | 'reference' | 'archive' = tierFor(skill)
    const owner = assignShip(tier, index)
    return {
      name: skill.name ?? skill.dir,
      dir: skill.dir,
      description: skill.description,
      tier,
      owner,
      caches: owner === 'SQUIDSTATION' ? ['primary'] : ['primary', 'cache'],
    }
  })

  const counts = { core: 0, reference: 0, archive: 0 }
  for (const row of rows) {
    counts[row.tier] = (counts[row.tier] || 0) + 1
  }

  const shipSummary = {} as Record<string, { total: number; core: number; reference: number; archive: number }>
  for (const ship of SHIPS) {
    const owned = rows.filter((r) => r.owner === ship)
    shipSummary[ship] = {
      total: owned.length,
      core: owned.filter((r) => r.tier === 'core').length,
      reference: owned.filter((r) => r.tier === 'reference').length,
      archive: owned.filter((r) => r.tier === 'archive').length,
    }
  }

  return NextResponse.json({
    generated: manifest?.generated || null,
    count: rows.length,
    tiers: counts,
    ships: shipSummary,
    skills: rows,
  })
}
