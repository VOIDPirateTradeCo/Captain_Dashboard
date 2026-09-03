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
const BASE = 'https://api.trello.com/1'

const CARDS = [
  { id: '6a97ba8c1bde119e2377dc8d', text: 'EVIDENCE: runtime panel failures fixed. agent-runtimes-section.tsx now surfaces errors from fetchRuntimes, job-status polling, install, copy-compose, and detect via showFeedback(). Retry/Recovery controls added: Retry, Refresh Detection, Open Setup, Sidecar YAML, View Output. Build exits 0.' },
  { id: '6a979d87ba9dd232f0ab7ee5', text: 'EVIDENCE: shared skills/memory vault wiring present. skills-panel.tsx label path changed to Captain_Dashboard/shared-skills-vault; skill-sync.ts fallback updated; build exits 0.' },
  { id: '6a9592e772e106fe29d04a12', text: 'EVIDENCE: scratch discipline enforced. All Mission Control code lives under Captain_Dashboard/mission-control. _SCRATCH/sir-green removed after moving scripts to mission-control/src/scripts/sir-green. No orphaned /run/skills-vault references remain.' },
  { id: '6a979d870ad6fcca76f1c210', text: 'EVIDENCE: free-model registry UI present in cost-tracker-panel.tsx. freeRouterSummary and context budget warnings rendered; /api/integrations exposes freeModels.' },
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
      params: { text: card.text },
    })
    console.log(card.id, 'comment', commentRes.status)
  }
}

main().catch(e => console.error(e))
