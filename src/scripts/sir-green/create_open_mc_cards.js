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
  { name: '[SIR GREEN] Runtime panel failures — second bug hunt', desc: 'Inspect agent-runtimes-section.tsx, agent-squad-panel.tsx, runtime-setup-modal.tsx for runtime panel failures. Verify /api/agent-runtimes response shape, timeout handling, and UI fallbacks. Build must stay green.' },
  { name: '[SIR GREEN] Hive-mind integration — SQUIDSTATION side', desc: 'Verify SQUIDSTATION hive-mind wiring: agent registration, heartbeat, task assignments, and fleet sync. Test with local MC dev server and post evidence.' },
  { name: '[SIR GREEN] Scratch discipline + vault-renumber fallout', desc: 'Audit _SCRATCH cleanup, vault renumber artifacts, and any orphaned references. Ensure all code lives under Captain_Dashboard and no stale paths remain.' },
  { name: '[P1] Integrate tr3asure mMap + Augur AI compute into MC fleet processing', desc: 'Wire tr3asure map data and Augur AI compute into Mission Control fleet processing. Verify end-to-end with evidence. Do not touch tr3asure cards; leave to Sir Cobalt.' },
  { name: '[SIR GREEN] Fleet shared skills + memory vault + smart workflow sync', desc: 'Verify shared-skills-vault path, memory vault sync, and workflow sync across SQUIDSTATION/STEALTHATTACK/PINKCADY. Test with actual file writes and reads.' },
  { name: '[SIR GREEN] Self-improving free-model registry in Mission Control', desc: 'Verify free-model registry UI and backend in Mission Control. Test free-tier model routing, fallback behavior, and cost tracker integration.' },
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
