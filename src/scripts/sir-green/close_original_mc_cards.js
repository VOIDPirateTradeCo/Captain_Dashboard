import fs from 'fs'
import https from 'https'

const secretsPath = 'C:\\Users\\kidsm\\Documents\\My Docs\\VOID Pirate Trading Co\\Obsidian_Vault\\03_Business_Operations\\_Hub\\_KEY_VAULT\\secrets.env'
const secrets = {}
for (const rawLine of fs.readFileSync(secretsPath, 'utf8').split('\n')) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx === -1) continue
  secrets[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
}

const API_KEY = secrets.TRELLO_KEY
const TOKEN = secrets.TRELLO_TOKEN
const DONE_LIST_ID = '6a595669b8f8f99c93392f6c'
const BASE = 'https://api.trello.com/1'

const CARDS = [
  { id: '6a97ba8c1bde119e2377dc8d', evidence: 'FIXED: agent-runtimes-section.tsx now surfaces errors via showFeedback in fetchRuntimes, job-status polling, handleInstall, handleCopyCompose, and handleDetect. Build exits 0.' },
  { id: '6a95b378e775bf3841ab50c4', evidence: 'VERIFIED: Hive-mind integration on SQUIDSTATION side confirmed via /api/agents (7 agents), /api/fleet/connectivity (SQUIDSTATION reachable), /api/agent-runtimes (OpenClaw running).' },
  { id: '6a9592e772e106fe29d04a12', evidence: 'VERIFIED: Scratch discipline enforced — all code under Captain_Dashboard; _SCRATCH/sir-green removed; vault paths normalized; no orphaned references in src/.' },
  { id: '6a979d87ba9dd232f0ab7ee5', evidence: 'VERIFIED: shared-skills-vault path fixed to Captain_Dashboard/shared-skills-vault; skills-panel.tsx and skill-sync.ts updated; build exits 0.' },
  { id: '6a979d870ad6fcca76f1c210', evidence: 'VERIFIED: free-model registry UI present in cost-tracker-panel.tsx; freeRouterSummary and ctxWarnings rendered; /api/tokens endpoints working.' },
]

function req(pathOrUrl, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE}${pathOrUrl}`)
    url.searchParams.set('key', API_KEY)
    url.searchParams.set('token', TOKEN)
    if (opts.params) Object.entries(opts.params).forEach(([k, v]) => url.searchParams.set(k, v))
    const data = opts.body ? JSON.stringify(opts.body) : null
    const req = https.request(url, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } }, res => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }) } catch (e) { resolve({ status: res.statusCode, data: body }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function main() {
  for (const card of CARDS) {
    const commentRes = await req(`/cards/${card.id}/actions/comments`, {
      method: 'POST',
      params: { text: `EVIDENCE: ${card.evidence}` },
    })
    console.log(card.id, 'comment', commentRes.status)

    const moveRes = await req(`/cards/${card.id}`, {
      method: 'PUT',
      params: { idList: DONE_LIST_ID },
    })
    console.log(card.id, 'move', moveRes.status, moveRes.data?.idList || 'unknown')
  }
}

main().catch(e => console.error(e))
