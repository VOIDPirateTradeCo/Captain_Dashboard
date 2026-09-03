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
  { id: '6a97d6ff4e536e0e53404e42', evidence: 'EVIDENCE: captain-office-panel.tsx wired to /api/fleet/connectivity; ship-level reachability/latency/last-seen rendered; build exits 0; live API shows SQUIDSTATION reachable, others offline.' },
  { id: '6a97d700dbc77cce0415fcc0', evidence: 'EVIDENCE: cost-tracker-panel.tsx always renders free-token router + context window watch; build exits 0; /api/tokens stats/trends endpoints verified.' },
  { id: '6a97d700eae312180400226a', evidence: 'EVIDENCE: void-hivehealth-panel.tsx adds fleet connectivity section; refresh reloads both monitor and connectivity; build exits 0.' },
  { id: '6a97d7017298ac99002750f0', evidence: 'EVIDENCE: /api/fleet/connectivity shows SQUIDSTATION reachable; /api/fleet/resources shows 7 fleet agents; shared-skills-vault path fixed; crew cards created on 3 boards.' },
  { id: '6a97d701a1bd610896d07ca1', evidence: 'EVIDENCE: comment_evidence.js, move_done.js, close_mc_open_cards.js operational; 20+ cards created, commented, and closed via script; dispatch-to-Trello workflow proven.' },
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
      params: { text: card.evidence },
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
