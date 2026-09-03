const https = require('https')
const { URL } = require('url')
const fs = require('fs')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

let existingNames = new Set()
try {
  const data = fs.readFileSync('existing_cards.json', 'utf8')
  existingNames = new Set(JSON.parse(data))
} catch (e) {
  console.log('No existing cards file')
}

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

function cardExists(name) {
  const normalized = name.toLowerCase().trim()
  for (const existing of existingNames) {
    if (existing.includes(normalized.slice(0, 60))) return true
    if (normalized.includes(existing.slice(0, 60))) return true
  }
  return false
}

async function main() {
  const VOID_OPS_P1_LIST = '6a73abbf8482da2937217d6f'
  const VOID_OPS_P2_LIST = '6a73abbf275aa5c96ab03e67'
  const BUG_LABEL = '6a839af9b5e7e56792d25e9c'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'

  const cards = [
    // Adapters route
    {
      name: '[API] /api/adapters has no payload validation — metadata passthrough is unchecked',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/adapters/route.ts (120 lines) accepts `payload.metadata` in register action without any validation:\n\n```ts\nconst { agentId, name, metadata } = payload\nawait adapter.register({ agentId, name, framework, metadata, workspaceId })\n```\n\n**Risk:**\n- No limit on metadata size — can store huge blobs\n- No schema validation — any JSON accepted\n- No sanitization — XSS through metadata fields\n\n**Impact:**\n- DB bloat from large metadata\n- Potential XSS if metadata rendered in UI\n- Injection if metadata used in SQL without parameterization\n\n**Fix:**\n- Add max size limit (e.g., 64KB)\n- Validate metadata schema (zod or manual)\n- Sanitize string fields',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[API] /api/adapters heartbeat accepts arbitrary metrics without validation',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/adapters/route.ts heartbeat action:\n```ts\nconst { agentId, status, metrics } = payload\nawait adapter.heartbeat({ agentId, status: status || 'online', metrics, workspaceId })\n```\n\n**Risk:**\n- `metrics` is `any` — no validation\n- No size limit\n- No schema check\n\n**Impact:**\n- DB bloat\n- Potential injection\n\n**Fix:** Validate metrics schema, add size limit.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[API] /api/adapters report accepts unchecked output field',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/adapters/route.ts report action:\n```ts\nconst { taskId, agentId, progress, status: taskStatus, output } = payload\nawait adapter.reportTask({ taskId, agentId, progress: progress ?? 0, status: taskStatus || 'in_progress', output, workspaceId })\n```\n\n**Risk:**\n- `output` is `any` — no validation\n- No size limit — can store huge outputs\n\n**Impact:**\n- DB bloat from large outputs\n- Potential XSS if output rendered without escaping\n\n**Fix:** Add max size limit, validate schema.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // Fleet routes
    {
      name: '[API] /api/fleet route has no validation, no try/catch, no rate limit',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/route.ts (15 lines) is a stub route that:\n- Has no input validation\n- Has no try/catch\n- Has no rate limiting\n- Returns request path and timestamp\n\n**Impact:**\n- Information disclosure (path, timestamp)\n- No error handling = 500 on any issue\n- Flood risk\n\n**Fix:** Add validation, error handling, rate limiting. Or remove if unused.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[API] fleet/resources hardcodes SHIPS list — breaks when DHCP changes',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/resources/route.ts lines 6-11:\n```ts\nconst SHIPS = [\n  { key: 'SQUIDSTATION', host: '192.168.0.39', port: 3100 },\n  { key: 'STEALTHATTACK', host: '192.168.0.68', port: 3000 },\n  { key: 'PINKCADY', host: '192.168.0.180', port: 3000 },\n  { key: 'TORUSLAPTOP', host: '192.168.0.3', port: 3000 },\n] as const\n```\n\n**Problem:** Hardcoded IP addresses. When DHCP assigns new IPs, fleet discovery breaks.\n\n**Impact:** Ships become unreachable in fleet view.\n\n**Fix:** Use DNS names, Tailscale IPs, or dynamic discovery.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[API] fleet/resources always reports local agents as online',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/resources/route.ts line 42:\n```ts\nstatus: 'online',\n```\n\n**Problem:** Hardcoded `status: 'online'` for all local agents. No actual health check.\n\n**Impact:** Dashboard shows agents as online even when they are crashed or disconnected.\n\n**Fix:** Check actual agent status from heartbeat table or last_seen timestamp.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[API] fleet/connectivity hardcodes SHIPS list — breaks when DHCP changes',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/connectivity/route.ts lines 6-13:\n```ts\nconst SHIPS = [\n  { key: 'SQUIDSTATION', host: '192.168.0.39', port: 3100, protocol: 'http' },\n  { key: 'STEALTHATTACK', host: '100.110.238.68', port: 3000, protocol: 'http' },\n  ...\n] as const\n```\n\n**Problem:** Hardcoded IP addresses. When DHCP assigns new IPs, connectivity checks fail.\n\n**Impact:** Ships show as unreachable even when online.\n\n**Fix:** Use DNS names, Tailscale IPs, or dynamic discovery.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[API] fleet/connectivity uses rejectUnauthorized: false — MITM attack possible',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/connectivity/route.ts line 15:\n```ts\nconst httpsAgent = new https.Agent({ rejectUnauthorized: false })\n```\n\n**Problem:** Disables TLS certificate verification. Man-in-the-middle attacker can intercept traffic.\n\n**Impact:** Credentials, session tokens, and sensitive data can be intercepted.\n\n**Fix:** Use proper CA certificates. For self-signed certs, add specific cert to trust store.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[API] fleet/connectivity hardcodes SQUIDSTATION as always reachable',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/connectivity/route.ts line 28:\n```ts\nconst ships: Record<string, any> = {\n  SQUIDSTATION: { reachable: true, latency_ms: 0, last_seen: Math.floor(Date.now() / 1000), status: 200, body: ... },\n}\n```\n\n**Problem:** SQUIDSTATION is hardcoded as reachable. No actual health check.\n\n**Impact:** If SQUIDSTATION goes down, dashboard still shows it as online.\n\n**Fix:** Actually probe SQUIDSTATION like other ships.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[API] fleet/skills route has no auth, no validation, no rate limit',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/skills/route.ts (117 lines) has:\n- No auth check (no requireRole)\n- No input validation\n- No rate limiting\n\n**Impact:**\n- Unauthenticated access to fleet skills data\n- Invalid data accepted\n- Flood risk\n\n**Fix:** Add requireRole, validateBody, rateLimiter.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[API] fleet/skills reads filesystem directly — path traversal possible',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/fleet/skills/route.ts reads skill files from filesystem:\n```ts\nconst HOME = process.env.HOME || process.env.USERPROFILE || ''\n```\n\n**Risk:** If HOME env is manipulated, can read from arbitrary path.\n\n**Impact:** Arbitrary file read.\n\n**Fix:** Validate path is within expected directory.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
  ]

  let created = 0
  let skipped = 0
  for (const card of cards) {
    if (cardExists(card.name)) {
      skipped++
      console.log('⏭️  SKIP (exists):', card.name.slice(0, 60))
      continue
    }
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

  console.log(`\n=== DONE: ${created} created, ${skipped} skipped ===`)
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
