'use client'

/**
 * VOID placeholder panel — proves the plugin-registry wiring end to end:
 *   nav item renders → route resolves → panel mounts → `void-proxy` reaches the
 *   host-side collector (dashboard_server.py on 0.0.0.0:8080).
 *
 * Replace / clone this for the real VOID panels (fleet/LAN, WHITE WHALE, vault
 * health). Pattern to copy: client component, `apiFetch('/api/void-proxy/...')`,
 * graceful degradation when the collector is down.
 */

import { useCallback, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface ProbeState {
  loading: boolean
  ok: boolean
  detail: string
}

export function VoidPlaceholderPanel() {
  const [probe, setProbe] = useState<ProbeState>({ loading: true, ok: false, detail: '' })

  const runProbe = useCallback(async () => {
    setProbe({ loading: true, ok: false, detail: '' })
    try {
      // /api/status is served by dashboard_server.py; via the allow-listed proxy.
      const data = await apiFetch<Record<string, unknown>>('/api/void-proxy/status')
      setProbe({
        loading: false,
        ok: true,
        detail: `collector reachable — ${Object.keys(data || {}).length} keys in /api/status`,
      })
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? `${err.code} (${err.status}) — ${err.message}`
          : err instanceof Error
            ? err.message
            : 'unknown error'
      setProbe({ loading: false, ok: false, detail: `collector unreachable — ${msg}` })
    }
  }, [])

  useEffect(() => {
    void runProbe()
  }, [runProbe])

  return (
    <div className="p-6 max-w-2xl" role="region" aria-label="Void Placeholder">
      <h1 className="text-lg font-semibold text-foreground">VOID panel — wiring check</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Plugin registry is live. This panel was registered from{' '}
        <code className="text-xs">src/lib/plugins-void.ts</code> without touching the
        ContentRouter switch or the navGroups literal.
      </p>

      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              probe.loading ? 'bg-yellow-500' : probe.ok ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm font-medium text-foreground">
            {probe.loading ? 'Probing host collector…' : probe.ok ? 'Collector OK' : 'Collector down'}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground break-words">{probe.detail}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void runProbe()}>
          Re-probe
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Path: <code>/api/void-proxy/status</code> →{' '}
        <code>http://host.docker.internal:8080/api/status</code>
      </p>
    </div>
  )
}
