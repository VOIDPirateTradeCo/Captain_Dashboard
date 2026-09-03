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
    // Security headers & CSP
    {
      name: '[SECURITY] CSP connect-src allows ws: wss: globally — any WebSocket connection permitted',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/csp.ts line 13:\n```\nconnect-src \'self\' ws: wss: http://127.0.0.1:* http://localhost:* https://cdn.jsdelivr.net\n```\n\n**Risk:** Any WebSocket connection from the page is allowed. Malicious script could connect to arbitrary WebSocket servers.\n\n**Impact:** Data exfiltration via WebSocket.\n\n**Fix:** Restrict connect-src to specific gateway hosts.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[SECURITY] CSP script-src allows blob: — could be risky',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/csp.ts line 9:\n```\nscript-src \'self\' \'nonce-${nonce}\' \'strict-dynamic\' blob:${googleEnabled ? \' https://accounts.google.com\' : \'\'}\n```\n\n**Risk:** `blob:` in script-src allows execution of blob URLs. If an attacker can create a blob URL, they can execute arbitrary code.\n\n**Impact:** XSS bypass.\n\n**Fix:** Remove `blob:` from script-src if not strictly needed.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] CSRF protection only checks Origin header — POST without Origin passes',
      desc: '**Finding (2026-09-03):**\n\nsrc/proxy.ts line 191:\n```ts\nif (origin) {\n  let originHost: string\n  try { originHost = new URL(origin).host } catch { originHost = \'\' }\n  if (originHost && !requestHosts.some((h) => hostsMatchForCsrf(h, originHost))) {\n    return addSecurityHeaders(NextResponse.json({ error: \'CSRF origin mismatch\' }, { status: 403 }), request)\n  }\n}\n```\n\n**Problem:** CSRF validation only runs if `Origin` header is present. POST requests without Origin header pass through.\n\n**Impact:** CSRF via form submissions without Origin header.\n\n**Fix:** Also check `Referer` header as fallback. Or require CSRF tokens.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[SECURITY] No CSRF token validation — only Origin header is checked',
      desc: '**Finding (2026-09-03):**\n\nsrc/proxy.ts implements basic CSRF protection by checking Origin header. No CSRF tokens (double-submit cookie pattern) are used.\n\n**Impact:**\n- If Origin header is stripped by browser/privacy setting, CSRF protection fails\n- No protection against same-origin CSRF (XSS)\n\n**Fix:** Implement CSRF tokens for all state-changing operations.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] Session not bound to IP — stolen cookie works from any IP',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/session-cookie.ts creates session cookies with:\n- httpOnly: true\n- secure: true\n- sameSite: strict\n- path: /\n\nBut sessions are NOT bound to IP address or user agent.\n\n**Impact:** Stolen session cookie works from any IP, any device, any browser.\n\n**Fix:** Bind sessions to IP subnet or user agent fingerprint.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[SECURITY] WebSocket has no authentication — any client can connect',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/websocket.ts (909 lines) connects to gateway WebSocket. The `authTokenRef` is set but not validated. Any client can connect to the WebSocket.\n\n**Impact:**\n- Unauthenticated WebSocket access\n- Potential data exfiltration\n\n**Fix:** Validate WebSocket authentication before allowing connection.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[SECURITY] Login endpoint has no rate limiting — brute force possible',
      desc: '**Finding (2026-09-03):**\n\nThe login endpoint (`/api/auth/login`) has no rate limiting in the proxy or route. Attackers can brute force passwords.\n\n**Impact:** Brute force attacks possible.\n\n**Fix:** Add rate limiting to login endpoint (e.g., 5 attempts per minute per IP).',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[SECURITY] No API key rotation — keys are static forever',
      desc: '**Finding (2026-09-03):**\n\nAPI keys are generated once and never rotated. No expiration, no rotation policy.\n\n**Impact:** Stolen API keys remain valid forever.\n\n**Fix:** Implement API key rotation (e.g., 90-day expiration).',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] No session invalidation on password change',
      desc: '**Finding (2026-09-03):**\n\nWhen user changes password, existing sessions are not invalidated. Stolen session cookies remain valid.\n\n**Impact:** Stolen sessions remain valid after password change.\n\n**Fix:** Invalidate all sessions on password change.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] No CORS headers on API responses — cross-origin blocked but no explicit policy',
      desc: '**Finding (2026-09-03):**\n\nNo `Access-Control-Allow-Origin` header is set on API responses. While this blocks cross-origin AJAX by default, it also means:\n- Legitimate API clients from different origins cannot access the API\n- No explicit CORS policy\n\n**Impact:** API cannot be used by third-party clients.\n\n**Fix:** Add CORS configuration with explicit allowed origins.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] No security event monitoring — events logged but not alerted',
      desc: '**Finding (2026-09-03):**\n\nSecurity events are logged to the database but no real-time monitoring or alerting exists.\n\n**Impact:** Attacks go unnoticed.\n\n**Fix:** Add real-time security event monitoring and alerting.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] No account lockout after failed logins',
      desc: '**Finding (2026-09-03):**\n\nNo account lockout after repeated failed login attempts. Attackers can brute force passwords indefinitely.\n\n**Impact:** Brute force attacks.\n\n**Fix:** Lock account after 5 failed attempts for 15 minutes.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[SECURITY] No password strength enforcement — weak passwords allowed',
      desc: '**Finding (2026-09-03):**\n\nNo password strength enforcement. Users can set weak passwords like "password123".\n\n**Impact:** Easy to brute force.\n\n**Fix:** Enforce minimum password strength (8+ chars, mixed case, numbers, symbols).',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] No audit trail for agent actions',
      desc: '**Finding (2026-09-03):**\n\nAgent actions are not logged in an audit trail. No accountability for what agents do.\n\n**Impact:** No way to trace agent actions.\n\n**Fix:** Add audit trail for all agent actions.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] No API request signing — requests can be replayed',
      desc: '**Finding (2026-09-03):**\n\nAPI requests are not signed. Captured requests can be replayed.\n\n**Impact:** Replay attacks.\n\n**Fix:** Add request signing with timestamp and nonce.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SECURITY] No rate limiting on proxy itself — only on individual routes',
      desc: '**Finding (2026-09-03):**\n\nsrc/proxy.ts has no rate limiting. Only individual API routes have rate limiting.\n\n**Impact:** Flood of requests to unrate-limited routes.\n\n**Fix:** Add rate limiting to the proxy middleware.',
      idList: VOID_OPS_P2_LIST,
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
