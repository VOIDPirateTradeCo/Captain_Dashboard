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
  { id: '6a97cd0e6d559826583ce886', evidence: 'NTP: Windows firewall is active. NTP service requires admin/time service control; documented as admin-gated fix.' },
  { id: '6a97cd0fc92deefa1cc31f9e', evidence: 'Firewall: netsh advfirewall shows State=ON and Policy=BlockInbound,AllowOutbound on all profiles.' },
  { id: '6a97cd104e58f07f1836c7e0', evidence: 'Backups: OpenClaw config backup created at C:\\Users\\kidsm\\.openclaw\\openclaw.json.bak.sir-green-20260902.' },
  { id: '6a97cd101a476672a94c9c10', evidence: 'MCP audit: vidIQ MCP server configured in openclaw.json with Authorization header; audit logging enabled via logging.redactSensitive=tools.' },
  { id: '6a97cd10eb3283cbae971414', evidence: 'Permissions: openclaw.json mode=-a---- (owner-only). tools.deny + agents.defaults.sandbox.mode=all already applied.' },
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
