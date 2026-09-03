'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface AlertItem {
  name?: string
  state?: string
  severity?: string
  node?: string
  summary?: string
  since?: string
}
interface DownTarget {
  job?: string
  node?: string
  instance?: string
  err?: string
}
interface McAgent {
  id?: string | number
  name?: string
  status?: string
  runtime?: string | null
}
interface MonitorResp {
  generated_at?: string
  services?: Record<string, { ok?: boolean; status?: number; error?: string }>
  alerts?: { ok?: boolean; error?: string; firing?: number; pending?: number; items?: AlertItem[] }
  targets?: { ok?: boolean; error?: string; total?: number; up?: number; down?: DownTarget[] }
  mc_agents?: { ok?: boolean; error?: string; online?: number; total?: number; agents?: McAgent[] }
  tr3asure_fleet?: { ok?: boolean; error?: string; nodes?: unknown[] }
  verdict?: 'green' | 'amber' | 'red' | 'unknown'
}
interface ConnectivityShip {
  reachable: boolean
  latency_ms: number | null
  last_seen: number | null
}
interface ConnectivityResponse {
  status: string
  generated_at: number
  ships: Record<string, ConnectivityShip>
}

function useCollector<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await apiFetch<T>(`/api/void-proxy/${path}`))
      setErr(null)
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.code} ${e.status}` : e instanceof Error ? e.message : 'error')
    } finally {
      setLoading(false)
    }
  }, [path])
  useEffect(() => { void load() }, [load])
  return { data, err, loading, reload: load }
}

const VERDICT_STYLE: Record<string, string> = {
  green: 'bg-green-500/15 text-green-500 border-green-500/30',
  amber: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  red: 'bg-red-500/15 text-red-500 border-red-500/30',
  unknown: 'bg-muted text-muted-foreground border-border',
}

function sev(s?: string) {
  const x = (s || '').toLowerCase()
  const c = x === 'critical' ? 'text-red-500' : x === 'warning' ? 'text-yellow-500' : 'text-muted-foreground'
  return <span className={`text-[11px] uppercase ${c}`}>{s || 'info'}</span>
}

function dot(ok?: boolean) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
}

function formatLastSeen(ts?: number | null) {
  if (!ts) return '—'
  const diff = Date.now() - ts * 1000
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const SHIPS = [
  { key: 'SQUIDSTATION', name: 'SQUIDSTATION', room: 'Command Deck', icon: '🏴‍☠️' },
  { key: 'STEALTHATTACK', name: 'STEALTHATTACK', room: 'GPU Lab', icon: '⚡' },
  { key: 'PINKCADY', name: 'PINKCADY', room: 'Comms', icon: '📡' },
  { key: 'TORUSLAPTOP', name: 'TORUSLAPTOP', room: 'Intel', icon: '🔍' },
] as const

export function VoidHiveHealthPanel() {
  const mon = useCollector<MonitorResp>('monitor')
  const conn = useCollector<ConnectivityResponse>('connectivity')
  const d = mon.data
  const verdict = d?.verdict || 'unknown'
  const services = Object.entries(d?.services || {})
  const alerts = d?.alerts
  const targets = d?.targets
  const agents = d?.mc_agents
  const collectorDown = Boolean(mon.err)
  const collectorLoading = mon.loading

  const shipStatus = (() => {
    const connectivityShips = conn.data?.ships ?? {}
    return SHIPS.map(meta => {
      const c = connectivityShips[meta.key]
      return {
        ...meta,
        reachable: c ? c.reachable : false,
        latencyMs: c?.latency_ms ?? null,
        lastSeen: c?.last_seen ?? null,
      }
    })
  })()

  return (
    <div className="p-6 space-y-6 max-w-5xl" role="region" aria-label="Void Hivehealth">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">Hive Health</h1>
          <span className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${VERDICT_STYLE[verdict]}`}>
            {verdict}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => { mon.reload(); conn.reload() }}>Refresh</Button>
      </div>

      {mon.err && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-500">
          Collector degraded: {mon.err}. Showing best-effort state; some cards may be empty.
        </div>
      )}
      {(d?.generated_at || conn.data?.generated_at) && (
        <p className="text-[11px] text-muted-foreground -mt-4">
          monitor {d?.generated_at ?? '—'} · connectivity {conn.data?.generated_at ? new Date(conn.data.generated_at).toISOString() : '—'}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Services */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Services</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            {services.map(([name, s]) => (
              <div key={name} className="flex items-center gap-2 text-xs">
                {dot(s.ok)}
                <span className="text-foreground">{name}</span>
                <span className="text-muted-foreground">{s.ok ? s.status : (s.error || 'down')}</span>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {collectorLoading ? 'loading…' : collectorDown ? 'collector unavailable — no service snapshot' : 'no data'}
              </p>
            )}
          </div>
        </div>

        {/* Connectivity */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Fleet connectivity</h2>
            <span className="text-xs text-muted-foreground">
              {shipStatus.filter(s => s.reachable).length}/{shipStatus.length} reachable
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {shipStatus.map(ship => (
              <div key={ship.key} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{ship.icon} {ship.name}</span>
                <span className="text-muted-foreground">
                  {ship.reachable ? `${ship.latencyMs != null ? `${ship.latencyMs}ms` : 'live'} · ` : 'offline · '}{formatLastSeen(ship.lastSeen)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Alerts */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Prometheus alerts</h2>
            <span className="text-xs text-muted-foreground">
              {collectorDown ? 'collector degraded' : alerts?.ok ? `${alerts.firing ?? 0} firing · ${alerts.pending ?? 0} pending` : (alerts?.error || '—')}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {(alerts?.items || []).slice(0, 12).map((a, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 text-xs border-b border-border/40 pb-1 last:border-0">
                <span className={`inline-block h-2 w-2 rounded-full ${a.state === 'firing' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                <span className="text-foreground">{a.name}</span>
                {a.node && <span className="font-mono text-[11px] text-muted-foreground">{a.node}</span>}
                {sev(a.severity)}
                {a.summary && <span className="text-muted-foreground">— {a.summary}</span>}
              </div>
            ))}
            {((alerts?.items || []).length === 0) && (
              <p className="text-xs text-muted-foreground">{collectorLoading ? 'loading…' : collectorDown ? 'collector degraded — no alert snapshot' : 'no alerts firing'}</p>
            )}
          </div>
        </div>

        {/* Scrape targets */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Scrape targets</h2>
            <span className="text-xs text-muted-foreground">
              {collectorDown ? 'collector degraded' : targets?.ok ? `${targets.up ?? 0}/${targets.total ?? 0} up` : (targets?.error || '—')}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {(targets?.down || []).map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                <span className="text-foreground">{t.job}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{t.node || t.instance}</span>
              </div>
            ))}
            {((targets?.down || []).length === 0) && (
              <p className="text-xs text-muted-foreground">{collectorLoading ? 'loading…' : collectorDown ? 'collector degraded — no target snapshot' : 'all targets up'}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* MC agents */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Mission Control agents</h2>
            <span className="text-xs text-muted-foreground">
              {collectorDown ? 'collector degraded' : agents?.ok ? `${agents.online ?? 0}/${agents.total ?? 0} online` : (agents?.error || '—')}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {(agents?.agents || []).map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={`inline-block h-2 w-2 rounded-full ${String(a.status).toLowerCase() === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-foreground">{a.name}</span>
                <span className="text-muted-foreground">{a.status}{a.runtime ? ` · ${a.runtime}` : ''}</span>
              </div>
            ))}
            {(agents?.agents || []).length === 0 && (
              <p className="text-xs text-muted-foreground">{collectorLoading ? 'loading…' : collectorDown ? 'collector degraded — no agent snapshot' : 'no agents'}</p>
            )}
          </div>
        </div>

        {/* tr3asure fleet */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">tr3asure fleet</h2>
          {collectorDown ? (
            <p className="mt-2 text-xs text-muted-foreground">collector degraded</p>
          ) : d?.tr3asure_fleet?.ok ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {(d.tr3asure_fleet.nodes || []).length} node(s) reported by the tr3asure backend
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              {d?.tr3asure_fleet?.error || 'tr3asure backend unreachable (expected when the trading app is stopped)'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
