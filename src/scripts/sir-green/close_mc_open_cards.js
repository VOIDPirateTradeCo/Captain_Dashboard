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
const BOARD_ID = '6a595669b8f8f99c93392f4f'
const DONE_LIST_ID = '6a595669b8f8f99c93392f6c'
const BASE = 'https://api.trello.com/1'

const CARDS = [
  { id: '6a979e0437a2aba37ee31682', evidence: 'Verified: MC dev server healthy on localhost:3000; /health returns 200; local login works with captain/captain; /api/agents returns 28 agents; /api/sessions returns 100 sessions; /api/fleet/connectivity shows SQUIDSTATION reachable; /api/fleet/resources shows fleet agents with statuses.' },
  { id: '6a95a7cdb81c34fa0aa0461e', evidence: 'Verified: MC dispatch em-dash bug fixed and verified; task-dispatch.ts builds and serves correctly.' },
  { id: '6a95a4435b3ad21ce9c0206f', evidence: 'Verified: Obsidian_Vault git repos option A completed; option B tracked separately.' },
  { id: '6a959cef841efba1588cfdb4', evidence: 'Verified: 20 scheduled tasks audited after vault renumber; audit complete.' },
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
