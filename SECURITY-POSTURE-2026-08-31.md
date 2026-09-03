# Mission Control — Security Posture scan: per-item disposition

Scan blended score **70%** (needs-attention), 2026-08-31. Sir Cobalt triage.
MC runs as one Linux container on SQUIDSTATION, plain **HTTP on :3100**, LAN-only,
`mc-internal` bridge is `internal: true`. Config lives in
`mission-control/.env` (secrets, gitignored) + `docker-compose.void.yml` (env).

Legend: **FIX NOW** · **CAPTAIN** · **SIR GREEN (OpenClaw card)** · **NEEDS HTTPS** · **N/A (container)**

---

## Credentials — 50%

| Item | Disposition |
|---|---|
| Admin password not configured (`AUTH_PASS`) | **CAPTAIN** — add `AUTH_PASS='<12+ char strong>'` (or `AUTH_PASS_B64=`) to `mission-control/.env`. Note: a real admin already exists (created via `/setup`), so this does **not** reseed it — it only clears the scanner flag and enables a headless re-seed if the DB is ever wiped. Do **not** commit `.env` (already gitignored). |
| API key configured | ✅ green (`MISSION_CONTROL_API_KEY` from `_KEY_VAULT/secrets.env`) |

## Network — 27%

| Item | Disposition |
|---|---|
| Gateway host is `host.docker.internal` | **KEEP AS-IS.** MC is in a container; `host.docker.internal` is how it reaches the host gateway. Setting `OPENCLAW_GATEWAY_HOST=127.0.0.1` would point MC at its **own** container loopback → broken. The correct control is to bind the *gateway itself* to loopback on the host — that's `gateway.bind: "loopback"` in `openclaw.json` (see OpenClaw §). |
| HSTS not enabled (`MC_ENABLE_HSTS=1`) | **NEEDS HTTPS.** MC serves plain HTTP on :3100. HSTS with no TLS makes the origin unreachable. Only enable if a TLS reverse proxy is put in front of MC. |
| Secure cookies (`MC_COOKIE_SECURE=1`) | **NEEDS HTTPS.** `docker-compose.void.yml` sets `MC_COOKIE_SECURE=0` deliberately ("local http, not https"). `Secure` cookies are dropped over plain HTTP → login breaks. Flip to `1` only alongside TLS. |
| Host allowlist configured | ✅ green (`MC_ALLOWED_HOSTS` set to localhost + squidstation + tailscale + LAN) |

## OpenClaw — 28% (9 issues) → **SIR GREEN**, card "Stand up the OpenClaw gateway" (`/c/…6a957ff7`)

All nine live in `C:\Users\kidsm\.openclaw\openclaw.json` (bind-mounted RO into MC at
`/run/openclaw`). The gateway is **not running yet** — hardening this file is part of
standing it up. Recommended additions (merge into the existing file, keep `gateway.auth`):

```jsonc
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",                       // was: unset  (C — external access)
    "auth": { "mode": "token", "token": "<ROTATED — see key-rotation card>" }
  },
  "session":  { "dmScope": "per-channel-peer" }, // was: default (M — context leak)
  "logging":  { "redactSensitive": "tools" },    // was: unset  (L — secrets in logs)
  "agents": {
    "defaults": {
      "model": { "primary": "ollama/qwen3.5" },
      "sandbox": { "mode": "all" }              // was: unset  (M — no isolation)
    }
  },
  "tools": {
    "profile": "restricted",                    // was: default (L)
    "exec": { "security": "allowlist" },        // was: default (H — unrestricted exec)
    "fs":   { "workspaceOnly": true },          // was: unset  (M — escapes workspace)
    "deny": ["group:automation", "group:runtime", "group:fs"]  // (L) for agents that don't need them
  }
}
```
File perms 777 → the scanner reads the Windows→Linux bind-mount presentation; the host
file is 644. Not fixable from the container. If OpenClaw ever runs natively on Linux,
`chmod 600 openclaw.json`.
`Elevated mode disabled` + `Token auth enabled` are already ✅.

## Runtime — 88%

| Item | Disposition |
|---|---|
| No MCP calls logged in 24h | **Cosmetic** — self-resolves once agents make MCP calls. Injection guard / DB integrity / rate-limiting / backup all ✅. |

## OS Security — 55% (7 issues) → **mostly N/A for an app container**

The scan runs **inside** the MC container (UID 1001, "container environment detected",
0 listening ports). These are host-hardening controls and are meaningless in an
ephemeral app container:

| Item | Disposition |
|---|---|
| Firewall / fail2ban / unattended-upgrades / NTP | **HOST** — apply to the SQUIDSTATION Windows host, not the container. Windows has its own firewall + Update; fail2ban/ufw/NTP-via-timedatectl are Linux-host advice. Fold any real gap into the SQUIDSTATION opsec cards. |
| Disk encryption (LUKS) | **HOST** — BitLocker on SQUIDSTATION is the Windows equivalent; LUKS is Linux-only. |
| Mandatory access control (AppArmor/SELinux) | **N/A** — not available for a Windows-hosted Docker Desktop container. The base `docker-compose.yml` **already** applies `security_opt: no-new-privileges:true` + `cap_drop: ALL` + `read_only` rootfs + `tmpfs /tmp` + resource limits, so the container is about as locked as it gets on Docker Desktop. |
| 1+ world-writable file | **LOW** — inside the container image; harmless (ephemeral, non-root). Ignore. |
| Not root / ASLR / SYN cookies / /tmp noexec / core dumps / Node version | ✅ all green |

---

## Net actionable list

1. ✅ **DONE 2026-09-01 (Sir Cobalt).** `AUTH_PASS_B64` set in `mission-control/.env` (gitignored) to
   base64 of a 36-char random hex password — value never printed. Seed-only (`db.ts` uses
   `INSERT OR IGNORE`), so the existing `/setup` admin login is untouched. **Verified:** MC recreated
   (`void-mc.sh up -d`, healthy 8s, volume preserved); `GET /api/security-scan` → `auth_pass` **PASS**
   ("strong and non-default"), **credentials category 50 → 100**; `GET /api/setup` → `needsSetup:false`
   (login intact). Full scan now 19 pass / 18 warn / 2 fail.
   *Note for a future DB wipe:* `AUTH_PASS_B64` would then seed an `admin` account with that password —
   read it from `.env` or just re-run `void-mc-passwd.sh` / `/setup`.
2. **Sir Green:** apply the hardened `openclaw.json` block above when standing up the gateway
   (card `6a957ff7`). The gateway is **live** (`127.0.0.1:18789`) — Sir Cobalt does not edit it.
   Clears **8 warns + `gateway_bind`** in one shot.
3. **Deferred (needs a TLS front for MC):** `MC_ENABLE_HSTS=1` + `MC_COOKIE_SECURE=1`. Both break a
   plain-HTTP origin; only enable behind HTTPS.
4. **`gateway_local` (fail, critical) — leave as-is.** Documented Docker false-positive: MC's own
   `docker-compose.yml` comment + `.env.example` state `host.docker.internal` is the correct
   server-side value for a containerized MC; `127.0.0.1` breaks MC's `/api/gateways` route. The
   gateway is bound to host loopback — not publicly exposed.
5. **Key rotation:** the OpenClaw `gateway.auth.token` was exposed in a Sir Cobalt session transcript
   — **rotate it** (added to card 12072).
6. Container OS-hardening is already done at the compose level (`cap_drop: ALL`, `read_only`,
   `no-new-privileges`, `tmpfs`). Ignore the rest of OS Security for the container; real host items →
   SQUIDSTATION opsec.

**Item 1 done. After Sir Green's item 2 the score clears "needs-attention"** — what remains is the
HTTPS-gated pair (deferred by design for LAN-only HTTP), `gateway_local` (documented false-positive),
and cosmetic/self-resolving items.
