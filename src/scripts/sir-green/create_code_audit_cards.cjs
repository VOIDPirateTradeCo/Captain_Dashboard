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
  const VOID_OPS_P0_LIST = '6a73abbf4539aaa060199c07'
  const VOID_OPS_P1_LIST = '6a73abbf8482da2937217d6f'
  const VOID_OPS_P2_LIST = '6a73abbf275aa5c96ab03e67'
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'
  const BUG_LABEL = '6a839af9b5e7e56792d25e9c'

  const cards = [
    {
      name: '[BUG] GET /api/auth/users requires viewer then checks admin — inconsistent auth',
      desc: '**Finding (2026-09-03):**\n\nIn src/app/api/auth/users/route.ts:\n- GET: requireRole(request, \'viewer\') then checks user.role !== \'admin\' → 403\n- POST: Same pattern\n\n**Problem:** If you are a viewer, you pass requireRole but get rejected by the admin check. The error messages are confusing. Should just use requireRole(request, \'admin\').\n\n**Impact:** Confusing error messages, unnecessary double-checking, inconsistent with other routes.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] fleet/resources always reports local agents as online regardless of actual status',
      desc: '**Finding (2026-09-03):**\n\nIn src/app/api/fleet/resources/route.ts, loadLocalAgents():\n- All local agents get status: \'online\' hardcoded\n- Actual DB status field is ignored\n\n**Problem:** Local agents always show status=online even when they should be offline.\n\n**Fix:** Use row.status || \'offline\' instead of hardcoded \'online\'.',
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] No account lockout after repeated failed login attempts',
      desc: '**Finding (2026-09-03):**\n\nLogin rate limiting is per-IP only. No per-username account lockout.\n\n**Attack scenario:** Attacker tries 5 passwords from different IPs → no lockout.\n\n**Current:** loginLimiter is per-IP via rate-limit.ts\n**Missing:** Per-username attempt counter, temporary lockout after N failures\n\n**Impact:** Brute force possible from distributed IPs.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Error messages leak internal database details',
      desc: '**Finding (2026-09-03):**\n\nMultiple routes return raw error messages:\n- \'UNIQUE constraint failed\' (SQL error leaked)\n- error.message in many catch blocks\n- Database constraint names exposed\n\n**Impact:** Information disclosure helps attackers understand schema.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Hardcoded ship IPs in fleet routes break when IPs change',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/resources/route.ts has hardcoded IPs:\n- SQUIDSTATION: 192.168.0.39\n- STEALTHATTACK: 192.168.0.68\n- PINKCADY: 192.168.0.180 (Trello card says .3)\n- TORUSLAPTOP: 192.168.0.3\n\n**Problem:** IPs change (DHCP), breaking fleet discovery. PINKCADY actual IP differs from card.\n\n**Fix:** Use Tailscale IPs (stable), DNS names, or dynamic discovery.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Password policy inconsistent — user creation allows weak passwords',
      desc: '**Finding (2026-09-03):**\n\nPATCH /api/auth/me requires new_password.length < 12 → rejection.\nBut POST /api/auth/users (createUser) has NO password length validation.\n\n**Impact:** Admin can create users with weak passwords. Inconsistent security policy.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No CSRF protection on state-changing API endpoints',
      desc: '**Finding (2026-09-03):**\n\nAll POST/PUT/DELETE endpoints rely solely on session cookie. No CSRF token validation.\n\n**Risk:** Malicious page can trigger state-changing requests if user is logged in.\n\n**Note:** SameSite cookie attribute may mitigate, but not explicitly set in session config.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Session cookie may lack Secure flag on HTTP requests',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/session-cookie.ts uses isRequestSecure(request) to determine cookie options. If request is HTTP (not HTTPS), the Secure flag is not set.\n\n**Impact:** Over HTTP, session cookie transmitted in cleartext. Self-signed HTTPS on :3100 is the only protection.\n\n**Recommendation:** Force HTTPS redirect, or always set Secure flag.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Agent name validation allows confusing or misleading names',
      desc: '**Finding (2026-09-03):**\n\nNAME_RE in agents/register/route.ts: /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$/\n\n**Allowed:** admin, sirgreen, captain, etc. Any agent can register with privileged-sounding names.\n\n**Risk:** Agent registers as "admin" or "captain" → UI shows misleading name. Could confuse crew.\n\n**Recommendation:** Reserve certain names, or prefix agent names with ship identifier.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] No real-time agent status updates — UI requires manual refresh',
      desc: '**Finding (2026-09-03):**\n\nuseServerEvents.ts provides SSE for tasks/agents CRUD, but agent status changes are not broadcast. The heartbeat endpoint exists but nothing calls it automatically.\n\n**Impact:** Captain Dashboard shows stale agent status until page refresh. No live crew presence.\n\n**Fix:** Emit SSE event on heartbeat/status change. Deploy heartbeat daemon on ships.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Docker container runs as root despite cap_drop ALL',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.yml drops ALL caps but does not set user: "1000:1000" or similar. Container defaults to root.\n\n**Impact:** If container escapes, attacker has root on host (via host.docker.internal mapping).\n\n**Fix:** Add non-root user to Dockerfile, set user in compose.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No healthcheck on Mission Control container',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.yml has no healthcheck on mission-control service. Docker cannot detect if MC is healthy vs crashed.\n\n**Impact:** Container shows "Up" even if MC process is dead. No auto-restart on failure.\n\n**Fix:** Add healthcheck hitting /api/health.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No centralized error response format across API routes',
      desc: '**Finding (2026-09-03):**\n\nDifferent routes return errors differently:\n- { error: \'message\' }\n- { error: \'message\', details: [...] }\n- { error: \'message\', code: \'CODE\' }\n- error.message raw\n\n**Impact:** Frontend error handling is fragile. Some errors may not display correctly.\n\n**Recommendation:** Standardize error format: { error: { code, message, details? } }.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] TORUSLAPTOP user has no agent entry in database',
      desc: '**Finding (2026-09-03):**\n\nUser mrblue (id: 6) exists but there is no agent entry for TORUSLAPTOP in the agents table. The mr-blue agent (id: 9) exists but has no user association.\n\n**Impact:** Fleet shows AGENT NOT INSTALLED for TORUSLAPTOP. No user-agent linking.\n\n**Fix:** Create agent entries for all users, or auto-create on first login.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
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
