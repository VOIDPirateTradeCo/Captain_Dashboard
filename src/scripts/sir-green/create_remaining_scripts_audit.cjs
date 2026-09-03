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
    // Remaining scripts
    {
      name: '[SCRIPT] check-api-contract-parity.mjs has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/check-api-contract-parity.mjs (154 lines) has no try/catch. If API call fails, script crashes.\n\n**Impact:** CI/CD pipeline failures.\n\n**Fix:** Add try/catch with error logging.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] check-node-version.mjs has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/check-node-version.mjs (23 lines) has no try/catch.\n\n**Impact:** Script crashes on missing node.\n\n**Fix:** Add try/catch.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] check-standalone-artifact.mjs has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/check-standalone-artifact.mjs (82 lines) has no try/catch.\n\n**Impact:** Script crashes on missing files.\n\n**Fix:** Add try/catch.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] check-workflow-action-pins.py has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/check-workflow-action-pins.py (43 lines) has no try/catch.\n\n**Impact:** Script crashes on API failure.\n\n**Fix:** Add try/catch.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] mock-gateway.mjs has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/mock-gateway.mjs (62 lines) has no try/catch.\n\n**Impact:** Mock gateway crashes.\n\n**Fix:** Add try/catch.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] start-e2e-server.mjs has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/start-e2e-server.mjs (290 lines) has no try/catch.\n\n**Impact:** E2E server crashes.\n\n**Fix:** Add try/catch.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] gen-star-history.py has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/gen-star-history.py (156 lines) has no try/catch.\n\n**Impact:** Script crashes on API failure.\n\n**Fix:** Add try/catch.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] generate-env.sh has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/generate-env.sh (89 lines) has no error handling.\n\n**Impact:** Script crashes on missing vars.\n\n**Fix:** Add set -euo pipefail.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] load-env.sh has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/load-env.sh (63 lines) has no error handling.\n\n**Impact:** Script crashes on missing file.\n\n**Fix:** Add error checks.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] load-env.test.sh has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/load-env.test.sh (64 lines) has no error handling.\n\n**Impact:** Tests fail silently.\n\n**Fix:** Add error checks.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] prepare-standalone-artifact.mjs has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/prepare-standalone-artifact.mjs (49 lines) has no try/catch.\n\n**Impact:** Script crashes on missing files.\n\n**Fix:** Add try/catch.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] security-audit.test.sh has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/security-audit.test.sh (54 lines) has no error handling.\n\n**Impact:** Tests fail silently.\n\n**Fix:** Add error checks.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] smoke-staging.mjs has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/smoke-staging.mjs (169 lines) has no try/catch.\n\n**Impact:** Script crashes on API failure.\n\n**Fix:** Add try/catch.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] start-standalone.sh has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/start-standalone.sh (48 lines) has no error handling.\n\n**Impact:** Script crashes on missing vars.\n\n**Fix:** Add set -euo pipefail.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[SCRIPT] station-doctor.sh has no error handling',
      desc: '**Finding (2026-09-03):**\n\nscripts/station-doctor.sh (190 lines) has no error handling.\n\n**Impact:** Script crashes on missing commands.\n\n**Fix:** Add set -euo pipefail.',
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
