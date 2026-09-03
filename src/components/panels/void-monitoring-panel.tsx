'use client'

/**
 * VOID Monitoring panel — Grafana / Prometheus / cAdvisor / NetBox, embedded.
 *
 * iframe feasibility checked against the live tools 2026-08-31:
 *   Prometheus  — no X-Frame-Options            → embeds
 *   cAdvisor    — no X-Frame-Options            → embeds
 *   Grafana     — X-Frame-Options: deny         → link only (needs
 *                 GF_SECURITY_ALLOW_EMBEDDING=true on the container)
 *   NetBox      — X-Frame-Options: SAMEORIGIN   → link only (needs
 *                 NETBOX_X_FRAME_OPTIONS + a logged-in session)
 *
 * These URLs load in the *viewer's* browser, not the MC container, so
 * `localhost` is correct.
 */

import { useState } from 'react'

interface Tool {
  id: string
  label: string
  url: string
  embeddable: boolean
  note?: string
}

const TOOLS: Tool[] = [
  { id: 'prometheus', label: 'Prometheus', url: 'http://localhost:9090/query', embeddable: true },
  { id: 'cadvisor', label: 'cAdvisor', url: 'http://localhost:8081/containers/', embeddable: true },
  {
    id: 'grafana',
    label: 'Grafana',
    url: 'http://localhost:3002',
    embeddable: false,
    note: 'Grafana sends X-Frame-Options: deny. To embed: set GF_SECURITY_ALLOW_EMBEDDING=true (and cookie_samesite=none) on the void-grafana container, then flip embeddable.',
  },
  {
    id: 'netbox',
    label: 'NetBox',
    url: 'http://192.168.0.39:8001',
    embeddable: false,
    note: 'NetBox sends X-Frame-Options: SAMEORIGIN and requires a login. To embed: set NETBOX_X_FRAME_OPTIONS and share a session.',
  },
]

export function VoidMonitoringPanel() {
  const [activeId, setActiveId] = useState(TOOLS[0].id)
  const active = TOOLS.find(t => t.id === activeId) ?? TOOLS[0]

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col p-4" role="region" aria-label="Void Monitoring">
      <div className="mb-3 flex items-center gap-1">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              t.id === activeId
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {t.label}
            {!t.embeddable && <span className="ml-1.5 text-[10px] opacity-60">↗</span>}
          </button>
        ))}
        <a
          href={active.url}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          open {active.label} in new tab ↗
        </a>
      </div>

      {active.embeddable ? (
        <iframe
          key={active.id}
          src={active.url}
          title={active.label}
          className="w-full flex-1 rounded-lg border border-border bg-background"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-foreground">{active.label} can&apos;t be embedded yet</p>
          <p className="mt-2 max-w-md text-xs text-muted-foreground">{active.note}</p>
          <a
            href={active.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            Open {active.label} ↗
          </a>
        </div>
      )}
    </div>
  )
}
