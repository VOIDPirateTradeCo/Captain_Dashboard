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
const LIST_ID = '6a595669b8f8f99c93392f6c'
const LABEL_IDS = ['6a8793a4f512c0a864c7c65b','6a97a24de6f187d922d8674b','6a850eb67d5e48250ccc4f52']
const BASE = 'https://api.trello.com/1'

const CARD = {
  name: '[P1] Augur compute bridge: route tr3asure tasks into MC fleet dispatch with evidence receipts',
  desc: 'Observed gap: tr3asure map tasks are not visible in Mission Control dispatch/queue, and Augur AI compute is not wired into fleet processing.\nGoal: route tr3asure tasks through the MC task bridge, attach execution evidence, and surface results in the dashboard.\nEvidence: verify by running an Augur-backed task from the dashboard and reading its receipt in /api/audit.',
  labels: LABEL_IDS,
  idList: LIST_ID,
}

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
  const res = await req('/cards', { method: 'POST', body: CARD })
  console.log('create', res.status, res.data?.id || res.data)
  const cardId = res.data?.id
  if (cardId) {
    await req(`/cards/${cardId}/actions/comments`, {
      method: 'POST',
      body: { text: 'EVIDENCE: opening task created for tr3asure/mMap + Augur fleet integration bridge. Next: inspect task routing endpoints and create dispatch handoff.' },
    })
  }
}

main().catch(e => console.error(e))
