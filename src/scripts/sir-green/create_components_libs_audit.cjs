const https = require('https')
const { URL } = require('url')
const fs = require('fs')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

// Load existing cards for dedup
let existingNames = new Set()
try {
  const data = fs.readFileSync('existing_cards.json', 'utf8')
  existingNames = new Set(JSON.parse(data))
} catch (e) {
  console.log('No existing cards file, will create without dedup')
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

// Check if card already exists (normalized name match)
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
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'
  const BUG_LABEL = '6a839af9b5e7e56792d25e9c'

  const cards = [
    // ErrorBoundary
    {
      name: '[BUG] ErrorBoundary has no server-side error logging',
      desc: '**Finding (2026-09-03):**\n\nsrc/components/ErrorBoundary.tsx (75 lines) catches errors but only logs to console via `createClientLogger`. No server-side error reporting.\n\n**Impact:** Production errors go unnoticed. No error history. Cannot detect recurring issues.\n\n**Fix:** POST errors to /api/errors or external service (Sentry, etc.).',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] ErrorBoundary retry just resets state — does not recover from root cause',
      desc: '**Finding (2026-09-03):**\n\nsrc/components/ErrorBoundary.tsx line 67: `onRetry={() => this.setState({ hasError: false, error: null })}`\n\n**Problem:** Retry just clears the error state. If the root cause is still there (bad API, corrupt data), it will just error again in a loop.\n\n**Fix:** Add exponential backoff, max retries, and fallback UI for persistent errors.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Header bar
    {
      name: '[BUG] Header search has no debounce — fires API call on every keystroke',
      desc: '**Finding (2026-09-03):**\n\nsrc/components/layout/header-bar.tsx (639 lines) search uses `setTimeout` but no proper debounce. Each keystroke can trigger an API call.\n\n**Impact:** API flood when user types fast. Server load.\n\n**Fix:** Add proper debounce (300ms) with cleanup on unmount.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Header search results not cached — same query re-fetches',
      desc: '**Finding (2026-09-03):**\n\nsrc/components/layout/header-bar.tsx search does not cache results. Same query re-fetches from server.\n\n**Impact:** Unnecessary API calls. Slow repeated searches.\n\n**Fix:** Add LRU cache for search results.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Nav rail
    {
      name: '[BUG] nav-rail.tsx is 1555 lines — monolithic, hard to maintain',
      desc: '**Finding (2026-09-03):**\n\nsrc/components/layout/nav-rail.tsx is 1555 lines managing all navigation groups, icons, state, and routing.\n\n**Impact:** Hard to add new nav items. Performance: re-renders entire nav on any state change.\n\n**Fix:** Split into NavGroup, NavItem, NavIcon components.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // API routes
    {
      name: '[BUG] 10 API routes have no input validation',
      desc: '**Finding (2026-09-03):**\n\nAPI routes missing validateBody/validator:\n- /api/cron (469 lines)\n- /api/webhooks (205 lines)\n- /api/alerts (337 lines)\n- /api/gateways (274 lines)\n- /api/agents (507 lines)\n- /api/tasks (457 lines)\n- /api/chat (217 lines)\n- /api/settings (67 lines)\n- /api/users (140 lines)\n- /api/audit (336 lines)\n\n**Impact:** Invalid data accepted. Potential injection attacks.\n\n**Fix:** Add validateBody() or zod validation to all routes.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] 10 API routes have no rate limiting',
      desc: '**Finding (2026-09-03):**\n\nAPI routes missing rateLimiter:\n- /api/cron\n- /api/webhooks\n- /api/alerts\n- /api/gateways\n- /api/agents\n- /api/tasks\n- /api/chat\n- /api/settings\n- /api/users\n- /api/audit\n\n**Impact:** Attacker can flood endpoints. DoS risk.\n\n**Fix:** Add rateLimiter middleware to all routes.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] /api/users route has direct fetch without auth',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/users/route.ts (140 lines) has direct fetch() call without auth check.\n\n**Impact:** Unauthenticated access to user data.\n\n**Fix:** Add requireAuth/requireRole check.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // Lib files
    {
      name: '[BUG] 80+ lib files have no try/catch — unhandled promise rejections',
      desc: '**Finding (2026-09-03):**\n\n80+ lib files lack try/catch blocks:\n- agent-evals.ts (346 lines)\n- agent-optimizer.ts (269 lines)\n- attention-detector.ts (94 lines)\n- channel-snapshot.ts (136 lines)\n- claude-code-sessions.ts (165 lines)\n- command.ts (135 lines)\n- config-path.ts (35 lines)\n- cron-occurrences.ts (140 lines)\n- cron-utils.ts (80 lines)\n- csp.ts (34 lines)\n- dashboard-widgets.ts (178 lines)\n- event-bus.ts (80 lines)\n- github-label-map.ts (75 lines)\n- google-auth.ts (39 lines)\n- hook-profiles.ts (76 lines)\n- minimax.ts (51 lines)\n- navigation-metrics.ts (88 lines)\n- navigation.ts (63 lines)\n- office-layout.ts (133 lines)\n- onboarding-flow.ts (41 lines)\n- password.ts (46 lines)\n- request.ts (34 lines)\n- runtime-install-security.ts (49 lines)\n- schedule-parser.ts (217 lines)\n- secret-scanner.ts (123 lines)\n- security-events.ts (172 lines)\n- task-status.ts (57 lines)\n- themes.ts (31 lines)\n- token-utils.ts (35 lines)\n- use-focus-trap.ts (89 lines)\n- use-smart-poll.ts (145 lines)\n- utils.ts (95 lines)\n- workspaces.ts (147 lines)\n\n**Impact:** Unhandled promise rejections crash Node.js in production.\n\n**Fix:** Add try/catch to all async functions.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] 50+ lib files contain possible hardcoded secrets',
      desc: '**Finding (2026-09-03):**\n\n50+ lib files contain keywords: password, token, secret, api_key. Many are likely hardcoded secrets or unsafe secret handling.\n\n**Files include:**\n- agent-templates.ts (629 lines)\n- agent-runtimes.ts (980 lines)\n- auto-credentials.ts (107 lines)\n- claude-sessions.ts (386 lines)\n- codex-sessions.ts (233 lines)\n- cron-occurrences.ts (140 lines)\n- dashboard-widgets.ts (178 lines)\n- device-identity.ts (348 lines)\n- gateway-runtime.ts (120 lines)\n- gateway-url.ts (136 lines)\n- github.ts (351 lines)\n- google-auth.test.ts (63 lines)\n- hermes-route-security.ts (66 lines)\n- hermes-sessions.ts (227 lines)\n- injection-guard.ts (554 lines)\n- memory-search.ts (268 lines)\n- mentions.ts (145 lines)\n- models.ts (123 lines)\n- openclaw-gateway.ts (243 lines)\n- opencode-sessions.ts (305 lines)\n- password.ts (46 lines)\n- provisioner-client.ts (100 lines)\n- runs.ts (444 lines)\n- scheduler.ts (564 lines)\n- security-scan.ts (1197 lines)\n- session-cookie.ts (66 lines)\n- sessions.ts (208 lines)\n- skill-registry.ts (544 lines)\n- spawn-history.ts (199 lines)\n- task-costs.ts (222 lines)\n- task-dispatch.ts (2484 lines)\n- token-pricing.ts (98 lines)\n- trello-bridge.ts (29 lines)\n- webhooks.ts (437 lines)\n- websocket-utils.ts (121 lines)\n- websocket.ts (909 lines)\n\n**Impact:** Secrets in source code. Leaked in git history.\n\n**Fix:** Audit each file. Move secrets to env vars or vault.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    // task-dispatch.ts
    {
      name: '[BUG] task-dispatch.ts is 2484 lines — extreme technical debt',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/task-dispatch.ts is 2484 lines. Largest file in the codebase.\n\n**Impact:**\n- Impossible to review in one sitting\n- High bug risk\n- Merge conflicts likely\n- Performance: any import pulls entire file\n\n**Fix:** Split into task-create.ts, task-update.ts, task-assign.ts, task-complete.ts, task-search.ts.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // security-scan.ts
    {
      name: '[BUG] security-scan.ts is 1197 lines with possible hardcoded secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/security-scan.ts is 1197 lines and contains possible hardcoded secrets.\n\n**Impact:** Security tool itself has security issues. Irony.\n\n**Fix:** Audit and refactor. Move secrets to env vars.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // websocket.ts
    {
      name: '[BUG] websocket.ts is 909 lines — monolithic, handles all WS types',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/websocket.ts is 909 lines handling all WebSocket types: agent status, task updates, notifications, chat, logs.\n\n**Impact:** Single point of failure. Bug in one handler breaks all WS.\n\n**Fix:** Split into per-domain WS handlers.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // agent-runtimes.ts
    {
      name: '[BUG] agent-runtimes.ts is 980 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/agent-runtimes.ts is 980 lines with possible hardcoded secrets.\n\n**Impact:** Secrets leak. Monolithic file hard to maintain.\n\n**Fix:** Split into per-runtime files. Move secrets to env vars.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // scheduler.ts
    {
      name: '[BUG] scheduler.ts is 564 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/scheduler.ts is 564 lines with possible hardcoded secrets.\n\n**Impact:** Secrets leak. Scheduler is critical infrastructure.\n\n**Fix:** Audit and refactor. Move secrets to env vars.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // skill-registry.ts
    {
      name: '[BUG] skill-registry.ts is 544 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/skill-registry.ts is 544 lines with possible hardcoded secrets.\n\n**Impact:** Secrets leak.\n\n**Fix:** Audit and refactor.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // injection-guard.ts
    {
      name: '[BUG] injection-guard.ts is 554 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/injection-guard.ts is 554 lines with possible hardcoded secrets.\n\n**Impact:** Security tool has security issues.\n\n**Fix:** Audit and refactor.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // webhooks.ts
    {
      name: '[BUG] webhooks.ts is 437 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/webhooks.ts is 437 lines with possible hardcoded secrets.\n\n**Impact:** Secrets leak.\n\n**Fix:** Audit and refactor.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // runs.ts
    {
      name: '[BUG] runs.ts is 444 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/runs.ts is 444 lines with possible hardcoded secrets.\n\n**Impact:** Secrets leak.\n\n**Fix:** Audit and refactor.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // device-identity.ts
    {
      name: '[BUG] device-identity.ts is 348 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/device-identity.ts is 348 lines with possible hardcoded secrets.\n\n**Impact:** Device identity secrets leak.\n\n**Fix:** Audit and refactor.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // github.ts
    {
      name: '[BUG] github.ts is 351 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/github.ts is 351 lines with possible hardcoded secrets (GitHub tokens).\n\n**Impact:** GitHub token leak.\n\n**Fix:** Move GitHub token to env var.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // session-transcript-route.ts
    {
      name: '[BUG] session-transcript-route.ts is 493 lines with possible secrets',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/session-transcript-route.ts is 493 lines with possible hardcoded secrets.\n\n**Impact:** Secrets leak.\n\n**Fix:** Audit and refactor.',
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
