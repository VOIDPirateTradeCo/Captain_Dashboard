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
      name: '[BUG] Backup scheduler exists but no backup verification or restore test',
      desc: '**Finding (2026-09-03):** src/lib/scheduler.ts has runBackup() that creates DB backups. security-scan.ts checks backup age. **Missing:** No backup verification (is the backup valid?). No restore test procedure. No off-site backup copy. No backup encryption. Backups stored locally only (same disk as DB). **Impact:** If disk fails, backups are lost. If DB corrupts, backup may be corrupt too.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] task-dispatch.ts is 2484 lines — likely has hidden bugs and race conditions',
      desc: '**Finding (2026-09-03):** src/lib/task-dispatch.ts is the largest file at 2484 lines. It handles task dispatch to agents, model routing, token usage tracking, GitHub sync, and error escalation. **Risks in large files:** Race conditions on concurrent dispatches. Memory leaks from unbounded arrays. Missing error handling in edge cases. Inconsistent state on partial failures. **Recommendation:** Break into smaller modules, add integration tests.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No automated response to security events — trust scores dont trigger actions',
      desc: '**Finding (2026-09-03):** src/lib/security-events.ts calculates agent trust scores but nothing acts on them. **Missing:** No automatic agent suspension on low trust score. No alert when trust score drops below threshold. No rate limiting per agent based on trust. No admin notification on critical security events. **Impact:** Security events are logged but ignored. Malicious agent continues operating.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Session cookie Secure flag depends on X-Forwarded-Proto header — spoofable',
      desc: '**Finding (2026-09-03):** src/lib/session-cookie.ts uses isRequestSecure() which checks x-forwarded-proto header. **Problem:** If MC is behind a reverse proxy that strips x-forwarded-proto, or if client sends a fake header, the Secure flag may not be set. **Fix:** Always set Secure flag, or use MC_COOKIE_SECURE env var to force it.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] X-Forwarded-For parsing requires trusted proxy but none configured by default',
      desc: '**Finding (2026-09-03):** src/lib/request.ts extractClientIpFromTrusted() requires MC_TRUSTED_PROXIES env var. If not set, all IPs are trusted. **Impact:** Without trusted proxy config, rate limiting per-IP is ineffective (spoofable XFF). With trusted proxy config but no proxy, all requests appear to come from proxy IP. **Fix:** Document required config, validate on startup.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] injection-guard.ts has bypass mitigations but no rate limiting on blocked requests',
      desc: '**Finding (2026-09-03):** src/lib/injection-guard.ts detects prompt injection, command injection, and exfiltration attempts. **Missing:** No rate limiting on injection attempts. No automatic IP ban after repeated attempts. No alert to admin on injection attempts. No logging to security_events table. **Impact:** Attacker can send unlimited injection attempts without consequence.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] super-admin.ts runs shell commands as root for tenant provisioning',
      desc: '**Finding (2026-09-03):** src/lib/super-admin.ts runs useradd, install, cp commands for tenant provisioning. **Risks:** Shell injection via tenant slug or username. Commands run as root (requires_root: true). No input sanitization on slug (only format validation). No confirmation step before destructive operations. **Fix:** Use parameterized commands, add confirmation gates, validate inputs strictly.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No WebSocket authentication — any client can connect',
      desc: '**Finding (2026-09-03):** src/lib/websocket.ts connects to gateway WebSocket but the useWebSocket hook does not send authentication token in the WebSocket upgrade request. **Impact:** If gateway requires auth, WebSocket connections fail. If gateway does not require auth, anyone can connect. **Fix:** Send session token or API key in WebSocket handshake.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] config.ts defaults gateway host to 127.0.0.1 but Docker needs host.docker.internal',
      desc: '**Finding (2026-09-03):** src/lib/config.ts gatewayHost defaults to 127.0.0.1. docker-compose.yml says "If your gateway runs in another container, set this to the container name instead." **Problem:** Default 127.0.0.1 does not work for Docker Desktop (needs host.docker.internal). Users must know to set this. **Fix:** Default to host.docker.internal, or auto-detect Docker environment.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No session invalidation on password change — old sessions remain valid',
      desc: '**Finding (2026-09-03):** src/lib/auth.ts PATCH /api/auth/me changes password but does not invalidate existing sessions. **Impact:** If session token is stolen, changing password does not lock out the attacker. Old sessions remain valid until natural expiry. **Fix:** Call destroyAllUserSessions() after password change, then create new session.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Agent heartbeat limiter is per-request not per-agent — DoS possible',
      desc: '**Finding (2026-09-03):** src/lib/rate-limit.ts agentHeartbeatLimiter is keyed by IP, not by agent ID. **Impact:** Single agent behind NAT (many users sharing IP) gets rate limited. Attacker can spoof IP to bypass limit. **Fix:** Key rate limit by agent ID from authenticated request, not just IP.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No CORS configuration — API accessible from any origin',
      desc: '**Finding (2026-09-03):** No CORS middleware found in src/app/api routes. Next.js API routes default to no CORS headers. **Impact:** Any website can make authenticated requests to the API (if cookies are sent). CSRF + CORS bypass. **Fix:** Add CORS middleware, validate Origin header, use CSRF tokens.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No request body size limit — large payloads can exhaust memory',
      desc: '**Finding (2026-09-03):** No body size limit on POST/PUT routes. Next.js default is 1MB but some routes may need more. **Impact:** Attacker sends 100MB payload → memory exhaustion → crash. **Fix:** Add body size validation middleware, set per-route limits.',
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
