# Mission Control — VOID Pirate setup

Upstream: `github.com/builderz-labs/mission-control` (alpha). This dir is an upstream
checkout — pull updates with `git -C . pull`. Our config lives in **untracked** sidecars
so it never collides with upstream:

| File | Purpose |
|---|---|
| `.env` | `MC_PORT=3100`, pinned `COMPOSE_PROJECT_NAME`, allowed hosts |
| `docker-compose.void.yml` | logging + local cookie/HSTS settings + `mc-internal` net; **no `ports:`** (single binding comes from base `${MC_PORT}:3000`) |
| `void-mc.sh` | wrapper → `docker compose -p builderz-mission-control-repo -f docker-compose.yml -f docker-compose.void.yml …` |
| `docker-compose.override.yml.disabled` | Sir Green's old override — it *appended* a 2nd `:3001` mapping (compose merges `ports`). Neutralised. |
| `agents/mc-agent-loop.sh` / `mc-report.sh` | pull-model agent client |

## Run

```bash
./void-mc.sh up -d          # http://localhost:3100
./void-mc.sh logs -f | ps | down
```

Health: `curl -H "x-api-key: $MISSION_CONTROL_API_KEY" http://localhost:3100/api/status?action=health`
(`MISSION_CONTROL_API_KEY` is in `_KEY_VAULT/secrets.env`; the same key is stored in MC's DB
in the `mc-data` volume.)

## Ports (de-conflicted 2026-08-31)

MC was on **:3000 AND :3001** — collided with tr3asure's Vite dev server (`:3000`) and the
dormant Gitea image. Moved to **:3100** (single binding). `:3000`/`:3001` are now free.

## How it connects

- **Model: pull.** Every agent (`sir-cobalt` via the `claude` runtime, `sir-green` via Hermes,
  Miss Pink, Sir Azure) registers with MC and polls `POST /api/adapters` for assignments
  (`register → heartbeat 5m → assignments → report`). MC is the shared task board + human UI.
- **Why not push-dispatch to Hermes:** the MC container has no `hermes` binary, no
  `~/.hermes` mount, `HOME=/nonexistent` — it cannot spawn the host CLI. Decided
  (VOID Ops 12124): **OpenClaw is MC's push gateway**, Hermes stays pull-model.
  `RUNTIME_CAPABILITIES.hermes.dispatch = false` is correct and stays. The
  MC→Hermes-CLI dispatcher card (12077) is a dead end — recommend close.
- **Agent record:** created once via `POST /api/agents` (operator action). `sir-cobalt` = id 1,
  role `dev`, runtime `claude`.
- **Projects:** `tr3asure mAp` (TRE), `Captain's Dashboard` (CAP), `Torus Coffee` (TOR),
  `Crownless Fortune` (CRW), `VOID Pirate Website` (WEB).
- **Captain's Dashboard:** as of 2026-08-31 the Captain's decision is that **MC becomes THE
  Captain's Dashboard** — `dashboard_server.py` + `tabs/*.html` get migrated into MC panels /
  API routes, then retired (tracked on VOID Ops → "PROJECT: Pirate Captain's Dashboard"). The
  current `dashboard_server.py` `:3100` health monitor + `🚀 Mission Control` iframe tab
  (`tabs/mission-control.html`) are **interim** until that migration lands. tr3asure mAp stays
  a separate app.
- **Composio:** MC has no native Composio hook. When an MC task needs an external action
  (email, GitHub issue, calendar…), the assigned agent uses `composio-cobalt`
  (`--user-id sir-cobalt`). No MC code change.
- **Skills:** the 63 Skills-Vault skills are live for the agents (`~/.claude/skills`).
  Surfacing them inside MC's `/api/skills` registry needs the vault mounted into the container
  — deferred (follow-up).

## Agent quickstart (any crew machine)

```bash
# one-time: create the agent record (operator)
curl -X POST http://localhost:3100/api/agents -H "x-api-key: $MISSION_CONTROL_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"name":"<agent-id>","role":"dev","status":"online","config":{"runtime":"hermes"}}'
# then run the loop
./agents/mc-agent-loop.sh <agent-id> "<Display Name>" code,review
```

## VOID panels (registered in `src/lib/plugins-void.ts`)

| Nav item | Panel file | Shows |
|---|---|---|
| ⚓ Fleet (VOID) | `void-fleet-panel.tsx` | ships / local rig / Docker / PINKCADY boot verdict |
| 🐋 Security (VOID) | `void-security-panel.tsx` | CrowdSec / Suricata / Zeek, OPSEC, OODA scanner, WHITE WHALE box |
| 📈 Monitoring (VOID) | `void-monitoring-panel.tsx` | Prometheus + cAdvisor iframes; Grafana / NetBox links |
| 📚 Vault (VOID) | `void-vault-panel.tsx` | git-sync repo table + vault stats + OPSEC red/green |
| 🩺 Hive Health (VOID) | `void-hivehealth-panel.tsx` | **one green/amber/red verdict** from `/api/void-proxy/monitor` — service reachability + live Prometheus alerts (from `dashboard/monitoring/fleet_alerts.yml`) + scrape-target up/down + MC agent roster + tr3asure fleet. VOID Ops 12159 + 12160. |
| 🔌 VOID wiring | `void-placeholder-panel.tsx` | collector-OK dot (Phase 0 sanity) |

## Adding a VOID panel (Phase 0 wiring — trello /c/GxKtde1b)

MC ships a plugin registry (`src/lib/plugins.ts`) that upstream never populates.
Phase 0 lights it up. The rules keep `git pull` clean:

**New files only:**
- `src/components/panels/void-<name>-panel.tsx` — a `'use client'` component.
- `src/app/api/void-<name>/route.ts` — optional, if it needs its own server route.
- Panels reach host data through **`/api/void-proxy/<collector>[/<sub>]`** →
  `http://host.docker.internal:8080/api/<collector>` (dashboard_server.py, bound
  `0.0.0.0:8080` on the host). Add the collector's first path segment to the
  `ALLOW` set in `src/app/api/void-proxy/[...path]/route.ts`. `host.docker.internal`
  is already mapped via `extra_hosts` in the base `docker-compose.yml`.

**One registration edit:** add an entry to `VOID_PANELS` in
`src/lib/plugins-void.ts` (`id` must start with `void-`; `groupId` must be an
existing nav group: `core` | `observe` | `automate` | `admin`).

**Never touch:** the `ContentRouter` `switch` in `src/app/[[...panel]]/page.tsx`
(only its one `import '@/lib/plugins-void'` line is ours) or the `navGroups`
literal in `src/components/layout/nav-rail.tsx`.

Verify: `pnpm install && pnpm typecheck && pnpm build`, then rebuild the image
(`./void-mc.sh build && ./void-mc.sh up -d`) — the `⚓ VOID` item appears under
OBSERVE and `void-placeholder` shows a green "Collector OK" dot when
dashboard_server.py is running on the host.
