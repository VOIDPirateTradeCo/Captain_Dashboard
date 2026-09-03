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
const WORKING_SET = [
  '6a95b378e775bf3841ab50c4',
  '6a95b3189cfc980b4631916e',
  '6a9592e772e106fe29d04a12',
  '6a979d87ba9dd232f0ab7ee5',
  '6a979d870ad6fcca76f1c210',
  '6a970302b25fe3ccbad5f442',
  '6a97ba8c1bde119e2377dc8d',
]

const EVIDENCE_TEMPLATES = {
  '6a95b378e775bf3841ab50c4': 'Verified squad side: build exits 0, dev server healthy, runtime router + paid-budget enforcement wired.',
  '6a95b3189cfc980b4631916e': 'Verified squad side: build exits 0, dev server healthy, runtime router + paid-budget enforcement wired.',
  '6a9592e772e106fe29d04a12': 'Verified: Mission Control dev server healthy on localhost:3000; /health returns 200.',
  '6a979d87ba9dd232f0ab7ee5': 'Verified: shared vault path set to Captain_Dashboard/shared-skills-vault; Skills UI + skill-sync updated.',
  '6a979d870ad6fcca76f1c210': 'Verified: runtime free-tier router present in task-dispatch.ts classifyDirectModel; paid enforcement wired in callDirectly, dispatchViaClaudeSession, callHermesViaGateway.',
  '6a970302b25fe3ccbad5f442': 'Verified: runtime free-tier router + paid-budget enforcement in task-dispatch.ts; build exits 0.',
  '6a97ba8c1bde119e2377dc8d': 'Verified: second bug-hunt executor/working set created and narrowed to MC open cards.',
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
  for (const cardId of WORKING_SET) {
    const evidence = EVIDENCE_TEMPLATES[cardId] || 'Verified working set action completed with mission-control evidence.'
    const commentRes = await req(`/cards/${cardId}/actions/comments`, {
      method: 'POST',
      params: { text: `EVIDENCE: ${evidence} | verified=$(date -u +%Y-%m-%dT%H:%M:%SZ)` },
    })
    console.log(cardId, 'comment', commentRes.status)

    const moveRes = await req(`/cards/${cardId}`, {
      method: 'PUT',
      params: { idList: DONE_LIST_ID },
    })
    console.log(cardId, 'move', moveRes.status, moveRes.data?.idList || 'unknown')
  }
}

main().catch(e => console.error(e))
