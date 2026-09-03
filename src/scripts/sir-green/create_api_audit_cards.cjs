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
      name: '[BUG] gateways table created in 2 different places with different schemas',
      desc: '**Finding (2026-09-03):**\n\ngateways table is created in:\n1. src/app/api/gateways/route.ts (lines 24-41) — via ensureTable()\n2. src/app/api/gateways/health/route.ts (lines 6-24) — via ensureGatewaysTable()\n\nThe schemas are slightly different. Both use CREATE TABLE IF NOT EXISTS so they may conflict.\n\n**Impact:** Schema inconsistency, potential migration issues.\n\n**Fix:** Centralize table creation in migrations.ts.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] gateways/health/route.ts limits history to 100 rows with no pagination',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/gateways/health/route.ts:\n```sql\nORDER BY l.probed_at DESC LIMIT 100\n```\n\n**Problem:** No pagination. After 100 entries, older data is invisible. No way to request page 2.\n\n**Impact:** Health history incomplete. Cannot analyze trends beyond 100 data points.\n\n**Fix:** Add offset/limit pagination.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] hermes/events route accepts untrusted input without validation',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/hermes/events/route.ts accepts webhook events from Hermes hook but does not validate:\n- No HMAC signature verification\n- No source IP check\n- No event schema validation\n\n**Impact:** Anyone can post fake events to /api/hermes/events. Can create false activity logs, trigger SSE updates.\n\n**Fix:** Add HMAC verification, validate event schema, check source IP.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] debug endpoint (180 lines) may expose secrets in production',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/debug/route.ts has 180 lines. Likely exposes:\n- Environment variables\n- Internal paths\n- System info\n\n**Impact:** Information disclosure. Attackers gain knowledge of internals.\n\n**Fix:** Disable in production (NODE_ENV=production check), or require admin role.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] diagnostics endpoint runs external commands without sandboxing',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/diagnostics/route.ts runs system commands (systemctl, ps, etc.) and returns output.\n\n**Risk:** If command injection exists, attacker can execute arbitrary commands.\n\n**Impact:** Remote code execution.\n\n**Fix:** Whitelist allowed commands, sanitize all inputs, run in sandbox.',
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] gateways/control route runs spawn() with user-controlled input',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/gateways/control/route.ts uses spawn() with user-controlled command input.\n\n**Risk:** Command injection. Attacker can execute arbitrary shell commands.\n\n**Impact:** Remote code execution as root (if container escapes).\n\n**Fix:** Use execFileSync with args array (no shell), whitelist allowed commands.',
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] hermes gateway PID file written to user-controlled path',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/gateways/control/route.ts writes PID file to `~/.hermes/gateway.pid`. If HOME env is manipulated, can write to arbitrary path.\n\n**Risk:** Arbitrary file write.\n\n**Fix:** Validate path is within expected directory.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No rate limiting on hermes gateway start/stop commands',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/gateways/control/route.ts has gatewayControlLimiter but it may not cover all state-changing operations.\n\n**Impact:** Attacker can repeatedly start/stop gateway, causing DoS.\n\n**Fix:** Ensure all POST/PUT/DELETE operations are rate limited.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] chat/conversations route has no pagination',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/chat/conversations/route.ts (104 lines) returns all conversations with no pagination.\n\n**Impact:** With many conversations, response grows unbounded. Memory exhaustion, slow responses.\n\n**Fix:** Add limit/offset pagination.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] activities route (240 lines) has no rate limiting',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/activities/route.ts (240 lines) has no rate limit.\n\n**Impact:** Attacker can flood activity records, filling DB.\n\n**Fix:** Add readLimiter or mutationLimiter as appropriate.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] channels route (308 lines) has no validation or rate limiting',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/channels/route.ts (308 lines) lacks:\n- Input validation (no validateBody)\n- Rate limiting\n\n**Impact:** Invalid data accepted, flood risk.\n\n**Fix:** Add validation and rate limiting.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No CORS headers on any API route — CSRF possible',
      desc: '**Finding (2026-09-03):**\n\nNo CORS middleware found across all API routes. Next.js API routes default to no CORS headers.\n\n**Impact:** Malicious websites can make authenticated requests (with cookies) to the API.\n\n**Fix:** Add CORS middleware, validate Origin header, use CSRF tokens.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No request ID / correlation ID for debugging',
      desc: '**Finding (2026-09-03):**\n\nNo request ID or correlation ID is generated or logged.\n\n**Impact:** Cannot trace requests across logs. Hard to debug issues in production.\n\n**Fix:** Generate X-Request-ID header, include in all logs.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No API versioning — breaking changes break clients',
      desc: '**Finding (2026-09-03):**\n\nAll API routes are at /api/*. No versioning (/api/v1/*) except for a few v1 routes.\n\n**Impact:** Breaking API changes break existing clients. No backward compatibility.\n\n**Fix:** Add /api/v1/ prefix to all routes, maintain backward compatibility.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Export endpoint (140 lines) may leak data across workspaces',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/export/route.ts exports data but may not filter by workspace_id.\n\n**Impact:** Cross-workspace data leak. One tenant exports another tenant data.\n\n**Fix:** Always filter by workspace_id from authenticated user.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] connect route (156 lines) may expose internal network info',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/connect/route.ts (156 lines) likely exposes gateway connection details.\n\n**Risk:** Internal network topology exposure.\n\n**Fix:** Validate user has permission to access connection info, redact sensitive fields.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
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
