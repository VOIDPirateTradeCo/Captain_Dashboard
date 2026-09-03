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
const LABEL_IDS = ['6a8793a4f512c0a864c7c65b']
const BASE = 'https://api.trello.com/1'

const CARD = {
  name: '[SIR GREEN] Twelve Data integration: API route + Market panel + nav entry + vault secret',
  desc: 'Wired twelvedata.com into Mission Control.\n- Vault: TWELVEDATA_API_KEY in secrets.env\n- openclaw.json: integrations.twelvedata.apiKey + enabled + cacheTtlSeconds\n- mission-control/.env: TWELVEDATA_API_KEY\n- API: /api/void-market proxies Twelve Data with viewer auth and 8s timeout\n- Panel: src/components/panels/void-market-panel.tsx for symbol/type/interval/exchange\n- Nav: void-market added to nav-rail.tsx\n- Build: npx next build --webpack exits 0\nEvidence: verify /api/void-market?symbol=BTC/USD&type=quote&interval=1min returns JSON with symbol/close/change/volume/datetime.',
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
      body: { text: 'EVIDENCE: integration scaffold complete. Next: verify /api/void-market returns Twelve Data JSON and open void-market panel in dashboard.' },
    })
  }
}

main().catch(e => console.error(e))
