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

const targets = {
  '6a97b966b68985e59245d9c9': 'Implemented tools.deny in ~/.openclaw/openclaw.json: ["group:automation","group:runtime","group:fs"]. Backup: openclaw.json.bak.sir-green-20260902.',
  '6a97b9667a72e39aa10745fa': 'Implemented agents.defaults.sandbox.mode = "all" in ~/.openclaw/openclaw.json. Backup: openclaw.json.bak.sir-green-20260902.'
}

async function main() {
  for (const [id, text] of Object.entries(targets)) {
    const res = await req(`/cards/${id}/actions/comments`, { method: 'POST', params: { text } })
    console.log('Commented', res.status, id)
  }

  const doneListId = '6a595669b8f8f99c93392f6c'
  for (const id of Object.keys(evidence)) {
    const res = await req(`/cards/${id}`, { method: 'PUT', params: { idList: doneListId } })
    console.log('Moved', res.status, id, res.data?.name)
  }
}

main().catch(e => console.error(e))
