'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

type ViewMode = 'office' | 'org-chart'
type FleetAgent = {
  id: number
  name: string
  status: string
  last_seen?: number
  ship?: string | null
  framework?: string | null
  capabilities?: string[]
  resources?: any
  shares?: any[]
  security?: any
}

type FleetResources = {
  generated_at: number
  count: number
  resources: FleetAgent[]
}

type FleetStorage = {
  generated_at: number
  count: number
  storage: FleetAgent[]
}

type FleetSecurity = {
  generated_at: number
  count: number
  security: FleetAgent[]
}

type FleetTasks = {
  generated_at: number
  count: number
  tasks: any[]
}

type ConnectivityShip = {
  reachable: boolean
  latency_ms: number | null
  last_seen: number | null
}

type ConnectivityResponse = {
  status: string
  generated_at: number
  ships: Record<string, ConnectivityShip>
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-void-mint',
  busy: 'bg-void-amber',
  error: 'bg-void-crimson',
  offline: 'bg-muted-foreground/40',
}

const SHIPS = [
  { key: 'SQUIDSTATION', name: 'SQUIDSTATION', room: 'Command Deck', icon: '🏴‍☠️' },
  { key: 'STEALTHATTACK', name: 'STEALTHATTACK', room: 'GPU Lab', icon: '⚡' },
  { key: 'PINKCADY', name: 'PINKCADY', room: 'Comms', icon: '📡' },
  { key: 'TORUSLAPTOP', name: 'TORUSLAPTOP', room: 'Intel', icon: '🔍' },
] as const

export function CaptainOfficePanel() {
  const t = useTranslations('office')
  const [viewMode, setViewMode] = useState<ViewMode>('office')
  const [resources, setResources] = useState<FleetResources | null>(null)
  const [storage, setStorage] = useState<FleetStorage | null>(null)
  const [security, setSecurity] = useState<FleetSecurity | null>(null)
  const [tasks, setTasks] = useState<FleetTasks | null>(null)
  const [connectivity, setConnectivity] = useState<ConnectivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, sto, sec, tas, conn] = await Promise.all([
        apiFetch<FleetResources>('/api/fleet/resources'),
        apiFetch<FleetStorage>('/api/fleet/storage'),
        apiFetch<FleetSecurity>('/api/fleet/security'),
        apiFetch<FleetTasks>('/api/fleet/tasks'),
        apiFetch<ConnectivityResponse>('/api/fleet/connectivity'),
      ])
      setResources(res)
      setStorage(sto)
      setSecurity(sec)
      setTasks(tas)
      setConnectivity(conn)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load fleet data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const agents = useMemo(() => resources?.resources ?? [], [resources])
  const activeTaskCount = useMemo(() => tasks?.tasks?.length ?? 0, [tasks])

  const counts = useMemo(() => {
    const c: Record<string, number> = { idle: 0, busy: 0, error: 0, offline: 0 }
    for (const a of agents) {
      const s = a.status
      if (s in c) c[s] = (c[s] || 0) + 1
    }
    return c
  }, [agents])

  const shipStatus = useMemo(() => {
    const connectivityShips = connectivity?.ships ?? {}
    return SHIPS.map(meta => {
      const conn = connectivityShips[meta.key]
      const shipAgents = agents.filter(a => (a.ship ?? '').toUpperCase().includes(meta.key))
      const hasOnline = shipAgents.some(a => a.status !== 'offline')
      return {
        ...meta,
        reachable: conn ? conn.reachable : hasOnline,
        latencyMs: conn?.latency_ms ?? null,
        lastSeen: conn?.last_seen ?? null,
        agentCount: shipAgents.length,
      }
    })
  }, [agents, connectivity])

  const formatLastSeen = (ts?: number | null) => {
    if (!ts) return '—'
    const diff = Date.now() - ts * 1000
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="p-6 space-y-4">
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Captain&apos;s Office</h1>
            <p className="text-muted-foreground mt-1">Fleet command — crew, ship, storage, security, tasks</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {counts.busy > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-void-amber" />
                  {counts.busy} active
                </span>
              )}
              {counts.idle > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-void-mint" />
                  {counts.idle} standby
                </span>
              )}
              {counts.error > 0 && (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-void-crimson" />
                  {counts.error} alert
                </span>
              )}
            </div>
            <div className="flex rounded-md overflow-hidden border border-border">
              <Button
                variant={viewMode === 'office' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('office')}
                className="rounded-none"
              >
                Deck
              </Button>
              <Button
                variant={viewMode === 'org-chart' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setViewMode('org-chart')}
                className="rounded-none"
              >
                Fleet
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={load}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-void-crimson">{error}</div>
      )}

      {loading && (
        <div className="text-sm text-muted-foreground">Loading fleet telemetry...</div>
      )}

      {viewMode === 'office' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shipStatus.map(ship => (
            <div key={ship.key} className="void-panel border border-border rounded-md p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{ship.icon} {ship.name}</div>
                  <div className="text-xs text-muted-foreground">{ship.room} · {ship.agentCount} crew</div>
                </div>
                <span className={`w-2 h-2 rounded-full ${ship.reachable ? 'bg-void-mint' : 'bg-muted-foreground/40'}`} />
              </div>
              <div className="text-xs text-muted-foreground">
                Status: {ship.reachable ? 'Reachable' : 'Offline'} · {ship.latencyMs != null ? `${ship.latencyMs}ms` : '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                Last seen: {formatLastSeen(ship.lastSeen)}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'org-chart' && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="void-panel border border-border rounded-md p-4">
            <div className="text-xs font-semibold font-mono tracking-wider text-void-cyan mb-2">Storage</div>
            <div className="space-y-1">
              {(storage?.storage ?? []).map((agent) => (
                <div key={agent.id} className="flex justify-between text-xs">
                  <span>{agent.name}</span>
                  <span className="text-muted-foreground">{agent.shares?.length ?? 0} shares</span>
                </div>
              ))}
            </div>
          </div>
          <div className="void-panel border border-border rounded-md p-4">
            <div className="text-xs font-semibold font-mono tracking-wider text-void-cyan mb-2">Security</div>
            <div className="space-y-1">
              {(security?.security ?? []).map((agent) => (
                <div key={agent.id} className="flex justify-between text-xs">
                  <span>{agent.name}</span>
                  <span className="text-muted-foreground">{agent.security ? 'configured' : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
