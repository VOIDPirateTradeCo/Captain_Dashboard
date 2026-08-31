'use client'

/**
 * VOID Pirate — plugin registrations for Mission Control.
 *
 * This is the ONE place VOID panels + nav items are wired. It lights up the
 * dormant registry in `./plugins.ts` (which is consumed by `nav-rail.tsx` and
 * the `[[...panel]]/page.tsx` ContentRouter `default:` case, but never populated
 * upstream).
 *
 * Loaded once via `@/lib/plugins-void` imported at the top of
 * `src/app/[[...panel]]/page.tsx` — the only edit to a tracked upstream file.
 * Everything else is new `void-*` files, so `git pull` stays clean.
 *
 * To add a VOID panel: create `src/components/panels/void-<name>-panel.tsx`,
 * (optionally) `src/app/api/void-<name>/route.ts`, then add ONE entry to
 * VOID_PANELS below. Never touch the ContentRouter switch or the navGroups
 * literal. See mission-control/README-VOID.md → "Adding a VOID panel".
 */

import type { ComponentType } from 'react'
import { registerNavItems, registerPanel } from './plugins'
import { VoidPlaceholderPanel } from '@/components/panels/void-placeholder-panel'
import { VoidFleetPanel } from '@/components/panels/void-fleet-panel'
import { VoidSecurityPanel } from '@/components/panels/void-security-panel'

interface VoidPanelDef {
  /** URL slug + nav id + registry key. Must start with `void-`. */
  id: string
  label: string
  /** emoji rendered as the nav icon */
  icon: string
  /** must be an existing nav group id: core | observe | automate | admin */
  groupId: 'core' | 'observe' | 'automate' | 'admin'
  component: ComponentType
}

const VOID_PANELS: VoidPanelDef[] = [
  {
    id: 'void-fleet',
    label: 'Fleet (VOID)',
    icon: '⚓',
    groupId: 'observe',
    component: VoidFleetPanel,
  },
  {
    id: 'void-security',
    label: 'Security (VOID)',
    icon: '🐋',
    groupId: 'admin',
    component: VoidSecurityPanel,
  },
  {
    id: 'void-placeholder',
    label: 'VOID wiring',
    icon: '🔌',
    groupId: 'observe',
    component: VoidPlaceholderPanel,
  },
]

let _registered = false

/** Idempotent — safe if imported from more than one client entry. */
export function registerVoidPlugins(): void {
  if (_registered) return
  _registered = true

  registerNavItems(
    VOID_PANELS.map(p => ({
      id: p.id,
      label: p.label,
      icon: p.icon,
      groupId: p.groupId,
    }))
  )

  for (const p of VOID_PANELS) {
    registerPanel(p.id, p.component)
  }
}

// Register at module-eval time so `getPluginNavItems()` / `getPluginPanel()` are
// populated before nav-rail / ContentRouter first render.
registerVoidPlugins()
