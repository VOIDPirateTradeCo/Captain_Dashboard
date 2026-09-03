const https = require('https')
const { URL } = require('url')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

function post(path, body, extraParams = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(BASE + path)
    u.searchParams.set('key', KEY)
    u.searchParams.set('token', TOKEN)
    for (const [k, v] of Object.entries(extraParams)) {
      u.searchParams.set(k, v)
    }
    const req = https.request(u.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }) } catch (e) { resolve({ status: res.statusCode, data: text }) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function main() {
  const VOID_OPS_P1_LIST = '6a73abbf8482da2937217d6f'
  const VOID_OPS_P2_LIST = '6a73abbf275aa5c96ab03e67'
  const VOID_OPS_P0_LIST = '6a73abbf4539aaa060199c07'
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'
  const BUG_LABEL = '6a839af9b5e7e56792d25e9c'

  const cards = [
    {
      name: '[BUG] All agents show status=offline despite active logins — heartbeat system not updating',
      desc: `**Deep Dive Finding (2026-09-03):**

Miss Pink confirmed she logged into master MC, but /api/agents shows ALL agents as "offline" with old last_seen timestamps.

**Expected behavior:**
- Agent status should update to "online" when user logs in
- Heartbeat should update last_seen periodically

**Actual behavior:**
- All 11 agents show status: offline
- last_seen timestamps are days old
- No heartbeat system is running

**Root cause analysis:**
1. Agent status may only update via /api/agents/:id/heartbeat (not via login)
2. No heartbeat daemon running on any ship
3. /api/auth/login does not update agent status

**Impact:**
- Captain Dashboard shows false "all ships offline"
- Fleet connectivity panel shows false negatives
- No real-time crew presence tracking

**Recommendation:**
- Implement automatic agent status update on login
- Deploy heartbeat daemon on each ship
- Or: treat login as implicit heartbeat`,
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] PINKCADY MC unreachable on Tailscale 100.106.235.103:3000 despite user confirmation it is connected',
      desc: `**Deep Dive Finding (2026-09-03):**

User confirmed PINKCADY is connected to Tailscale, but health probe to 100.106.235.103:3000 returns "socket hang up".

**Possible explanations:**
1. PINKCADY MC server is not running (only Tailscale is connected)
2. PINKCADY MC is running on a different port
3. Tailscale IP has changed
4. PINKCADY firewall blocking inbound on MC port

**Evidence:**
- PINKCADY Tailscale IP: 100.106.235.103
- Probe result: ERR socket hang up (5004ms)
- LAN probe: ERR socket hang up (5003ms)

**Action needed:**
- Verify PINKCADY MC is listening: \`netstat -ano | findstr :3000\`
- Check Tailscale IP: \`tailscale ip -4\`
- Start MC if not running: \`npx next dev --hostname 0.0.0.0 --port 3000\``,
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] STEALTHATTACK returns 401 Unauthorized for /api/agents and /api/fleet/*',
      desc: `**Deep Dive Finding (2026-09-03):**

STEALTHATTACK Tailscale (100.110.238.68:3000) returns:
- /api/health → 200 OK
- /api/agents → 401 Unauthorized
- /api/fleet/resources → 401 Unauthorized

**Expected behavior:**
- Public endpoints (health) should work without auth
- Protected endpoints should accept session cookie or API key

**Actual behavior:**
- Health works (public)
- Agents/Fleet return 401 (no auth token sent by probe)

**This may be expected** if probe doesn't send auth. But it means:
- Fleet integration from master MC cannot read ship data without credentials
- Ships need to share API keys or use session cookies

**Action needed:**
- Verify ship-to-master auth flow works with real credentials
- Document auth requirements for cross-MC communication`,
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Zero mesh peers connected — Headscale has 0 nodes, NetBird has 0 peers',
      desc: `**Deep Dive Finding (2026-09-03):**

Both mesh control planes are running but have no connected peers:

**Headscale (v0.29.3 on :8080):**
- Nodes: 0
- Preauthkeys: 3 (created but unused)
- DERP: enabled (self-hosted)
- MagicDNS: enabled

**NetBird (v0.77.1 on :80/443):**
- Peers: 0/1
- Setup keys: 0 (not yet created)
- Management: Connected

**Impact:**
- No ship-to-ship encrypted mesh traffic
- No remote access path for devices outside LAN
- Mesh IPs not assigned

**Action needed:**
- Generate NetBird setup keys for each ship
- Configure Tailscale clients on STEALTHATTACK/PINKCADY to point to Headscale
- Document onboarding steps for mobile devices and consoles`,
      idList: VOID_OPS_P0_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] No device onboarding started — phones, TVs, PS5, IoT all unmeshed',
      desc: `**Deep Dive Finding (2026-09-03):**

Only SQUIDSTATION has mesh infrastructure. No end-user devices are onboarded.

**Device inventory from LAN scan:**
- 192.168.0.1: router
- 192.168.0.32: MC instance + SMB
- 192.168.0.63, .80, .81, .139, .172, .227, .28, .154, .171: unknown devices
- 100.106.235.103: PINKCADY (Tailscale)
- 100.110.238.68: STEALTHATTACK (Tailscale)

**Missing device types:**
- Phones (iOS/Android) — Tailscale app or NetBird app
- Smart TVs — subnet route via gateway PC
- PlayStation / Nintendo — subnet route via gateway PC
- Printers, IoT, switches — subnet route or static IP

**Action needed:**
- Identify all unknown LAN devices
- Assign onboarding method per device type
- Create device inventory card`,
      idList: VOID_OPS_P1_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] No offline/cached data mode in Mission Control',
      desc: `**Deep Dive Finding (2026-09-03):**

apiFetch (src/lib/api-client.ts) handles network errors with ApiError code=NETWORK_ERROR but does not cache responses for offline reuse.

**Current behavior:**
- When MC loses connection to backend, panels show loading skeletons forever
- No cached data served when API is unreachable
- Users perceive "the service died" when backend is healthy but network is down

**Expected behavior:**
- Cache API responses in localStorage
- Serve stale data when network is unavailable
- Show "offline" banner when connection lost
- Queue mutations for retry when back online

**Impact:**
- No offline access to fleet data
- No resilience during network interruptions
- Poor user experience during transient failures`,
      idList: VOID_OPS_P1_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] No CI/CD pipeline for Mission Control',
      desc: `**Deep Dive Finding (2026-09-03):**

src/app/[[...panel]]/page.tsx imports ErrorBoundary but there is no .github/workflows directory.

**Missing:**
- No automated tests on commit
- No lint/typecheck CI
- No Docker image build/push
- No automated deployment to SQUIDSTATION

**Impact:**
- Manual deployment only
- No regression testing
- No automated rollback

**Action needed:**
- Create .github/workflows/ci.yml
- Add typecheck, lint, test stages
- Build Docker image on push to main
- Auto-deploy to SQUIDSTATION on successful build`,
      idList: VOID_OPS_P2_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] MC database not persisted to host filesystem',
      desc: `**Deep Dive Finding (2026-09-03):**

Mission Control uses SQLite database inside Docker container. No volume mount to host.

**Risk:**
- If container is recreated, all data is lost
- Agents, users, sessions, settings all gone
- No disaster recovery

**Current state:**
- Container: mission-control
- DB location: inside container (likely /app/.data or similar)
- No bind mount to SQUIDSTATION host

**Action needed:**
- Mount host directory as volume for .data/
- Add backup schedule for database
- Test restore procedure`,
      idList: VOID_OPS_P1_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] No reverse proxy or SSL termination for MC',
      desc: `**Deep Dive Finding (2026-09-03):**

Mission Control runs on port 3100 with self-signed HTTPS. No reverse proxy (nginx, traefik, caddy) in front.

**Current state:**
- Direct access to :3100 with self-signed cert
- Users see browser warning
- No HTTP→HTTPS redirect
- No load balancer for HA

**Missing:**
- Reverse proxy with valid TLS (Let's Encrypt or internal CA)
- Automatic HTTP→HTTPS redirect
- Rate limiting at proxy level
- Access logging

**Action needed:**
- Deploy Caddy or Traefik as reverse proxy
- Configure valid TLS certs
- Add security headers at proxy level`,
      idList: VOID_OPS_P2_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] No automated backups for Mission Control or fleet configs',
      desc: `**Deep Dive Finding (2026-09-03):**

No backup system detected for:
- MC SQLite database
- MC settings (.env)
- Headscale database (/var/lib/headscale/db.sqlite)
- NetBird management data
- Ship agent configs

**Risk:**
- Single point of failure: SQUIDSTATION disk failure
- No point-in-time recovery
- Manual recovery only

**Action needed:**
- Schedule daily backups of all container volumes
- Store backups on separate drive or cloud
- Test restore procedure monthly
- Document RTO/RPO`,
      idList: VOID_OPS_P1_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
  ]

  let created = 0
  for (const card of cards) {
    const result = await post('/cards', card)
    if (result.status === 200) {
      created++
      console.log('✅', card.name.slice(0, 70))
      console.log('   ID:', result.data.id)
    } else {
      console.log('❌', card.name.slice(0, 70))
      console.log('   STATUS:', result.status, JSON.stringify(result.data).slice(0, 200))
    }
    await new Promise(r => setTimeout(r, 350))
  }

  console.log(`\n=== DONE: ${created}/${cards.length} cards created ===`)
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
