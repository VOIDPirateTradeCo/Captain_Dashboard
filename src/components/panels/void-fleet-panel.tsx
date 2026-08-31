'use client'

/**
 * VOID Fleet panel — SQUIDSTATION / PINKCADY / STEALTHATTACK fleet status,
 * local hardware, Docker containers, and the PINKCADY boot verdict.
 *
 * All data via /api/void-proxy → dashboard_server.py on the host (0.0.0.0:8080).
 * Field shapes verified against the live collector 2026-08-31.
 */

import { useCallback, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface ShipDetail {
  ip?: string
  status?: string
  role?: string
  latency?: string
}
interface ShipsResp {
  ships?: Record<string, string>
  ship_details?: Record<string, ShipDetail>
}
interface FleetShip {
  crew?: string
  lane?: string
  state?: string
  agent_version?: string
  last_seen?: string
  seconds_ago?: number
  tailscale_ip?: string | null
}
interface FleetResp {
  generated?: string
  hive_mind?: {
    ships_total?: number
    ships_online?: number
    ships_pending_agent?: string[]
    sync_complete?: boolean
  }
  ships?: Record<string, FleetShip>
}
interface HwResp {
  local_rig?: {
    hostname?: string
    cpu?: { Name?: string; NumberOfCores?: number; NumberOfLogicalProcessors?: number; MaxClockSpeed?: number }
    memory?: { total_gb?: number }
    disks?: { DeviceID?: string; total_gb?: number; free_gb?: number }[]
    gpu?: { Name?: string; adapter_ram_mb?: number }
  }
}
interface ContainersResp {
  containers?: { total?: number; running?: number; fleet?: number; security?: number; names?: string[] }
}
interface PinkcadyResp {
  verdict?: string
  clear_to_boot?: boolean
  captain_msg?: string
  sentinel_heartbeat?: {
    last_seen?: string
    data?: { status?: string; tailscale?: boolean; git?: { dirty?: boolean; changes?: number; sha?: string } }
  }
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

function dot(status?: string) {
  const s = (status || '').toLowerCase()
  const c = s === 'online' ? 'bg-green-500' : s === 'stale' || s === 'loading' ? 'bg-yellow-500' : 'bg-red-500'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />
}

function ago(seconds?: number) {
  if (seconds == null) return '—'
  if (seconds < 90) return `${seconds}s ago`
  if (seconds < 5400) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 172800) return `${Math.round(seconds / 3600)}h ago`
  return `${Math.round(seconds / 86400)}d ago`
}

export function VoidFleetPanel() {
  const ships = useCollector<ShipsResp>('ships')
  const fleet = useCollector<FleetResp>('fleet')
  const hw = useCollector<HwResp>('hw')
  const containers = useCollector<ContainersResp>('containers')
  const pinkcady = useCollector<PinkcadyResp>('pinkcady')

  const reloadAll = () => {
    ships.reload(); fleet.reload(); hw.reload(); containers.reload(); pinkcady.reload()
  }

  const shipNames = Object.keys(ships.data?.ships || {})
  const rig = hw.data?.local_rig
  const pc = pinkcady.data

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Fleet</h1>
          <p className="text-xs text-muted-foreground">
            {fleet.data?.hive_mind
              ? `${fleet.data.hive_mind.ships_online ?? 0}/${fleet.data.hive_mind.ships_total ?? shipNames.length} online · sync ${fleet.data.hive_mind.sync_complete ? 'complete' : 'pending'}`
              : 'via host collector'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reloadAll}>Refresh</Button>
      </div>

      {(ships.err || fleet.err) && (
        <p className="text-xs text-red-500">collector: {ships.err || fleet.err}</p>
      )}

      {/* Ships */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="px-3 py-2">Ship</th><th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">LAN IP</th><th className="px-3 py-2">Tailscale</th>
              <th className="px-3 py-2">Crew</th><th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Last seen</th><th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {shipNames.map(name => {
              const d = ships.data?.ship_details?.[name] || {}
              const f = fleet.data?.ships?.[name] || {}
              return (
                <tr key={name} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{d.role || f.lane || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.ip || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{f.tailscale_ip || '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{f.crew || '—'}</td>
                  <td className="px-3 py-2 text-xs">{f.agent_version || '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{ago(f.seconds_ago)}</td>
                  <td className="px-3 py-2">{dot(ships.data?.ships?.[name])}<span className="ml-2 text-xs">{ships.data?.ships?.[name] || f.state || '—'}</span></td>
                </tr>
              )
            })}
            {shipNames.length === 0 && !ships.loading && (
              <tr><td colSpan={8} className="px-3 py-4 text-center text-xs text-muted-foreground">no ships reported</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Local rig */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Local rig{rig?.hostname ? ` — ${rig.hostname}` : ''}</h2>
          {rig ? (
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div><span className="text-foreground">CPU</span> {rig.cpu?.Name?.trim()} ({rig.cpu?.NumberOfCores}c/{rig.cpu?.NumberOfLogicalProcessors}t)</div>
              <div><span className="text-foreground">RAM</span> {rig.memory?.total_gb} GB</div>
              <div><span className="text-foreground">GPU</span> {rig.gpu?.Name} ({Math.round((rig.gpu?.adapter_ram_mb || 0))} MB)</div>
              {(rig.disks || []).filter(d => (d.total_gb || 0) > 0).map(d => (
                <div key={d.DeviceID}><span className="text-foreground">{d.DeviceID}</span> {d.free_gb} / {d.total_gb} GB free</div>
              ))}
            </dl>
          ) : <p className="mt-2 text-xs text-muted-foreground">{hw.err || 'loading…'}</p>}
        </div>

        {/* Containers */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">Docker</h2>
          {containers.data?.containers ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                {containers.data.containers.running}/{containers.data.containers.total} running · {containers.data.containers.fleet ?? 0} fleet · {containers.data.containers.security ?? 0} security
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(containers.data.containers.names || []).map(n => (
                  <span key={n} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">{n}</span>
                ))}
              </div>
            </>
          ) : <p className="mt-2 text-xs text-muted-foreground">{containers.err || 'loading…'}</p>}
        </div>
      </div>

      {/* PINKCADY verdict */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">PINKCADY boot verdict</h2>
          <span className={`rounded px-1.5 py-0.5 text-[11px] ${pc?.clear_to_boot ? 'bg-green-500/15 text-green-500' : 'bg-yellow-500/15 text-yellow-500'}`}>
            {pc?.verdict || '—'}
          </span>
        </div>
        {pc ? (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div>{pc.captain_msg}</div>
            {pc.sentinel_heartbeat?.data && (
              <div>
                sentinel: {pc.sentinel_heartbeat.data.status}
                {pc.sentinel_heartbeat.data.tailscale ? ' · tailscale up' : ''}
                {pc.sentinel_heartbeat.data.git && ` · git ${pc.sentinel_heartbeat.data.git.dirty ? `dirty (${pc.sentinel_heartbeat.data.git.changes} changes)` : 'clean'} @ ${pc.sentinel_heartbeat.data.git.sha}`}
              </div>
            )}
          </div>
        ) : <p className="mt-2 text-xs text-muted-foreground">{pinkcady.err || 'loading…'}</p>}
      </div>
    </div>
  )
}
