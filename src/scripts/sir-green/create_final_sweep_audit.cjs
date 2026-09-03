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
  const VOID_OPS_P2_LIST = '6a73abbf275aa5c96ab03e67'
  const BUG_LABEL = '6a839af9b5e7e56792d25e9c'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'

  const cards = [
    // Test coverage gaps
    {
      name: '[GAP] Test coverage gaps — 79 test files but missing critical areas',
      desc: '**Finding (2026-09-03):**\n\n79 test files exist but coverage is uneven:\n- auth-guards.spec.ts (50 lines) — too small for auth coverage\n- rate-limiting.spec.ts (38 lines) — minimal coverage\n- Missing tests for: websocket.ts, task-dispatch.ts, scheduler.ts, security-scan.ts\n- No integration tests for fleet connectivity\n- No performance tests\n\n**Impact:** Critical code paths untested. Regressions likely.\n\n**Fix:** Add tests for websocket handlers, task dispatch flow, scheduler, security scan. Add integration tests.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] GitHub workflow codeql.yml missing advanced security queries',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/codeql.yml (43 lines) uses default CodeQL queries. Missing:\n- Custom queries for SQL injection patterns\n- Custom queries for command injection patterns\n- Custom queries for hardcoded secrets\n\n**Impact:** CodeQL may miss project-specific security issues.\n\n**Fix:** Add custom CodeQL queries for MC-specific patterns.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] GitHub workflow docker-publish.yml missing image signing',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/docker-publish.yml (81 lines) publishes Docker images but does not sign them with Cosign/Docker Content Trust.\n\n**Impact:** No image integrity verification. Attacker could push malicious image.\n\n**Fix:** Add Cosign signing step to docker-publish.yml.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] GitHub workflow quality-gate.yml missing security scan',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/quality-gate.yml (74 lines) checks quality but missing:\n- Security scan step\n- Dependency vulnerability check\n- Secret detection\n\n**Impact:** Security issues not caught in CI.\n\n**Fix:** Add security scan, dependency check, and secret detection to quality gate.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] GitHub workflow screenshot-drift.yml may leak screenshots',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/screenshot-drift.yml (105 lines) captures screenshots of the dashboard. If screenshots contain sensitive data (agent names, internal IPs), they may leak.\n\n**Impact:** Sensitive data in screenshots visible to anyone with workflow access.\n\n**Fix:** Ensure screenshots do not contain sensitive data. Use test data.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[GAP] .env.example missing env vars used in code',
      desc: '**Finding (2026-09-03):**\n\n.env.example has 184 lines but may be missing some env vars actually used in code. Without comprehensive .env.example, deployments may fail silently.\n\n**Impact:** Missing config causes runtime errors.\n\n**Fix:** Audit all process.env.X references. Add missing vars to .env.example.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] No .env validation on startup — missing vars cause silent failures',
      desc: '**Finding (2026-09-03):**\n\nNo .env validation on startup. If required env vars are missing, MC starts but features fail silently.\n\n**Impact:** Hard to debug issues. Features appear broken.\n\n**Fix:** Add startup validation that checks all required env vars and fails fast with clear error message.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env encryption — secrets stored in plaintext',
      desc: '**Finding (2026-09-03):**\n\n.env file stores secrets in plaintext. No encryption at rest.\n\n**Impact:** If .env file is leaked (git accident, backup exposure), all secrets are compromised.\n\n**Fix:** Use encrypted env vars (e.g., git-crypt, SOPS) or vault integration.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env rotation policy — secrets never expire',
      desc: '**Finding (2026-09-03):**\n\nNo rotation policy for env vars. API keys, passwords, and tokens never expire.\n\n**Impact:** Stolen secrets remain valid forever.\n\n**Fix:** Implement secret rotation schedule. Use short-lived tokens where possible.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env backup — config loss = total reconfiguration',
      desc: '**Finding (2026-09-03):**\n\nNo backup of .env file. If lost, entire MC configuration must be recreated from scratch.\n\n**Impact:** Configuration loss = hours of reconfiguration.\n\n**Fix:** Add .env backup to encrypted backup system.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env versioning — cannot roll back config changes',
      desc: '**Finding (2026-09-03):**\n\n.env file is not versioned. Cannot roll back to previous configuration.\n\n**Impact:** Bad config change = manual rollback.\n\n**Fix:** Track .env changes in git (encrypted) or use config management tool.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env documentation — 184 lines but unclear which are required',
      desc: '**Finding (2026-09-03):**\n\n.env.example has 184 lines but does not clearly indicate which vars are required vs optional.\n\n**Impact:** Users don\'t know what to configure.\n\n**Fix:** Add REQUIRED/OPTIONAL markers. Group by feature.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env testing — example file may be out of sync with code',
      desc: '**Finding (2026-09-03):**\n\nNo test that verifies .env.example matches actual env vars used in code. They can drift apart.\n\n**Impact:** .env.example becomes unreliable.\n\n**Fix:** Add CI check that verifies all process.env.X references exist in .env.example.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env sanitization — special chars in values can break parsing',
      desc: '**Finding (2026-09-03):**\n\n.env values with special characters (#, $, spaces, quotes) can break naive parsers.\n\n**Impact:** Config parsing errors.\n\n**Fix:** Document escaping rules. Use a proper .env parser.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env size limit — large values can cause issues',
      desc: '**Finding (2026-09-03):**\n\nNo size limit on .env values. Very large values (e.g., long certificates) can cause parsing issues.\n\n**Impact:** Config loading failures.\n\n**Fix:** Add size limits. Use file references for large values.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env schema validation — typos in var names go undetected',
      desc: '**Finding (2026-09-03):**\n\nNo schema validation for .env. Typos in variable names (e.g., APIKEY instead of API_KEY) go undetected.\n\n**Impact:** Silent config failures.\n\n**Fix:** Add JSON schema validation for .env.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env diff — cannot see what changed between deployments',
      desc: '**Finding (2026-09-03):**\n\nNo way to diff .env between deployments. Cannot see what config changed.\n\n**Impact:** Hard to debug config-related issues.\n\n**Fix:** Add .env diff tool to deployment pipeline.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env audit trail — who changed what is not tracked',
      desc: '**Finding (2026-09-03):**\n\nNo audit trail for .env changes. Cannot know who changed what and when.\n\n**Impact:** No accountability for config changes.\n\n**Fix:** Track .env changes in version control or config management system.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env access control — anyone with server access can read secrets',
      desc: '**Finding (2026-09-03):**\n\n.env file is readable by any user with server access. No access control.\n\n**Impact:** Insider threat. Any admin can read all secrets.\n\n**Fix:** Restrict .env file permissions. Use vault for sensitive secrets.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env encryption in transit — secrets transmitted in plaintext',
      desc: '**Finding (2026-09-03):**\n\n.env values transmitted in plaintext during deployment. No encryption in transit.\n\n**Impact:** Network sniffing can capture secrets.\n\n**Fix:** Use encrypted channels (SSH, TLS) for all config transfers.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No .env integrity check — tampering goes undetected',
      desc: '**Finding (2026-09-03):**\n\nNo integrity check on .env file. Tampering (malicious or accidental) goes undetected.\n\n**Impact:** Modified config = unpredictable behavior.\n\n**Fix:** Add checksum verification for .env file.',
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
