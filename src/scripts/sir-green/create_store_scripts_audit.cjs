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
    // Store bugs
    {
      name: '[BUG] Store has no ErrorBoundary — state corruption crashes entire app',
      desc: '**Finding (2026-09-03):**\n\nsrc/store/index.ts (1198 lines) has no ErrorBoundary wrapper. A single state mutation error or API failure can crash the entire app.\n\n**Impact:** One bad API response = blank screen for all users.\n\n**Fix:** Wrap store operations in try/catch, add ErrorBoundary at app root and per-panel level.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Store has no optimistic updates — UI lags behind server state',
      desc: '**Finding (2026-09-03):**\n\nsrc/store/index.ts does not implement optimistic updates. Every state change waits for server confirmation.\n\n**Impact:** UI feels sluggish. Users click buttons, nothing happens until server responds.\n\n**Fix:** Implement optimistic updates for common actions (task status change, agent heartbeat).',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Store is monolithic 1198 lines — hard to maintain and debug',
      desc: '**Finding (2026-09-03):**\n\nsrc/store/index.ts is 1198 lines managing all state: tasks, agents, sessions, logs, cron jobs, spawn requests, memory files, token usage, model config.\n\n**Impact:**\n- Performance: entire store re-renders on any change\n- Bugs: hard to isolate issues in monolithic store\n- Testing: hard to unit test individual slices\n\n**Recommendation:** Split into smaller stores (useSessions, useAgents, useTasks, etc.) using Zustand slices pattern.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Scripts bugs
    {
      name: '[BUG] agent-heartbeat.sh has hardcoded localhost:3000 — fails on remote ships',
      desc: '**Finding (2026-09-03):**\n\nscripts/agent-heartbeat.sh line 14:\n```bash\nMISSION_CONTROL_URL="${MISSION_CONTROL_URL:-http://localhost:3000}"\n```\n\n**Problem:** Default is localhost:3000 but master MC is on :3001. Ships using this script without setting env var will fail.\n\n**Fix:** Default to https://192.168.0.39:3100 or require explicit env var.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] mc-cli.cjs has hardcoded API key and unvalidated input',
      desc: '**Finding (2026-09-03):**\n\nscripts/mc-cli.cjs (731 lines) has:\n- Hardcoded secrets in config\n- Unvalidated process.argv input\n\n**Impact:** Secrets leak in source code. CLI injection possible.\n\n**Fix:** Read secrets from env vars or vault. Validate all CLI inputs.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] mc-tui.cjs has hardcoded API key and unvalidated input',
      desc: '**Finding (2026-09-03):**\n\nscripts/mc-tui.cjs (1236 lines) has:\n- Hardcoded secrets in config\n- Unvalidated process.argv input\n\n**Impact:** Secrets leak in source code. TUI injection possible.\n\n**Fix:** Read secrets from env vars or vault. Validate all CLI inputs.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] mc-mcp-server.cjs has hardcoded API key',
      desc: '**Finding (2026-09-03):**\n\nscripts/mc-mcp-server.cjs (853 lines) has hardcoded secrets in config.\n\n**Impact:** Secrets leak in source code.\n\n**Fix:** Read secrets from env vars or vault.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] deploy-standalone.sh has hardcoded secrets',
      desc: '**Finding (2026-09-03):**\n\nscripts/deploy-standalone.sh (249 lines) has hardcoded secrets.\n\n**Impact:** Secrets leak in source code.\n\n**Fix:** Read secrets from env vars or vault.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] security-audit.sh has hardcoded secrets and no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/security-audit.sh (230 lines) has hardcoded secrets and no error handling.\n\n**Impact:** Secrets leak. Audit may fail silently.\n\n**Fix:** Read secrets from env vars. Add set -euo pipefail and error checks.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] notification-daemon.sh has hardcoded localhost:3000',
      desc: '**Finding (2026-09-03):**\n\nscripts/notification-daemon.sh has hardcoded localhost:3000.\n\n**Problem:** Default is localhost:3000 but master MC is on :3001.\n\n**Fix:** Default to https://192.168.0.39:3100 or require explicit env var.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] claude-router.py has hardcoded Windows path to claude.cmd',
      desc: '**Finding (2026-09-03):**\n\nscripts/claude-router.py line 10:\n```python\nCLAUD_CMD = r"C:\\Users\\kidsm\\AppData\\Roaming\\npm\\claude.cmd"\n```\n\n**Problem:** Hardcoded to one user\'s Windows path. Fails on any other machine.\n\n**Fix:** Use `which claude` or env var CLAUDE_CMD.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] claude-cli-proxy.py has hardcoded Windows path to claude.cmd',
      desc: '**Finding (2026-09-03):**\n\nscripts/claude-cli-proxy.py line 9:\n```python\nCLAUD_CMD = r"C:\\Users\\kidsm\\AppData\\Roaming\\npm\\claude.cmd"\n```\n\n**Problem:** Hardcoded to one user\'s Windows path. Fails on any other machine.\n\n**Fix:** Use `which claude` or env var CLAUDE_CMD.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    // Docker issues
    {
      name: '[BUG] docker-compose.void.yml has hardcoded Windows paths — not portable',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has hardcoded Windows paths:\n- `/c/Users/kidsm/.openclaw`\n- `/c/Users/kidsm/AppData/Local/hermes/bin/hermes.exe`\n- `/c/Users/kidsm/Documents/My Docs/...`\n\n**Problem:** These paths are specific to one Windows machine. MC cannot be deployed to Linux or another Windows machine without manual editing.\n\n**Fix:** Use environment variables or relative paths.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Dockerfile copies certs/ directory — may leak TLS private keys',
      desc: '**Finding (2026-09-03):**\n\nDockerfile line 71: `COPY certs/ /app/certs/`\n\n**Risk:** If certs/ contains private keys (mc.key), they are baked into the Docker image. Anyone with image access can extract them.\n\n**Fix:** Mount certs at runtime, or use Docker secrets.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No resource limits on NetBird/Headscale/Netmaker containers',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.yml has resource limits on mission-control (512M, 1 CPU) but NO limits on:\n- netbird_mgmt\n- headscale\n- netmaker\n\n**Impact:** Mesh containers can consume all host resources, starving MC.\n\n**Fix:** Add deploy.resources.limits to all containers.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No log rotation on mesh containers',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has logging config for mission-control (max-size: 10m, max-file: 3) but NO logging config for:\n- netbird_mgmt\n- headscale\n- netmaker\n\n**Impact:** Mesh container logs grow unbounded. Can fill disk.\n\n**Fix:** Add logging config to all containers.',
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
