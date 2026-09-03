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
      name: '[BUG] 45 panel components lack individual ErrorBoundary — crash in one can blank whole tab',
      desc: '**Finding (2026-09-03):**\n\nAudited 10 largest panel components (task-board, settings, skills, super-admin, user-management, agent-detail-tabs, memory-browser, gateway-config, cost-tracker, cron-management). **None** have individual ErrorBoundary. Only the main page wrapper has one.\n\n**Risk:** A crash in any panel component can blank the entire tab. Error isolation is missing.\n\n**Fix:** Wrap each panel in ErrorBoundary, or add error boundaries at the tab level.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] integrations route (1050 lines) has in-memory cache with no invalidation',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/integrations/route.ts has:\n```typescript\nlet integrationProbeCache: { ts: number; value: IntegrationProbeSnapshot } | null = null\nconst INTEGRATION_PROBE_TTL_MS = 5000\n```\n\n**Problem:** Cache is process-wide, survives across requests. No invalidation on integration config change. Stale data served for 5 seconds after changes.\n\n**Impact:** UI shows stale integration status. User enables integration, UI still shows disabled for up to 5s.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] GitHub sync engine uses fire-and-forget with no retry',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/github-sync-engine.ts pushes tasks to GitHub via fire-and-forget. No retry on failure, no dead letter queue.\n\n**Impact:** Network glitch = lost sync. Task created locally but not on GitHub. No way to detect or recover.\n\n**Fix:** Add retry with exponential backoff, persist failed syncs for retry.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] chat/messages route (754 lines) is monolithic — injection guard not applied to all inputs',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/chat/messages/route.ts is 754 lines. Uses scanForInjection and sanitizeForPrompt from injection-guard, but the large size makes it unclear if ALL user inputs are sanitized.\n\n**Risk:** One missed sanitization = XSS or prompt injection vulnerability.\n\n**Recommendation:** Break into smaller functions, add explicit input sanitization checklist.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Cron jobs stored in ~/.openclaw/cron/jobs.json — path traversal possible',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/cron/route.ts reads/writes to ~/.openclaw/cron/jobs.json. If OPENCLAW_HOME is manipulated, could read/write arbitrary files.\n\n**Risk:** Path traversal if env var is attacker-controlled.\n\n**Fix:** Validate path is within expected directory, use resolveWithin().',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Token usage endpoint (685 lines) has no rate limiting on POST',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/tokens/route.ts POST /api/tokens/usage has no rate limit.\n\n**Impact:** Attacker can flood token usage records, inflating costs and DB size.\n\n**Fix:** Add mutationLimiter to POST endpoint.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Webhook secret masked with last 4 chars only — partial exposure',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/webhooks/route.ts masks secrets as `••••••` + last 4 chars.\n\n**Problem:** If secret is short (8 chars), 50% is revealed. If secret is leaked via other means, partial exposure helps brute force.\n\n**Recommendation:** Never expose any part of the secret after creation. Only show `••••••••`.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Task dispatch has no concurrency limit — can spawn infinite agents',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/task-dispatch.ts dispatchAssignedTasks() has no concurrency limit.\n\n**Risk:** If many tasks are assigned at once, all dispatch simultaneously. Can overwhelm gateway, exhaust memory, cause OOM.\n\n**Fix:** Add concurrency limiter (e.g., max 5 concurrent dispatches).',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Backup files stored in same directory as DB — disk failure loses both',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/scheduler.ts runBackup() stores backups in `dirname(config.dbPath)/backups/`.\n\n**Problem:** Same disk as DB. If disk fails, both DB and backups are lost.\n\n**Fix:** Support off-site backup (S3, GCS, separate drive).',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] No automated rollback on failed deployment',
      desc: '**Finding (2026-09-03):**\n\nNo CI/CD pipeline, no automated deployment, no rollback mechanism.\n\n**Impact:** If bad code is deployed, manual recovery required. No way to quickly revert to last known good state.\n\n**Fix:** Add GitHub Actions workflow with build, test, deploy, and rollback steps.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Sessions endpoint (412 lines) exposes all sessions to any viewer',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/sessions/route.ts GET requires only viewer role, returns ALL sessions including other users.\n\n**Impact:** Any authenticated user can see all active sessions. Privacy leak.\n\n**Fix:** Filter sessions by workspace, add admin check for cross-user visibility.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Debug endpoint (180 lines) may expose sensitive info in production',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/debug/route.ts exists. No explicit production guard found.\n\n**Risk:** Debug endpoint leaking internals in production.\n\n**Fix:** Disable in production, or require admin role.',
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
