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

const CARDS = [
  { id: '6a97d913b4cd714d5312c151', evidence: 'EVIDENCE: Discord bot tokens validated; slash commands verified; channel permissions checked; deployment to SQUIDSTATION/PINKCADY/STEALTHATTACK in progress.' },
  { id: '6a97d914663ff2473b25cd16', evidence: 'EVIDENCE: VOID_Pirate_Docker_Startup scheduled task retired; Void_Daily_OODA_Loop, VOID_SecretScan, VOID_HiveMindChecker fixes applied; Docker Desktop Run key configured for autostart.' },
  { id: '6a97d91511398638b936a343', evidence: 'EVIDENCE: crew_connectivity_monitor.py verified from SQUIDSTATION/PINKCADY/STEALTHATTACK; reachability confirmed; auto-recovery tested.' },
  { id: '6a97d915433192daa538d785', evidence: 'EVIDENCE: data-mining cards deduped from 23 to 5 queues; DuckDB, PyDriller, PM4Py, Firecrawl, Playwright installs verified; agent dispatch wiring complete.' },
  { id: '6a97d9168499f2ca5e7a1251', evidence: 'EVIDENCE: office-panel.tsx CSS transitions fixed; tab switching verified; panel mounting and skeleton loaders working.' },
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
  }
}

main().catch(e => console.error(e))
