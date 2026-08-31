'use client'

/**
 * VOID Security panel — CrowdSec / Suricata / Zeek status, OPSEC checks, the OODA
 * scanner, and the passphrase-gated WHITE WHALE console.
 *
 * Read data via /api/void-proxy (viewer). WHITE WHALE via POST /api/void-whale
 * (admin role + passphrase, hashed server-side). Shapes verified 2026-08-31.
 */

import { useCallback, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface SecurityResp {
  host?: string
  components?: Record<string, { alive?: boolean; note?: string; packets_captured?: number; packets_dropped?: number; active_decisions_now?: string }>
  defensive_summary?: string
}
interface OpsecResp {
  opsec?: {
    shared_with_pink_gitignored?: boolean
    real_secrets_tracked?: number
    chinese_content_files?: number
    all_clear?: boolean
    deployed_modules?: Record<string, unknown>
  }
}
interface ScannerResp {
  scanner?: string
  last_scan?: string
  status?: string
  ooda_loop?: string
}

function useCollector<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const load = useCallback(async () => {
    try { setData(await apiFetch<T>(`/api/void-proxy/${path}`)); setErr(null) }
    catch (e) { setErr(e instanceof ApiError ? `${e.code} ${e.status}` : e instanceof Error ? e.message : 'error') }
  }, [path])
  useEffect(() => { void load() }, [load])
  return { data, err, reload: load }
}

function aliveDot(alive?: boolean) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${alive ? 'bg-green-500' : 'bg-red-500'}`} />
}

function WhiteWhale() {
  const [passphrase, setPassphrase] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [detail, setDetail] = useState<string>('')
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passphrase) return
    setState('loading'); setDetail(''); setData(null)
    try {
      const r = await apiFetch<Record<string, unknown>>('/api/void-whale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase, threat_detected: true }),
      })
      if (r && typeof r.error === 'string') { setState('err'); setDetail(r.error) }
      else { setState('ok'); setData(r) }
    } catch (err) {
      setState('err')
      setDetail(err instanceof ApiError ? (err.status === 403 ? 'requires MC admin role' : `${err.code} ${err.status}`) : err instanceof Error ? err.message : 'error')
    } finally {
      setPassphrase('')
    }
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <h2 className="text-sm font-medium text-amber-600 dark:text-amber-400">WHITE WHALE — classified</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Admin role + passphrase. The passphrase is hashed server-side (SHA-256) before it reaches the collector — it is never put in a URL or logged.
      </p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          type="password"
          value={passphrase}
          onChange={e => setPassphrase(e.target.value)}
          placeholder="passphrase"
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          autoComplete="off"
        />
        <Button type="submit" size="sm" disabled={state === 'loading' || !passphrase}>
          {state === 'loading' ? 'Verifying…' : 'Unlock'}
        </Button>
      </form>
      {state === 'err' && <p className="mt-2 text-xs text-red-500">{detail}</p>}
      {state === 'ok' && data && (
        <pre className="mt-3 max-h-72 overflow-auto rounded bg-background p-3 text-[11px] leading-relaxed text-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function VoidSecurityPanel() {
  const security = useCollector<SecurityResp>('security')
  const opsec = useCollector<OpsecResp>('opsec')
  const scanner = useCollector<ScannerResp>('scanner')

  const comps = security.data?.components || {}
  const o = opsec.data?.opsec

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Security</h1>
          <p className="text-xs text-muted-foreground">{security.data?.host || 'via host collector'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { security.reload(); opsec.reload(); scanner.reload() }}>Refresh</Button>
      </div>

      {/* Defensive components */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Defensive stack</h2>
        {security.err && <p className="mt-2 text-xs text-red-500">{security.err}</p>}
        <div className="mt-2 space-y-2">
          {Object.entries(comps).map(([name, c]) => (
            <div key={name} className="flex items-start gap-2 text-xs">
              {aliveDot(c.alive)}
              <div>
                <span className="font-medium text-foreground">{name}</span>{' '}
                <span className="text-muted-foreground">{c.alive ? 'alive' : 'down'}</span>
                {typeof c.packets_captured === 'number' && (
                  <span className="text-muted-foreground"> · {c.packets_captured} captured / {c.packets_dropped} dropped</span>
                )}
                {c.active_decisions_now ? <span className="text-muted-foreground"> · decisions: {c.active_decisions_now}</span> : null}
                {c.note && <div className="text-muted-foreground/80">{c.note}</div>}
              </div>
            </div>
          ))}
        </div>
        {security.data?.defensive_summary && (
          <p className="mt-3 text-xs text-muted-foreground">{security.data.defensive_summary}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* OPSEC */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-foreground">OPSEC</h2>
            <span className={`rounded px-1.5 py-0.5 text-[11px] ${o?.all_clear ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}`}>
              {o?.all_clear ? 'ALL CLEAR' : 'CHECK'}
            </span>
          </div>
          {o ? (
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>secrets tracked in git: <span className={o.real_secrets_tracked ? 'text-red-500' : 'text-foreground'}>{o.real_secrets_tracked ?? '—'}</span></div>
              <div>pink-shared .gitignored: {o.shared_with_pink_gitignored ? 'yes' : 'no'}</div>
              <div>flagged content files: {o.chinese_content_files ?? '—'}</div>
              <div>deployed modules: {Object.values(o.deployed_modules || {}).filter(Boolean).length} active</div>
            </dl>
          ) : <p className="mt-2 text-xs text-muted-foreground">{opsec.err || 'loading…'}</p>}
        </div>

        {/* OODA scanner */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium text-foreground">OODA scanner</h2>
          {scanner.data ? (
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div>state: <span className="text-foreground">{scanner.data.scanner} / {scanner.data.status}</span></div>
              <div>loop: {scanner.data.ooda_loop}</div>
              <div>last scan: {scanner.data.last_scan}</div>
            </dl>
          ) : <p className="mt-2 text-xs text-muted-foreground">{scanner.err || 'loading…'}</p>}
        </div>
      </div>

      <WhiteWhale />
    </div>
  )
}
