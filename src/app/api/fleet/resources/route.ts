import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter } from '@/lib/rate-limit'
import { getDatabase } from '@/lib/db'

const SHIPS = [
  { key: 'SQUIDSTATION', host: '192.168.0.39', port: 3000 },
  { key: 'STEALTHATTACK', host: '192.168.0.68', port: 3000 },
  { key: 'PINKCADY', host: '192.168.0.3', port: 3000 },
  { key: 'TORUSLAPTOP', host: '192.168.0.3', port: 3000 },
] as const

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  const localAgents = await loadLocalAgents()
  const remoteAgents = await loadRemoteAgents()
  const merged = mergeAgents(localAgents, remoteAgents)

  return NextResponse.json({
    generated_at: Date.now() / 1000,
    count: merged.length,
    resources: merged,
  })
}

async function loadLocalAgents() {
  try {
    const db = getDatabase()
    const rows = db.prepare("SELECT id, name, status, last_seen, config FROM agents WHERE hidden = 0").all() as any[]
    return rows.map((row) => {
      const config = row.config ? JSON.parse(row.config) : {}
      return {
        id: `local-${row.id}`,
        name: row.name,
        ship: config.ship || 'SQUIDSTATION',
        framework: 'mission-control',
        status: row.status,
        last_seen: row.last_seen,
        capabilities: config.capabilities || [],
        shares: config.shares || [],
        security: !!config.security,
        source: 'local',
      }
    })
  } catch {
    return []
  }
}

async function loadRemoteAgents() {
  const results = await Promise.allSettled(
    SHIPS.map((ship) => fetchShipAgents(ship))
  )

  const agents: any[] = []
  for (let i = 0; i < SHIPS.length; i++) {
    const ship = SHIPS[i]
    const result = results[i]
    if (result.status !== 'fulfilled' || !result.value) continue
    agents.push(...result.value.map((agent: any) => ({ ...agent, ship: agent.ship || ship.key })))
  }

  return agents
}

async function fetchShipAgents(ship: { key: string; host: string; port: number }) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`http://${ship.host}:${ship.port}/api/agents`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    clearTimeout(timer)

    if (!response.ok) return []

    const data = await response.json().catch(() => ({ agents: [] }))
    const agents = Array.isArray(data.agents) ? data.agents : []
    return agents.map((agent: any) => ({
      id: `remote-${ship.key}-${agent.id}`,
      name: agent.name,
      ship: ship.key,
      framework: agent.framework || 'unknown',
      status: agent.status || 'offline',
      last_seen: agent.last_seen || agent.updated_at || Date.now() / 1000,
      capabilities: agent.capabilities || [],
      shares: agent.shares || [],
      security: !!agent.security,
      source: 'remote',
    }))
  } catch {
    return []
  }
}

function mergeAgents(local: any[], remote: any[]) {
  const byKey = new Map<string, any>()

  for (const agent of [...local, ...remote]) {
    const key = `${agent.ship}-${agent.name}`.toLowerCase()
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, agent)
      continue
    }

    const existingLast = existing.last_seen || 0
    const candidateLast = agent.last_seen || 0
    if (candidateLast > existingLast) {
      byKey.set(key, { ...existing, ...agent, id: existing.id })
    }
  }

  return Array.from(byKey.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}
