# dashboard_server.py — full inventory (card 12097)

Feeds the Captain's-Dashboard → Mission Control migration (`MIGRATION-PLAN.md`).
Source: `Captain_Dashboard/dashboard/dashboard_server.py` (5,297 lines) +
`dashboard/tabs/*.html` (28 files). Static snapshot 2026-08-31 (Sir Cobalt).

The plan's §4 decision: strip this to a **headless JSON collector on `0.0.0.0:8080`**
(keep `/api/*`, drop `/tab/*` + HTML/static), MC panels pull via `/api/void-proxy`.
This doc is what "keep `/api/*`" actually means.

---

## 1. `/api/*` endpoints — PROXY vs LOCAL

**PROXY** = forwarded to the tr3asure backend `http://127.0.0.1:5000` via
`handle_proxy_api` / `handle_local_proxy_json` (both wrap the target error as
`{"error":"proxy_failed: …","target":…}`). These are DEAD when tr3asure isn't
booted — MC must not depend on them for dashboard-only views.

| Route(s) | → 127.0.0.1:5000 path | Method |
|---|---|---|
| `/api/auth`, `/api/auth/{login,logout,status,whoami,profiles,profile,register}` | `/api/auth*` | GET/POST/PATCH |
| `/api/augur`, `/api/augur/scan/status`, `/api/augur/augmented_signals` | `/api/augur*` | GET |
| `/api/alpaca`, `/api/trades`, `/api/paper_trades`, `/api/positions` | same | GET |
| `/api/ticker_fundamentals`, `/api/fundamentals` | same | GET |
| `/api/fleet/data`, `/api/fleet/compute` | `/api/fleet/*` | GET |
| `/api/data/sources`, `/api/data/sources/{status,preferences}` | `/api/data/sources*` | GET/POST |
| `/api/market/*` (account/balance/orders/positions/quotes/risk/symbols/watchlist/performance/portfolio) | `/api/market/*` or local stub | GET |
| `/api/backtest`, `/api/genome`, `/api/pool`, `/api/download`, `/api/execute`, `/api/oco`, `/api/bracket`, `/api/killswitch/*`, `/api/signals` | `/api/*` on :5000 | GET/POST |
| `/api/schwab/*`, `/api/augur/authorize`, `/api/augur/manual_signal`, `/api/augur/bracket*`, `/api/augur/oco*` | schwab/augur on :5000 | GET/POST |

Also: a `handle_local_tm_stub_api` returns **paper stubs** for
`/api/account /balance /orders /watchlist /performance /risk` when :5000 is down
(so those never hard-fail).

**LOCAL** = computed in-process (the real collector work). These are what MC's
VOID panels consume today:

| Route | Handler | Returns |
|---|---|---|
| `/api/status`, `/api/stat/{ships,services,network,tools,vault,comms}` | `handle_api_status` / `handle_stat_api` | full cached status blob (ships/ship_details/containers/network/services/health) |
| `/api/fleet` | `handle_fleet_api` | `{generated, hive_mind:{ships_total,ships_online,ships_pending_agent,sync_complete}, ships:{<N>:{ship,crew,lane,state,agent_installed,agent_version,last_seen,seconds_ago,ip,tailscale_ip,os,cpu_count,disk_free_gb,services,tooling}}}` |
| `/api/ships` | `handle_stat_api(['ships','ship_details','latency'])` | `{ships:{<N>:"online"}, ship_details:{<N>:{ip,status,role,ports,latency}}}` |
| `/api/fleet/mesh`, `/api/mesh/status` | `handle_fleet_mesh_api` | mesh orchestrator state + live ship status from `CREW_HEARTBEATS`; **proxies `/api/fleet_mesh` to :5000** (so partly PROXY) |
| `/api/fleet/verify`, `/api/fleet/version`, `/api/fleet/art`, `/api/fleet/llm` | `handle_fleet_verify/version/art/llm_api` | fleet manifest / version / AI-art / LLM routing |
| `/api/hw`, `/api/rig-report` | `handle_hw_api` / `handle_rig_report_api` | `{local_rig:{hostname,cpu:{Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed},memory:{total_gb},disks:[{DeviceID,total_gb,free_gb}],gpu:{Name,adapter_ram_mb},timestamp}}` |
| `/api/containers`, `/api/docker` | inline | `{containers:{total,running,fleet,security,k8s,names:[…]}}` — shells `docker volume/images/network ls` |
| `/api/pinkcady` | `handle_pinkcady_api` | `{verdict,clear_to_boot,captain_msg,evidence,last_check,sentinel_heartbeat:{last_seen,data:{ship,timestamp,status,tailscale,services,git:{dirty,changes,sha},notes}}}` |
| `/api/crew`, `/api/crew/infra`, `/api/crew_heartbeat` | `handle_crew_api` / `handle_crew_infra_api` / `handle_crew_heartbeat` | crew presence + infra + POST heartbeat sink |
| `/api/security` | `handle_security_api` | `{generated,host,components:{crowdsec:{alive,cumulative_bans,active_decisions_now},suricata:{alive,packets_captured,packets_dropped,note},zeek:{alive,note}},defensive_summary}` |
| `/api/opsec`, `/api/stat/vault` | `handle_opsec_api` / `handle_stat_api(['vault','opsec'])` | `{opsec:{shared_with_pink_gitignored,real_secrets_tracked,chinese_content_files,all_clear,deployed_modules:{…}}}` + `{vault:{mounted,git_clean,latest_commit,file_count,size_mb,uncommitted_files}}` |
| `/api/scanner` | `handle_scanner_api` | `{scanner,last_scan,status,ooda_loop}` |
| `/api/crowdsec`, `/api/ids`, `/api/suricata` (via `/api/ids`) | `handle_*` | CrowdSec decisions / Suricata alerts |
| `/api/whale` | `handle_whale_api` / `handle_white_whale_api` | **passphrase-gated** — see §5 |
| `/api/monitor`, `/api/monitoring`, `/api/kuma` | `handle_monitor_api` / `handle_kuma_api` | monitoring-stack rollup + per-tool `{running,port}` |
| `/api/grafana`, `/api/prometheus`, `/api/cadvisor`, `/api/netbox/status` | inline / `handle_netbox_status_api` | `{<tool>:{running,port,…}}` reachability |
| `/api/git-sync` | `handle_git_sync_status` | `{repos:[{repo,exists,branch,dirty,changes}]}` — shells `git status/log` per repo |
| `/api/dataview` | `handle_dataview_api` | `{dataview_records:[{file,ship_name,role,ip,latency,status,open_ports,containers,last_seen,fleet_mesh_connected,timestamp}]}` |
| `/api/traffic` | `handle_traffic_api` | network traffic snapshot |
| `/api/remotectl` | `handle_remotectl_api` | remote ship control (shells `ssh`) |
| `/api/heal` | `handle_heal_api` | self-heal actions |
| `/api/network/alerts` | `handle_network_alerts_api` | LAN device / intrusion alerts |
| `/api/captain` | `handle_captain_api` | captain HQ summary |
| `/api/tickets`, `/api/ticketing`, `/api/github`, `/api/inbox` | `handle_tickets/ticketing/github_issues/…` | Trello + GitHub issues (shells GitHub API via urllib) |
| `/api/alerts`, `/api/alerts/test`, `/api/network/alerts` | `handle_alerts_api` | dashboard alert bus |
| `/api/art`, `/api/fleet/art`, `/api/persona` | `handle_art_api` / `handle_persona_api` | AI-art gallery + persona assets |
| `/api/diagram` | `handle_diagram_api` | architecture diagram data |
| `/api/game`, `/api/tools`, `/api/sandbox` | `handle_game/tools_classification/sandbox_api` | misc |
| `/api/fodavp/{activate,trigger,status,stop}` | `handle_fodavp_*` | FODAVP watcher control |
| `/api/schedule`, `/api/content`, `/api/comms`, `/api/settings`, `/api/persona`, `/api/sectors` | `handle_*` | scheduling / content / cipher comms / settings |
| `/api/health`, `/api/healthz` | `handle_healthz` | liveness |
| `/api/tabs`, `/api/dashboard/tabs` | `handle_tabs_api` | tab manifest (DROP with the HTML) |
| `/api/tornado-inventory` | `handle_tornado_inventory_api` | inventory |

~180 distinct path patterns; ~90 `handle_*` functions.

## 2. `/tab/<name>` + tabs

`handle_tab` serves `dashboard/tabs/<name>.html`; `handle_html` serves the shell.
28 tab files: alerts, art, augur-trading, auth, cadvisor, captain, crew, crowdsec,
dataview, diagram, fleet, fleet_version, git-sync, grafana, hardware, hivemind,
mission-control, monitoring, netbox, prometheus, rig-report, sandbox, security,
suricata, tickets, tools, toruspos, whitewhale.
→ **All of this is DROPPED in the headless-collector move** (MC panels replace it;
disposition per tab in `MIGRATION-PLAN.md` §3).

## 3. Static assets

`handle_static` serves `/static/*`, `/assets/*`, `/favicon.ico` from
`SHARED_WITH_PINK/dashboard/static/` (falls back to a bundled favicon).
`handle_html` inlines the shell CSS/JS. **Nothing external depends on these** once
the tabs are gone — safe to drop with the HTML.

## 4. External deps per handler

| Dep | Used by |
|---|---|
| `subprocess docker volume/images/network ls` | `/api/containers`, `/api/docker` |
| `subprocess git status/log/ls-files` | `/api/git-sync`, `/api/opsec` (secret-pattern scan: `git ls-files *.env *.key *.pem secrets*`) |
| `nmap` via the **kali-full Docker container** | LAN discovery `192.168.0.0/24` (fleet/network scan) |
| `subprocess arp` | LAN device table |
| `VBoxManage list hostonlyifs` | host-only network detection |
| `ssh` | `/api/remotectl` (remote ship commands) |
| `http.client HTTPSConnection 127.0.0.1:2376` | Docker **proxy** port (`DOCKER_PROXY_PORT`, TLS) |
| `urllib.request` → `api.github.com` | `/api/github`, `/api/tickets` (issues), Schwab OAuth token exchange |
| `urllib.request` → `127.0.0.1:5000` | all PROXY routes + `/api/signals` |
| FS paths | `VAULT_PATH/02_Business_Operations/state/fleet_mesh_state.json`, `fleet_mesh_learned.json`, `CREW_HEARTBEATS`, `SHARED_WITH_PINK`, fleet manifest JSON |

→ The headless collector still needs: host `docker` CLI, host `git`, the kali
container for nmap, `ssh` keys for remotectl, and the vault state-file paths. That
is why it stays a **host process**, not a container (MIGRATION-PLAN §1d/§4).

## 5. Auth / gating

- **Session auth**: PROXY auth routes forward to tr3asure's own `/api/auth/*`.
  Most LOCAL `/api/*` endpoints are **unauthenticated** (LAN-trust model) — fine
  behind `/api/void-proxy` (MC adds `requireRole('viewer')`).
- **WHITE WHALE** (`/api/whale`, `handle_whale_api` / `handle_white_whale_api`):
  `verify_passphrase(provided_hash)` = `hmac.compare_digest(provided_hash,
  WHITE_WHALE_PASSPHRASE_HASH)` — constant-time, good. BUT
  `WHITE_WHALE_PASSPHRASE_HASH = hashlib.sha256(b"voidpirate_captain_2026")` is
  **hardcoded in the source (line 138)** with the plaintext in a comment.
  ⚠️ **OPSEC**: the "classified" gate's passphrase is committed in cleartext.
  MC's `void-whale` route forwards to this — so whoever can read
  `dashboard_server.py` has WHITE WHALE. Rotate to an env var
  (`WHITE_WHALE_PASSPHRASE_HASH` from `treasure_map_keys.env` / a new key file)
  before the migration hardens.
- `_log_whale_attempt(ip, passphrase_correct, threat_declared)` audit-logs every
  attempt — keep this in the collector.

## 6. Bind + startup

- `server = ThreadedHTTPServer(('0.0.0.0', DASHBOARD_PORT), DashboardHandler)` at
  **line 5127**; `DASHBOARD_PORT = 8080` (line 114). `serve_forever()`.
- `ThreadingMixIn` — one thread per request.
- **No `start.bat` / `start.ps1` found** under `Captain_Dashboard/`. It is started
  manually (`python dashboard_server.py`) or by an external watchdog. During this
  session it kept dying when the launching shell exited — it needs a persistent
  launcher (nohup / a service / Scheduled Task) once it's the headless collector.
- Line ~5102 comment notes a prior `hive-mind-dashboard/app.py` also bound
  `0.0.0.0:8080` (now archived) — no port conflict today.

---

## Migration checklist (derived)

1. Fork `dashboard_server.py` → keep the DashboardHandler `do_GET`/`do_POST`
   dispatch for `/api/*` only; delete `handle_tab`, `handle_html`, `handle_static`,
   the tab manifest, and `dashboard/tabs/` + `dashboard/static/`.
2. Keep every LOCAL handler from §1. Keep the PROXY passthroughs (they already
   fail soft when :5000 is down).
3. Add a persistent launcher (Scheduled Task) — see the MC agent-loop card for the
   pattern.
4. Move `WHITE_WHALE_PASSPHRASE_HASH` to an env var. (opsec, do first)
5. MC panels already point at these via `/api/void-proxy/<name>` — the ALLOW set in
   `src/app/api/void-proxy/[...path]/route.ts` covers status/fleet/ships/hw/
   containers/pinkcady/security/opsec/scanner/git-sync/vault/dataview/crew/
   crowdsec/monitor/monitoring/traffic/tickets. Add any others a panel needs.
