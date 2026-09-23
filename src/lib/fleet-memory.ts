/**
 * Fleet Memory Scanner
 *
 * Indexes memory from every fleet agent into MC:
 * - Hermes agents (any PC, local or pushed): MEMORY.md + USER.md + state.db stats
 *   Local: %LOCALAPPDATA%/hermes plus each profile's memories dir
 *   Fleet: HERMES_FLEET_DIR/<agent-name> pushed by remote PCs (see scripts/push-fleet-memory.ps1)
 * - Claude agents (Sir Cobalt): ~/.claude/CLAUDE.md plus per-project memory markdown files
 * - Codex agents (Sir Violet): ~/.codex/AGENTS.md plus memories markdown files
 *
 * Read-only: never writes to agent data. Normalizes into FleetMemoryEntry[].
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './config'

export interface FleetMemoryEntry {
  agent: string
  runtime: string  // 'hermes' | 'claude' | 'codex'
  host: string
  source: string          // file path or db identifier
  kind: string            // 'core' | 'session-memory' | 'user-profile'
  size: number
  entries: number         // §-delimited entry count
  modifiedAt: string | null
  content: string | null  // null when content too large (> 100KB) — metadata only
}

const MAX_CONTENT = 100 * 1024

function countSectionEntries(content: string): number {
  const matches = content.match(/\u00A7/g)
  return matches ? matches.length : 0
}

function readFileEntry(
  agent: string,
  runtime: string,
  host: string,
  source: string,
  kind: string,
): FleetMemoryEntry | null {
  if (!existsSync(source)) return null
  try {
    const stat = statSync(source)
    const raw = readFileSync(source, 'utf-8')
    return {
      agent,
      runtime,
      host,
      source,
      kind,
      size: stat.size,
      entries: countSectionEntries(raw),
      modifiedAt: stat.mtime.toISOString(),
      content: raw.length <= MAX_CONTENT ? raw : null,
    }
  } catch {
    return null
  }
}

/** Local Hermes: main profile + every named profile under profiles/ */
function scanHermesLocal(host: string): FleetMemoryEntry[] {
  const out: FleetMemoryEntry[] = []
  const dataDir = process.env.HERMES_DATA_DIR
    ? process.env.HERMES_DATA_DIR
    : process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'hermes')
      : join(config.homeDir, '.hermes')

  // Main profile = the default agent on this machine
  const mainAgent = process.env.HERMES_AGENT_NAME || 'sir-green'
  const mainMem = readFileEntry(mainAgent, 'hermes', host, join(dataDir, 'memories', 'MEMORY.md'), 'core')
  if (mainMem) out.push(mainMem)
  const mainUser = readFileEntry(mainAgent, 'hermes', host, join(dataDir, 'memories', 'USER.md'), 'user-profile')
  if (mainUser) out.push(mainUser)

  // Named profiles (sir-green, miss-pink, sir-azure on SQUIDSTATION)
  const profilesDir = join(dataDir, 'profiles')
  if (existsSync(profilesDir)) {
    for (const name of readdirSync(profilesDir)) {
      const memDir = join(profilesDir, name, 'memories')
      if (!existsSync(memDir)) continue
      const mem = readFileEntry(name, 'hermes', host, join(memDir, 'MEMORY.md'), 'core')
      if (mem) out.push(mem)
      const user = readFileEntry(name, 'hermes', host, join(memDir, 'USER.md'), 'user-profile')
      if (user) out.push(user)
    }
  }
  return out
}

/** Fleet Hermes: remote PCs push their memories into HERMES_FLEET_DIR/<agent>/ */
function scanHermesFleet(): FleetMemoryEntry[] {
  const out: FleetMemoryEntry[] = []
  const fleetDir = process.env.HERMES_FLEET_DIR || join(config.dataDir, 'fleet-memory')
  if (!existsSync(fleetDir)) return out
  for (const agent of readdirSync(fleetDir)) {
    const agentDir = join(fleetDir, agent)
    const mem = readFileEntry(agent, 'hermes', 'fleet-push', join(agentDir, 'MEMORY.md'), 'core')
    if (mem) out.push(mem)
    const user = readFileEntry(agent, 'hermes', 'fleet-push', join(agentDir, 'USER.md'), 'user-profile')
    if (user) out.push(user)
  }
  return out
}

/** Claude Desktop (Sir Cobalt): CLAUDE.md plus per-project memory markdown files */
function scanClaude(host: string): FleetMemoryEntry[] {
  const out: FleetMemoryEntry[] = []
  const claudeDir = process.env.CLAUDE_DATA_DIR || join(config.homeDir, '.claude')
  if (!existsSync(claudeDir)) return out

  const core = readFileEntry('sir-cobalt', 'claude', host, join(claudeDir, 'CLAUDE.md'), 'core')
  if (core) out.push(core)

  const projectsDir = join(claudeDir, 'projects')
  if (existsSync(projectsDir)) {
    for (const project of readdirSync(projectsDir)) {
      const memDir = join(projectsDir, project, 'memory')
      if (!existsSync(memDir)) continue
      for (const file of readdirSync(memDir)) {
        if (!file.endsWith('.md')) continue
        const entry = readFileEntry(
          'sir-cobalt', 'claude', host,
          join(memDir, file), 'session-memory',
        )
        if (entry) out.push(entry)
      }
    }
  }
  return out
}

/** Codex Desktop (Sir Violet): AGENTS.md + memories/*.md */
function scanCodex(host: string): FleetMemoryEntry[] {
  const out: FleetMemoryEntry[] = []
  const codexDir = process.env.CODEX_DATA_DIR || join(config.homeDir, '.codex')
  if (!existsSync(codexDir)) return out

  const core = readFileEntry('sir-violet', 'codex', host, join(codexDir, 'AGENTS.md'), 'core')
  if (core) out.push(core)

  const memDir = join(codexDir, 'memories')
  if (existsSync(memDir)) {
    for (const file of readdirSync(memDir)) {
      if (!file.endsWith('.md')) continue
      const kind = file === 'MEMORY.md' ? 'core' : 'session-memory'
      const entry = readFileEntry('sir-violet', 'codex', host, join(memDir, file), kind)
      if (entry) out.push(entry)
    }
  }
  return out
}

export function getFleetMemory(): FleetMemoryEntry[] {
  const host = process.env.COMPUTERNAME || 'localhost'
  return [
    ...scanHermesLocal(host),
    ...scanHermesFleet(),
    ...scanClaude(host),
    ...scanCodex(host),
  ]
}

export function getFleetMemorySummary() {
  const entries = getFleetMemory()
  const byAgent = new Map<string, { runtime: string; host: string; files: number; totalBytes: number; totalEntries: number }>()
  for (const e of entries) {
    const cur = byAgent.get(e.agent) || { runtime: e.runtime, host: e.host, files: 0, totalBytes: 0, totalEntries: 0 }
    cur.files += 1
    cur.totalBytes += e.size
    cur.totalEntries += e.entries
    byAgent.set(e.agent, cur)
  }
  return {
    totalFiles: entries.length,
    agents: Array.from(byAgent.entries()).map(([agent, s]) => ({ agent, ...s })),
  }
}
