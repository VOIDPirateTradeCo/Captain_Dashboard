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
    // Adapters
    {
      name: '[ADAPTER] OpenClawAdapter does not update agents table — status stays stale',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/adapters/openclaw.ts (54 lines) only broadcasts eventBus messages. It does NOT update the `agents` table.\n\nCompare to GenericAdapter which calls `markAgent()` to update `agents.status` and `agents.last_seen`.\n\n**Impact:** OpenClaw agents show as "offline" in MC UI even when actively sending heartbeats.\n\n**Fix:** Add `markAgent()` calls to OpenClawAdapter like GenericAdapter has.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[ADAPTER] All adapters (crewai, langgraph, autogen, claude-sdk) likely missing agent table updates',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/adapters/ contains:\n- autogen.ts (54 lines)\n- claude-sdk.ts (54 lines)\n- crewai.ts (54 lines)\n- langgraph.ts (54 lines)\n\nAll are likely missing `markAgent()` calls that GenericAdapter has.\n\n**Impact:** Agents using these adapters show as offline.\n\n**Fix:** Add markAgent() to all adapters.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[ADAPTER] Adapter metadata spread via spread operator — potential prototype pollution',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/adapters/openclaw.ts line 15:\n```ts\n...agent.metadata,\n```\n\n**Risk:** If metadata contains `__proto__`, `constructor`, or `prototype` keys, it could pollute the Object prototype.\n\n**Impact:** Prototype pollution can cause security vulnerabilities.\n\n**Fix:** Sanitize metadata keys before spreading.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[ADAPTER] Adapter eventBus broadcast has no error handling — silent failures',
      desc: '**Finding (2026-09-03):**\n\nAll adapters use `eventBus.broadcast()` without try/catch. If eventBus fails, the error is silently swallowed.\n\n**Impact:** Agent status updates lost silently.\n\n**Fix:** Add try/catch around eventBus calls.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Agent routes
    {
      name: '[API] /api/agents/[id]/heartbeat has no validation — accepts any query params',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/agents/[id]/heartbeat/route.ts (267 lines) has no input validation for query parameters.\n\n**Impact:** Invalid query params accepted.\n\n**Fix:** Add validation for query params.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[API] /api/agents/[id]/diagnostics has no validation — accepts any query params',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/agents/[id]/diagnostics/route.ts (344 lines) has no input validation for query parameters.\n\n**Impact:** Invalid query params accepted.\n\n**Fix:** Add validation for query params.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[API] /api/agents/[id]/attribution has no validation — accepts any query params',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/agents/[id]/attribution/route.ts (357 lines) has no input validation for query parameters.\n\n**Impact:** Invalid query params accepted.\n\n**Fix:** Add validation for query params.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[API] /api/agents/[id]/files has no validation — accepts any query params',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/agents/[id]/files/route.ts (168 lines) has no input validation for query parameters.\n\n**Impact:** Invalid query params accepted.\n\n**Fix:** Add validation for query params.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[API] /api/agent-runtimes has no validation — accepts any query params',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/agent-runtimes/route.ts (100 lines) has no input validation for query parameters.\n\n**Impact:** Invalid query params accepted.\n\n**Fix:** Add validation for query params.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Event bus
    {
      name: '[LIB] eventBus has no error handling — broadcast failures silent',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/event-bus.ts (80 lines) has no error handling. If a listener throws, it may break the entire broadcast chain.\n\n**Impact:** One bad listener breaks all event handling.\n\n**Fix:** Add try/catch around listener calls.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Password
    {
      name: '[LIB] password.ts has no try/catch — hash failures crash',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/password.ts (46 lines) has no try/catch. If bcrypt fails, the error propagates.\n\n**Impact:** Login/registration crashes on hash failure.\n\n**Fix:** Add try/catch with fallback error.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Workspaces
    {
      name: '[LIB] workspaces.ts has no try/catch — DB failures crash',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/workspaces.ts (147 lines) has no try/catch. If DB query fails, the error propagates.\n\n**Impact:** Workspace operations crash on DB failure.\n\n**Fix:** Add try/catch with fallback error.',
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
