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
const BASE = 'https://api.trello.com/1'

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

const MISSION_CONTROL_LISTS = new Set([
  'To Do Next',
  'P0 - Critical',
  'P1 - High',
  'P2 - Medium',
  'P3 - Low',
  'P4 - Backlog',
  'PROJECT: Pirate Captain\'s Dashboard',
])

async function main() {
  const listsRes = await req(`/boards/${BOARD_ID}/lists`, { params: { fields: 'name,id', filter: 'open' } })
  const lists = Array.isArray(listsRes.data) ? listsRes.data : []
  const listNameById = new Map(lists.map(l => [l.id, l.name]))
  const missionControlListIds = new Set()
  for (const l of lists) {
    if (MISSION_CONTROL_LISTS.has(l.name)) missionControlListIds.add(l.id)
  }
  console.log('MC lists:', [...missionControlListIds].map(id => `${id} (${listNameById.get(id)})`).join('\n'))

  const cardsRes = await req(`/boards/${BOARD_ID}/cards`, { params: { fields: 'id,name,idList,labels', filter: 'open' } })
  const cards = Array.isArray(cardsRes.data) ? cardsRes.data : []
  console.log('open cards total:', cards.length)

  const filtered = cards.filter(card => missionControlListIds.has(card.idList))
  console.log('MC open cards:', filtered.length)
  for (const c of filtered) {
    const labels = (c.labels || []).map(l => l.name || l.id).join(', ')
    console.log(`- ${c.id} [${listNameById.get(c.idList) || c.idList}] ${labels} :: ${c.name}`)
  }
}

main().catch(e => console.error(e))
