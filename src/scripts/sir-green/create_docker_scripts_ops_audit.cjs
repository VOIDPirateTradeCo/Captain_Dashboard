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
    // Docker
    {
      name: '[DOCKER] docker-compose.void.yml has hardcoded Windows paths — not portable',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has hardcoded Windows paths:\n- `/c/Users/kidsm/.openclaw`\n- `/c/Users/kidsm/AppData/Local/hermes/bin/hermes.exe`\n- `/c/Users/kidsm/Documents/My Docs/...`\n\n**Problem:** These paths are specific to one Windows machine. MC cannot be deployed to Linux or another Windows machine without manual editing.\n\n**Fix:** Use environment variables or relative paths.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[DOCKER] Dockerfile copies certs/ directory — may leak TLS private keys',
      desc: '**Finding (2026-09-03):**\n\nDockerfile line 71: `COPY certs/ /app/certs/`\n\n**Risk:** If certs/ contains private keys (mc.key), they are baked into the Docker image. Anyone with image access can extract them.\n\n**Fix:** Mount certs at runtime, or use Docker secrets.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[DOCKER] Dockerfile installs build tools in runtime image — bloated attack surface',
      desc: '**Finding (2026-09-03):**\n\nDockerfile runtime stage installs:\n- python3\n- git\n- make\n- g++\n- procps\n\n**Impact:**\n- Larger image size\n- More attack surface\n- Unnecessary tools in production\n\n**Fix:** Move build tools to build stage only. Runtime should only have curl, ca-certificates.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[DOCKER] docker-entrypoint.sh generates secrets on first run — not persisted across restarts',
      desc: '**Finding (2026-09-03):**\n\ndocker-entrypoint.sh generates AUTH_SECRET and API_KEY on first run and saves to .data/.generated-secrets. But if .data volume is lost, new secrets are generated, invalidating all existing sessions.\n\n**Impact:** All users logged out when container recreates.\n\n**Fix:** Persist .data volume, or allow secrets to be set via env vars.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[DOCKER] docker-entrypoint.sh starts HTTPS proxy with sleep 2 — race condition',
      desc: '**Finding (2026-09-03):**\n\ndocker-entrypoint.sh line 57: `sleep 2`\n\n**Problem:** Assumes proxy starts in 2 seconds. If proxy takes longer, Next.js starts without proxy. If proxy fails, no retry.\n\n**Impact:** Intermittent startup failures.\n\n**Fix:** Use a proper health check loop with timeout.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[DOCKER] No resource limits on mesh containers',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has resource limits on mission-control (512M, 1 CPU) but NO limits on:\n- netbird_mgmt\n- headscale\n- netmaker\n\n**Impact:** Mesh containers can consume all host resources, starving MC.\n\n**Fix:** Add deploy.resources.limits to all containers.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[DOCKER] No log rotation on mesh containers',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has logging config for mission-control (max-size: 10m, max-file: 3) but NO logging config for:\n- netbird_mgmt\n- headscale\n- netmaker\n\n**Impact:** Mesh container logs grow unbounded. Can fill disk.\n\n**Fix:** Add logging config to all containers.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[DOCKER] No restart policy on mesh containers',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has restart: unless-stopped on mission-control but NO restart policy on:\n- netbird_mgmt\n- headscale\n- netmaker\n\n**Impact:** Mesh containers do not restart after crash or host reboot. Manual intervention required.\n\n**Fix:** Add restart: unless-stopped to all containers.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Scripts
    {
      name: '[SCRIPT] agent-heartbeat.sh has hardcoded localhost:3000 — fails on remote ships',
      desc: '**Finding (2026-09-03):**\n\nscripts/agent-heartbeat.sh line 14:\n```bash\nMISSION_CONTROL_URL="${MISSION_CONTROL_URL:-http://localhost:3000}"\n```\n\n**Problem:** Default is localhost:3000 but master MC is on :3100. Ships using this script without setting env var will fail.\n\n**Fix:** Default to https://192.168.0.39:3100 or require explicit env var.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[SCRIPT] mc-cli.cjs has hardcoded API key and unvalidated input',
      desc: '**Finding (2026-09-03):**\n\nscripts/mc-cli.cjs (731 lines) has:\n- Hardcoded secrets in config\n- Unvalidated process.argv input\n\n**Impact:** Secrets leak in source code. CLI injection possible.\n\n**Fix:** Read secrets from env vars or vault. Validate all CLI inputs.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] mc-tui.cjs has hardcoded API key and unvalidated input',
      desc: '**Finding (2026-09-03):**\n\nscripts/mc-tui.cjs (1236 lines) has:\n- Hardcoded secrets in config\n- Unvalidated process.argv input\n\n**Impact:** Secrets leak in source code. TUI injection possible.\n\n**Fix:** Read secrets from env vars or vault. Validate all CLI inputs.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] mc-mcp-server.cjs has hardcoded API key',
      desc: '**Finding (2026-09-03):**\n\nscripts/mc-mcp-server.cjs (853 lines) has hardcoded secrets in config.\n\n**Impact:** Secrets leak in source code.\n\n**Fix:** Read secrets from env vars or vault.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] deploy-standalone.sh has hardcoded secrets',
      desc: '**Finding (2026-09-03):**\n\nscripts/deploy-standalone.sh (249 lines) has hardcoded secrets.\n\n**Impact:** Secrets leak in source code.\n\n**Fix:** Read secrets from env vars or vault.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] security-audit.sh has hardcoded secrets and no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/security-audit.sh (230 lines) has hardcoded secrets and no error handling.\n\n**Impact:** Secrets leak. Audit may fail silently.\n\n**Fix:** Read secrets from env vars. Add set -euo pipefail and error checks.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] notification-daemon.sh has hardcoded localhost:3000',
      desc: '**Finding (2026-09-03):**\n\nscripts/notification-daemon.sh has hardcoded localhost:3000.\n\n**Problem:** Default is localhost:3000 but master MC is on :3100.\n\n**Fix:** Default to https://192.168.0.39:3100 or require explicit env var.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[SCRIPT] claude-router.py has hardcoded Windows path to claude.cmd',
      desc: '**Finding (2026-09-03):**\n\nscripts/claude-router.py line 10:\n```python\nCLAUD_CMD = r"C:\\Users\\kidsm\\AppData\\Roaming\\npm\\claude.cmd"\n```\n\n**Problem:** Hardcoded to one user\'s Windows path. Fails on any other machine.\n\n**Fix:** Use `which claude` or env var CLAUDE_CMD.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] claude-cli-proxy.py has hardcoded Windows path to claude.cmd',
      desc: '**Finding (2026-09-03):**\n\nscripts/claude-cli-proxy.py line 9:\n```python\nCLAUD_CMD = r"C:\\Users\\kidsm\\AppData\\Roaming\\npm\\claude.cmd"\n```\n\n**Problem:** Hardcoded to one user\'s Windows path. Fails on any other machine.\n\n**Fix:** Use `which claude` or env var CLAUDE_CMD.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // Ops
    {
      name: '[OPS] mc-provisioner-daemon.js has no error handling — crashes on DB failure',
      desc: '**Finding (2026-09-03):**\n\nops/mc-provisioner-daemon.js (353 lines) has no try/catch. If DB query fails, the daemon crashes.\n\n**Impact:** Provisioning stops working.\n\n**Fix:** Add try/catch with error logging and retry logic.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[OPS] provisioner-limits.cjs has no validation — accepts any input',
      desc: '**Finding (2026-09-03):**\n\nops/provisioner-limits.cjs (33 lines) has no input validation.\n\n**Impact:** Invalid limits accepted.\n\n**Fix:** Add validation for limit values.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // GitHub workflows
    {
      name: '[CI] codeql.yml missing advanced security queries',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/codeql.yml (43 lines) uses default CodeQL queries. Missing:\n- Custom queries for SQL injection patterns\n- Custom queries for command injection patterns\n- Custom queries for hardcoded secrets\n\n**Impact:** CodeQL may miss project-specific security issues.\n\n**Fix:** Add custom CodeQL queries for MC-specific patterns.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[CI] docker-publish.yml missing image signing',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/docker-publish.yml (81 lines) publishes Docker images but does not sign them with Cosign/Docker Content Trust.\n\n**Impact:** No image integrity verification. Attacker could push malicious image.\n\n**Fix:** Add Cosign signing step to docker-publish.yml.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[CI] quality-gate.yml missing security scan',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/quality-gate.yml (74 lines) checks quality but missing:\n- Security scan step\n- Dependency vulnerability check\n- Secret detection\n\n**Impact:** Security issues not caught in CI.\n\n**Fix:** Add security scan, dependency check, and secret detection to quality gate.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[CI] screenshot-drift.yml may leak screenshots with sensitive data',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/screenshot-drift.yml (105 lines) captures screenshots of the dashboard. If screenshots contain sensitive data (agent names, internal IPs), they may leak.\n\n**Impact:** Sensitive data in screenshots visible to anyone with workflow access.\n\n**Fix:** Ensure screenshots do not contain sensitive data. Use test data.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Tests
    {
      name: '[TEST] Test coverage gaps — 79 test files but missing critical areas',
      desc: '**Finding (2026-09-03):**\n\n79 test files exist but coverage is uneven:\n- auth-guards.spec.ts (50 lines) — too small for auth coverage\n- rate-limiting.spec.ts (38 lines) — minimal coverage\n- Missing tests for: websocket.ts, task-dispatch.ts, scheduler.ts, security-scan.ts\n- No integration tests for fleet connectivity\n- No performance tests\n\n**Impact:** Critical code paths untested. Regressions likely.\n\n**Fix:** Add tests for websocket handlers, task dispatch flow, scheduler, security scan. Add integration tests.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    // Store
    {
      name: '[STORE] Store has no ErrorBoundary — state corruption crashes entire app',
      desc: '**Finding (2026-09-03):**\n\nsrc/store/index.ts (1198 lines) has no ErrorBoundary wrapper. A single state mutation error or API failure can crash the entire app.\n\n**Impact:** One bad API response = blank screen for all users.\n\n**Fix:** Wrap store operations in try/catch, add ErrorBoundary at app root and per-panel level.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[STORE] Store has no optimistic updates — UI lags behind server state',
      desc: '**Finding (2026-09-03):**\n\nsrc/store/index.ts does not implement optimistic updates. Every state change waits for server confirmation.\n\n**Impact:** UI feels sluggish. Users click buttons, nothing happens until server responds.\n\n**Fix:** Implement optimistic updates for common actions (task status change, agent heartbeat).',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[STORE] Store is monolithic 1198 lines — hard to maintain and debug',
      desc: '**Finding (2026-09-03):**\n\nsrc/store/index.ts is 1198 lines managing all state: tasks, agents, sessions, logs, cron jobs, spawn requests, memory files, token usage, model config.\n\n**Impact:**\n- Performance: entire store re-renders on any change\n- Bugs: hard to isolate issues in monolithic store\n- Testing: hard to unit test individual slices\n\n**Recommendation:** Split into smaller stores (useSessions, useAgents, useTasks, etc.) using Zustand slices pattern.',
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
