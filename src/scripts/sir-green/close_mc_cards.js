import fs from 'fs'
import path from 'path'
import https from 'https'

const secretsPath = 'C:\\Users\\kidsm\\Documents\\My Docs\\VOID Pirate Trading Co\\Obsidian_Vault\\03_Business_Operations\\_Hub\\_KEY_VAULT\\secrets.env'
const secrets = {}
for (const rawLine of fs.readFileSync(secretsPath, 'utf8').split('\n')) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx === -1) continue
  secrets[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
}

const API_KEY = secrets.TRELLO_KEY
const TOKEN = secrets.TRELLO_TOKEN
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

const evidenceComments = {
  '6a95b378e775bf3841ab50c4': {
    text: 'Verified fix: office-panel.tsx now captures fetch errors and renders offline fallback UI. Build: npx next build --webpack exit 0. Lines: 504-505, 534-625, 1563-1584.'
  },
  '6a95b3189cfc980b4631916e': {
    text: 'Verified fix: captain-office-panel.tsx preserves actual err.message instead of generic text. Build: npx next build --webpack exit 0. Lines: 78-82, 169-175.'
  },
  '6a97b9643c1add19b31f9088': {
    text: 'Verified fix: void-hivehealth-panel.tsx shows collector degradation banner and unavailable placeholders. Build: npx next build --webpack exit 0. Lines: 88, 107-115, 118-125, 137-166, 182-214.'
  },
  '6a97b965f33203f900b13e5d': {
    text: 'Verified fix: fleet_agent_profiles/{PINKCADY,SQUIDSTATION,STEALTHATTACK}/agents.json normalized to tokenBudget schema. Build: npx next build --webpack exit 0.'
  }
}

async function main() {
  for (const [cardId, comment] of Object.entries(evidenceComments)) {
    const res = await req(`/cards/${cardId}/actions/comments`, {
      method: 'POST',
      params: { text: comment.text }
    })
    console.log('Commented', res.status, cardId)
  }
}

main().catch(e => console.error(e))
