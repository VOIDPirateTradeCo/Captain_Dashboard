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
  { name: '[P1][SIR GREEN] Office tab animations + workflows broken', desc: 'Goal: fully working Mission Control dashboard.\nBug: Office tab animations and workflow logic are broken or missing.\nFix: audit office-panel.tsx animation state machines, movement paths, event system; restore missing workflow triggers and verify transitions.' },
  { name: '[P1][SIR GREEN] Cost Tracker incomplete — no real spend enforcement', desc: 'Goal: fully working Mission Control dashboard.\nBug: cost-tracker-panel.tsx shows data but does not enforce budgets.\nFix: wire dispatchHardBudgetUsd into dispatch flow; show per-agent/token spend in UI with context window warnings.' },
  { name: '[P1][SIR GREEN] Logs / Activity / Monitoring systems incomplete', desc: 'Goal: fully working Mission Control dashboard.\nBug: logs, activity feed, and monitoring panels lack real data pipelines or are placeholders.\nFix: wire live log ingestion, activity event bus, and monitoring collectors; verify panels render live updates.' },
  { name: '[P1][SIR GREEN] Fleet sync incomplete — agents not linked across PCs', desc: 'Goal: sync Mission Control across SQUIDSTATION/STEALTHATTACK/PINKCADY.\nBug: fleet connectivity shows only SQUIDSTATION reachable; other PCs offline.\nFix: verify Tailscale/SMB connectivity, agent registration, heartbeat sync, and shared skills vault replication.' },
  { name: '[P1][SIR GREEN] Dispatch-to-Trello workflow missing', desc: 'Goal: agents should auto-create/update Trello cards from dispatch tasks.\nBug: no wiring between task-dispatch.ts and Trello API.\nFix: add dispatch callback that creates Trello cards with labels/evidence; verify end-to-end with test dispatch.' },
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
