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
const LIST_ID = '6a73abbf4539aaa060199c07'
const BASE = 'https://api.trello.com/1'

const CARDS = [
  { name: '[P1][SIR GREEN] Discord bot E2E validation + deployment', desc: 'Goal: fully working Mission Control dashboard.\nFix: validate bot tokens, verify channel permissions, test slash commands, deploy to crew PCs (SQUIDSTATION/PINKCADY/STEALTHATTACK).' },
  { name: '[P1][SIR GREEN] Scheduled task fixes — retire Docker startup + fix OODA/secret scan/hive mind', desc: 'Goal: fully working Mission Control dashboard.\nFix: retire VOID_Pirate_Docker_Startup scheduled task; fix Void_Daily_OODA_Loop, VOID_SecretScan, VOID_HiveMindChecker, and other scheduled tasks.' },
  { name: '[P1][SIR GREEN] Connectivity monitor verification across all 3 rigs', desc: 'Goal: fully working Mission Control dashboard.\nFix: run crew_connectivity_monitor.py from SQUIDSTATION/PINKCADY/STEALTHATTACK; verify reachability and auto-recovery.' },
  { name: '[P1][SIR GREEN] Data-mining skill queue — dedupe + install verified', desc: 'Goal: fully working Mission Control dashboard.\nFix: dedupe 23 data-mining cards into ONE queue; verify DuckDB, PyDriller, PM4Py, Firecrawl, Playwright installs; wire into agent dispatch.' },
  { name: '[P1][SIR GREEN] Office tab animation/transition glitches', desc: 'Goal: fully working Mission Control dashboard.\nFix: fix CSS transitions in office-panel.tsx; verify tab switching, panel mounting, and skeleton loaders.' },
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
  const labelRes = await req(`/boards/${BOARD_ID}/labels`, { params: { fields: 'id,name,color' } })
  const labels = Array.isArray(labelRes.data) ? labelRes.data : []
  const green = labels.find(l => (l.name || '').toLowerCase() === 'sir-green')
  const mission = labels.find(l => (l.name || '').toLowerCase() === 'mission control')
  const greenId = green?.id
  const missionId = mission?.id

  for (const card of CARDS) {
    const res = await req(`/cards`, {
      method: 'POST',
      params: {
        idList: LIST_ID,
        name: card.name,
        desc: card.desc,
        idLabels: [greenId, missionId].filter(Boolean).join(','),
      },
    })
    console.log(card.name, res.status, res.data?.id || res.data)
  }
}

main().catch(e => console.error(e))
