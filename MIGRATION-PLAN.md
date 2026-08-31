# Captain's Dashboard → Mission Control — migration plan

**Decision (Captain, 2026-08-31):** Mission Control *becomes* the Pirate Captain's
Dashboard. `Captain_Dashboard/dashboard/dashboard_server.py` (5,295 lines, :8080) +
`dashboard/tabs/*.html` (28 tabs) get migrated into MC, then retired. **tr3asure mAp
stays a fully separate app** — its trading UI, AUGUR, and broker-OAuth screens do not
move into MC.

Card: VOID Ops → "PROJECT: Pirate Captain's Dashboard" →
`[EPIC][SIR COBALT] MC extensibility audit + … migration plan` (trello /c/XG1jfadD).
This file is that card's deliverable.

---

## 1. How Mission Control is extended (audit result)

MC is Next.js 16 App Router. Adding UI = adding a **panel**; adding data = adding an
**API route**. There is a partial plugin system and three seams.

### 1a. The panel router
`src/app/[[...panel]]/page.tsx` → `ContentRouter({tab})` is one big `switch (tab)`.
The URL `'/foo'` sets `activeTab = 'foo'`. Unmatched tabs fall to:

```ts
default: { return renderPluginPanel(tab) }   // → getPluginPanel(id) ?? <Dashboard/>
```

### 1b. The plugin registry — **exists but is dormant**
`src/lib/plugins.ts` defines module-scoped registries + `register*()` / `get*()`:

| register | consumed by |
|---|---|
| `registerPanel(id, Component)` | `renderPluginPanel` in the panel router `default:` case |
| `registerNavItems([{id,label,icon,groupId}])` | `nav-rail.tsx` `mergedGroups` (merges into core/observe/automate/admin groups) |
| `registerIntegrations([...])` | `/api/integrations` (env-var + vault-item driven connection cards, with `testHandler`) |
| `registerCategories`, `registerToolProviders` | integrations UI, `agent-templates.ts` |

**Nothing calls the `register*` functions.** No `src/plugins/` dir, no loader. So the
registry is scaffolding we can light up with ONE init module + minimal upstream edits.

### 1c. The three integration seams (minimal-collision extension)
1. **New API routes** — `src/app/api/void-*/route.ts`. Brand-new files, zero upstream
   collision. Use `requireRole(request,'viewer'|'admin')` from `@/lib/auth` for RBAC.
2. **New panel components** — `src/components/panels/void-*.tsx`. Brand-new files.
3. **Wiring** — a new `src/lib/plugins-void.ts` that calls `registerPanel` +
   `registerNavItems`, plus a `src/plugins-init.ts` imported once. The only edits to
   *tracked upstream files* are 1–2 import lines (`import '@/plugins-init'`). Keep our
   `.env`, `docker-compose.void.yml`, sidecars untracked as today so `git pull` is clean.

### 1d. Docker constraint
MC runs in a container with **no host bind mounts**. It cannot read the host FS
(Skills Vault, `~/.claude`, repo working trees, `tailscale status`, `nmap`, `docker`).
Any panel that needs host data needs EITHER a RO bind mount added to
`docker-compose.void.yml` OR it pulls from a host-side collector over HTTP (see §4).

---

## 2. MC native coverage (already built — reuse, don't rebuild)

| MC native | Route / panel | Replaces dashboard tab(s) |
|---|---|---|
| System monitor | `/api/system-monitor` (cpu/mem/disk/gpu/net/procs) + `monitor` panel | `hardware`, `rig-report` (single-host part), `monitoring` (host part) |
| Alerts engine | `/api/alerts` (DB rules, conditions, actions, cooldown) + `alerts` panel | `alerts` |
| Security scan/audit | `/api/security-scan`, `/api/security-audit` + `security` panel | generic part of `security` |
| Tasks / board | `/api/tasks` (+ `project_id`) + `tasks` panel | `tickets` (task side), `hivemind` |
| Agents / squad | `/api/agents`, `/api/adapters` + `agents` panel | `crew`, `hivemind` |
| GitHub sync | `/api/github` + `github` panel | `tickets` (GH issues side) |
| Cron + scheduler | `/api/cron`, `/api/scheduler` + `cron` panel | dashboard cron jobs |
| Memory graph | `/api/memory` + `memory` panel | — |
| Skills registry | `/api/skills` + `skills` panel | — (needs vault RO mount to populate) |
| Cost / tokens | `/api/tokens` + `cost-tracker` panel | — |
| Backup | `/api/backup` | dashboard has none |
| Standup / quality-review | `/api/standup`, `/api/quality-review` | — |
| Nodes | `/api/nodes` — **gateway-oriented (OpenClaw probe), NOT our Tailscale fleet** | partial `fleet` |
| Channels | `/api/channels` — **gateway comms, NOT our crew inbox** | partial `crew` |

---

## 3. Per-tab disposition (28 tabs)

Legend: **NATIVE** = use MC as-is · **IFRAME** = MC panel that embeds the tool ·
**VOID-PANEL** = custom MC panel + `void-*` API route · **KEEP-TR3** = stays in
tr3asure mAp · **DROP** = retire.

| Tab | dashboard_server.py backing | Disposition | Card |
|---|---|---|---|
| `captain` | `/api/captain`, `/api/status` | **NATIVE** (Overview) | EPIC |
| `alerts` | `/api/alerts` | **NATIVE** | EPIC |
| `hardware` | `/api/hw` | **NATIVE** (`monitor`) | EPIC |
| `rig-report` | `/api/hw`, `/api/ships` | **NATIVE** single-host; multi-host row → VOID-PANEL | 12082 |
| `monitoring` | `/api/monitoring`, `/api/kuma` | **NATIVE** monitor + small health-grid in VOID-PANEL | 12081/12082 |
| `grafana` | proxy `:3002` | **IFRAME** | 12081 |
| `prometheus` | proxy `:9090` | **IFRAME** | 12081 |
| `cadvisor` | proxy `:8081` | **IFRAME** | 12081 |
| `netbox` | proxy `:8001` | **IFRAME** | 12081 |
| `fleet` | `/api/fleet`, `/api/fleet_mesh`, `/api/ships`, `/api/pinkcady` | **VOID-PANEL** (Tailscale + LAN discovery; MC `/api/nodes` doesn't fit) | 12082 |
| `fleet_version` | `fleet_manifest.json` | **VOID-PANEL** (fold into fleet) | 12082 |
| `crew` | `/api/crew`, `/api/crew_heartbeat` | **VOID-PANEL** small (or fold into agents) | 12082 |
| `security` | `/api/security`, `/api/scanner` | **VOID-PANEL** + reuse `/api/security-scan` | 12082 |
| `whitewhale` | `/api/whale`, `/api/opsec` | **VOID-PANEL**, passphrase gate via MC `admin` role + secret | 12082 |
| `crowdsec` | `/api/crowdsec`, `/api/ids` | **VOID-PANEL** (low priority) or IFRAME | 12082 |
| `suricata` | `/api/ids` | **DROP** (fold status into security panel) | 12082 |
| `dataview` | `/api/dataview` | **VOID-PANEL** vault health | 12083 |
| `git-sync` | vault git status | **VOID-PANEL** repos & vault (READ-ONLY git) | 12083 |
| `tickets` | `/api/tickets`, `/api/ticketing`, GH issues | **NATIVE** tasks + `/api/github`; Trello stays via `composio-cobalt` | EPIC |
| `hivemind` | legacy `capta1n_orchestrat0r` (dead path) | **DROP** (already archived) | 12085 |
| `sandbox` | `/api/sandbox` | **NATIVE** (`exec-approvals` / terminal) or DROP | EPIC |
| `diagram` | `/api/diagram` | **DROP** or tiny VOID-PANEL | 12082 |
| `tools` | `/api/tools/classification` | **DROP** (fold into settings) | EPIC |
| `art` | `/api/art` | **DROP** (or low-pri VOID-PANEL gallery) | — |
| `augur-trading` | proxy → tr3asure mAp backend | **KEEP-TR3**; optional read-only iframe link from MC | — |
| `toruspos` | `/api/toruspos` | separate project (TOR) — IFRAME link, not dashboard core | — |
| `auth` | `/api/auth` (Schwab/Alpaca OAuth) | **KEEP-TR3** (broker auth belongs to the trading app) | — |
| `mission-control` | iframe of `:3100` | **REMOVE** (MC is now the host) | 12085 |

Rollup: 5 NATIVE · 4 IFRAME · ~9 VOID-PANEL · 3 KEEP-TR3 · ~7 DROP.

---

## 4. Data-flow decision — **hybrid, headless collector**

`dashboard_server.py` has ~40 bespoke collector endpoints (`fleet_mesh`, `pinkcady`,
`traffic`, `remotectl`, `opsec`, `scanner`, `vault`, `comms`, `heal`, `dataview`,
`hw`, `ships`, …). Reimplementing all as MC TypeScript routes up front is a large,
risky port.

**Plan:**
1. Strip `dashboard_server.py` to a **headless JSON collector daemon** on `:8080` —
   delete the HTML/tab serving (`/tab/*`, static tab files), keep the `/api/*`
   collectors. It runs on the host (FS + `docker` + `tailscale` + `nmap` access).
2. MC custom panels call a thin **`/api/void-proxy/[...path]`** route (server-side
   `fetch('http://host.docker.internal:8080/api/…')`, allow-list of paths, `viewer`
   role). One new file, no host mount needed. *Confirmed feasible:*
   `dashboard_server.py:5127` binds `('0.0.0.0', 8080)`, so the container reaches it
   via `host.docker.internal` once that host alias is added to
   `docker-compose.void.yml` (`extra_hosts: host.docker.internal:host-gateway`).
3. Migrate individual collectors from Python → native MC routes / cron jobs
   **opportunistically**, highest-value first (`system-monitor` already native;
   `fleet` and `security-scan` next). Retire the daemon once the last collector moves.

This keeps the UI 100% MC now, de-risks the collector port, and gives a clean
end state.

---

## 5. Phased delivery

**Phase 0 — foundation (SIR COBALT — CODE DONE 2026-08-31, verify carded /c/GxKtde1b):**
plugin registry lit up. New files: `src/lib/plugins-void.ts` (registers nav item +
panel), `src/components/panels/void-placeholder-panel.tsx`,
`src/app/api/void-proxy/[...path]/route.ts` (allow-listed `viewer`-gated proxy to
`host.docker.internal:8080`). One tracked edit: `import '@/lib/plugins-void'` at the
top of `src/app/[[...panel]]/page.tsx`. No `src/plugins-init.ts` needed — the client
`page.tsx` import is sufficient and `layout.tsx` is server-side. No compose change —
base `docker-compose.yml` already has `extra_hosts: host.docker.internal:host-gateway`.
`README-VOID.md` → "Adding a VOID panel". **Remaining: `pnpm install`/`typecheck`/
`build` + image rebuild + confirm the panel renders — Sir Green (mechanical).**
Blocks Phase 2–3.

**Phase 1 — iframe embeds (SIR GREEN, 12081):** Grafana/Prometheus/cAdvisor/NetBox
as iframe panels + health dots. No collector dependency. Ships independently after
Phase 0.

**Phase 2 — VOID panels, hard (SIR COBALT, 12082):** fleet/LAN discovery + WHITE
WHALE security console, via `void-proxy` → headless collector. Passphrase gate =
MC `admin` role + secret.

**Phase 3 — VOID panels, medium (SIR GREEN draft / SIR COBALT review, 12083):**
repos & vault health, read-only git status + OPSEC red/green.

**Phase 4 — hardening (SIR GREEN, 12084):** scheduled `/api/backup`, restart policy,
auth scope (which Tailscale hosts reach `:3100`), API-key rotation.

**Phase 5 — retire (SIR COBALT, 12085):** confirm parity, archive
`dashboard/` → `Captain_Dashboard/_archive/dashboard-v3-python/` (or keep the
headless collector under `mission-control/collectors/`), strip HTML serving, remove
the interim `mission-control.html` iframe tab + the `dashboard_server.py` startup
from any start script, update `Captain_Dashboard/README` + `QUICK_REFERENCE.md` +
`SETUP_GUIDE.md`.

---

## 6. Risks

- **Upstream drift.** MC is alpha. Keep all edits in new `void-*` files + untracked
  sidecars; the only tracked-file change is an import line. Re-verify after each
  `git pull`.
- **No host mounts.** Fleet / vault / security panels are blocked on either the
  headless collector (preferred) or new RO bind mounts. Decided: collector.
- **`git pull` conflict on the import line.** If it churns, move the import into an
  untracked file that Next auto-loads (e.g. `instrumentation.ts` if not already
  tracked) — check at Phase 0.
- **WHITE WHALE is classified.** The passphrase gate must survive the port — MC RBAC
  `admin` + a separate secret, not just "logged in".
- **git-guardrails** blocks `git push` this session — commits fine, Captain pushes.
