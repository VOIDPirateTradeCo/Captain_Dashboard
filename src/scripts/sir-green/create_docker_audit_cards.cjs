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
      name: '[BUG] docker-compose.void.yml has hardcoded Windows paths — breaks on other machines',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has hardcoded paths:\n- `/c/Users/kidsm/.openclaw`\n- `/c/Users/kidsm/AppData/Local/hermes/bin/hermes.exe`\n- `/c/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/...`\n\n**Problem:** These paths are specific to one Windows machine. MC cannot be deployed to Linux or another Windows machine without manual editing.\n\n**Fix:** Use environment variables or relative paths.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Store is 1198 lines — monolithic state management',
      desc: '**Finding (2026-09-03):**\n\nsrc/store/index.ts is 1198 lines. It manages:\n- Tasks, agents, sessions, logs\n- Cron jobs, spawn requests, memory files\n- Token usage, model config\n- All API calls\n\n**Risks:**\n- Performance: entire store re-renders on any change\n- Bugs: hard to isolate issues in monolithic store\n- Testing: hard to unit test individual slices\n\n**Recommendation:** Split into smaller stores (useSessions, useAgents, useTasks, etc.)',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] GitHub workflows exist but no deployment workflow',
      desc: '**Finding (2026-09-03):**\n\n7 GitHub workflows exist:\n- codeql.yml (security scanning)\n- docker-publish.yml (build/push image)\n- osv-scanner.yml (vulnerability scan)\n- quality-gate.yml (lint, typecheck, test)\n- scorecard.yml (OpenSSF scorecard)\n- screenshot-drift.yml (UI change detection)\n- star-chart.yml (README chart refresh)\n\n**Missing:**\n- No deploy workflow (no CD)\n- No auto-deploy to SQUIDSTATION on merge to main\n- No rollback workflow\n\n**Impact:** All deployments are manual. No automated rollback on failure.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] .env.example missing critical env vars',
      desc: '**Finding (2026-09-03):**\n\n.env.example (184 lines) is missing:\n- MC_TRUSTED_PROXIES (required for rate limiting)\n- MC_PROXY_AUTH_TRUSTED_IPS (required for proxy auth)\n- MC_DISABLE_RATE_LIMIT (for testing)\n- MC_WEBHOOK_MAX_RETRIES (webhook retry count)\n- MC_TENANT_HOME_ROOT (super-admin tenant provisioning)\n- MC_DEFAULT_OWNER_GATEWAY (tenant provisioning)\n\n**Impact:** Users don\'t know these exist. Misconfigurations common.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
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
