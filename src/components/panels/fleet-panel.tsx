'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

type Ship = {
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
  tasks?: any[]
}

type FleetResources = {
  generated_at: number
  count: number
  resources: Ship[]
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-void-mint',
  busy: 'bg-void-amber',
  error: 'bg-void-crimson',
  offline: 'bg-muted-foreground/40',
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Standby',
  busy: 'Active',
  error: 'Alert',
  offline: 'Offline',
}

const SHIPS: Record<string, { name: string; room: string; icon: string; color: string }> = {
  SQUIDSTATION: { name: 'SQUIDSTATION', room: 'Command Deck', icon: '🏴‍☠️', color: 'text-void-cyan' },
  STEALTHATTACK: { name: 'STEALTHATTACK', room: 'GPU Lab', icon: '⚡', color: 'text-void-amber' },
  PINKCADY: { name: 'PINKCADY', room: 'Comms', icon: '📡', color: 'text-void-mint' },
  TORUSLAPTOP: { name: 'TORUSLAPTOP', room: 'Intel', icon: '🔍', color: 'text-void-violet' },
  default: { name: 'Unknown Ship', room: 'Deck', icon: '⚓', color: 'text-muted-foreground' },
}

function getShipMeta(shipName?: string | null) {
  if (!shipName) return SHIPS.default
  const key = Object.keys(SHIPS).find(k => shipName.toUpperCase().includes(k))
  return key ? SHIPS[key] : SHIPS.default
}

function ShipCard({ shipName, agents }: { shipName: string; agents: Ship[] }) {
  const meta = getShipMeta(shipName)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-border/60 bg-card/80 p-4 transition-all duration-200 hover:border-void-cyan/40 hover:shadow-lg hover:shadow-void-cyan/10"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Animated corner accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute left-0 top-0 h-1 w-1 bg-gradient-to-br to-transparent transition-all duration-500 ${hovered ? 'opacity-100' : 'opacity-40'}`} style={{ background: `linear-gradient(135deg, hsl(var(--void-cyan) / 0.6), transparent)` }} />
        <div className={`absolute right-0 top-0 h-1 w-1 bg-gradient-to-bl to-transparent transition-all duration-500 ${hovered ? 'opacity-100' : 'opacity-40'}`} style={{ background: `linear-gradient(225deg, hsl(var(--void-cyan) / 0.6), transparent)` }} />
        <div className={`absolute bottom-0 left-0 h-1 w-1 bg-gradient-to-tr to-transparent transition-all duration-500 ${hovered ? 'opacity-100' : 'opacity-40'}`} style={{ background: `linear-gradient(315deg, hsl(var(--void-cyan) / 0.6), transparent)` }} />
        <div className={`absolute bottom-0 right-0 h-1 w-1 bg-gradient-to-tl to-transparent transition-all duration-500 ${hovered ? 'opacity-100' : 'opacity-40'}`} style={{ background: `linear-gradient(45deg, hsl(var(--void-cyan) / 0.6), transparent)` }} />
      </div>

      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.icon}</span>
            <div>
              <div className={`text-sm font-semibold ${meta.color}`}>{shipName}</div>
              <div className="text-xs text-muted-foreground">{meta.room}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{agents.length} agent{agents.length === 1 ? '' : 's'}</div>
        </div>

        {/* Live status flow */}
        <div className="flex items-center gap-1">
          {agents.map((a) => (
            <span
              key={a.id}
              className={`inline-flex h-1.5 w-1.5 rounded-full ${STATUS_COLORS[a.status] ?? 'bg-muted-foreground/40'}`}
              title={`${a.name}: ${STATUS_LABELS[a.status] ?? a.status}`}
            />
          ))}
        </div>

        <div className="space-y-1">
          {agents.map((a) => (
            <div key={a.id} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{a.name}</span>
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${a.status === 'busy' ? 'bg-void-amber/10 text-void-amber' : a.status === 'error' ? 'bg-void-crimson/10 text-void-crimson' : a.status === 'idle' ? 'bg-void-mint/10 text-void-mint' : 'bg-muted text-muted-foreground'}`}>
                <span className={`h-1 w-1 rounded-full ${STATUS_COLORS[a.status] ?? 'bg-muted-foreground/40'}`} />
                {STATUS_LABELS[a.status] ?? a.status}
              </span>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          {agents[0]?.framework ?? '—'} · {agents[0]?.capabilities?.length ?? 0} capabilities
        </div>
      </div>
    </div>
  )
}

export function FleetPanel() {
  const t = useTranslations('fleet')
  const [resources, setResources] = useState<FleetResources | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<FleetResources>('/api/fleet/resources')
      setResources(res)
    } catch (e) {
      setError('Failed to load fleet telemetry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [])

  const ships = useMemo(() => resources?.resources ?? [], [resources])
  const grouped = useMemo(() => {
    const groups: Record<string, Ship[]> = {}
    for (const s of ships) {
      const shipName = s.ship?.toUpperCase() || 'UNKNOWN'
      if (!groups[shipName]) groups[shipName] = []
      groups[shipName].push(s)
    }
    return groups
  }, [ships])

  return (
    <div className="relative min-h-[60vh] space-y-4" role="region" aria-label="Fleet">
      {/* Animated background layer */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_-10%,hsl(var(--void-cyan)/0.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_80%_20%,hsl(var(--void-violet)/0.06),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.06)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.06)_1px,transparent_1px)] bg-[size:40px_40px] animate-[gridFlow_20s_linear_infinite]" />
      </div>

      <div className="relative border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fleet</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Ship-based workflows · {ships.length} crew
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
              {ships.filter(s => s.status === 'busy').length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-void-amber" />
                  {ships.filter(s => s.status === 'busy').length} active
                </span>
              )}
              {ships.filter(s => s.status === 'idle').length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-void-mint" />
                  {ships.filter(s => s.status === 'idle').length} standby
                </span>
              )}
              {ships.filter(s => s.status === 'error').length > 0 && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-void-crimson" />
                  {ships.filter(s => s.status === 'error').length} alert
                </span>
              )}
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

      {!loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(grouped).map(([shipName, agents]) => (
            <ShipCard key={shipName} shipName={shipName} agents={agents} />
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="text-sm text-muted-foreground">No crew telemetry yet.</div>
          )}
        </div>
      )}
    </div>
  )
}
