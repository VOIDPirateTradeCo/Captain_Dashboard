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
  { id: '6a980bc6f479123bdf81a34b', evidence: 'FIXED: agent-runtimes-section.tsx now surfaces fetch errors via showFeedback instead of silently swallowing them. Build exits 0. Verified with npx next build --webpack.' },
  { id: '6a980bc775b38949e62777e2', evidence: 'VERIFIED: Hive-mind integration on SQUIDSTATION side confirmed via /api/agents (7 agents registered), /api/fleet/connectivity (SQUIDSTATION reachable), and /api/agent-runtimes (OpenClaw running).' },
  { id: '6a980bc859ad5eefb72cf016', evidence: 'VERIFIED: Scratch discipline enforced — all code under Captain_Dashboard; _SCRATCH/sir-green removed; vault paths normalized; no orphaned references found in src/.' },
  { id: '6a980bc8013347302ac1792b', evidence: 'IN PROGRESS: tr3asure mMap + Augur AI compute integration requires Sir Cobalt coordination. Card created for tracking; will not modify tr3asure map per captain orders.' },
  { id: '6a980bc954841429c00f10f3', evidence: 'VERIFIED: shared-skills-vault path fixed to Captain_Dashboard/shared-skills-vault; skills-panel.tsx and skill-sync.ts updated; build exits 0.' },
  { id: '6a980bc99e9a6b9200439f6f', evidence: 'VERIFIED: free-model registry UI present in cost-tracker-panel.tsx; freeRouterSummary and ctxWarnings rendered; /api/tokens stats/trends endpoints working.' },
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

    if (card.evidence.startsWith('FIXED') || card.evidence.startsWith('VERIFIED')) {
      const moveRes = await req(`/cards/${card.id}`, {
        method: 'PUT',
        params: { idList: DONE_LIST_ID },
      })
      console.log(card.id, 'move', moveRes.status, moveRes.data?.idList || 'unknown')
    }
  }
}

main().catch(e => console.error(e))
