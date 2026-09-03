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
  const key = line.slice(0, idx).trim()
  const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  secrets[key] = value
}

console.log('parsed keys', Object.keys(secrets).slice(0, 20))
console.log('has token', typeof secrets.TRELLO_TOKEN === 'string' && secrets.TRELLO_TOKEN.length > 0)

function req(pathOrUrl, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathOrUrl.startsWith('http') ? pathOrUrl : `https://api.trello.com/1${pathOrUrl}`)
    url.searchParams.set('key', secrets.TRELLO_KEY)
    url.searchParams.set('token', secrets.TRELLO_TOKEN)
    if (opts.params) Object.entries(opts.params).forEach(([k, v]) => url.searchParams.set(k, v))
    const data = opts.body ? JSON.stringify(opts.body) : null
    const req = https.request(url, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } }, res => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => {
        console.log('http status', res.statusCode, 'url', url.toString())
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }) } catch (e) { resolve({ status: res.statusCode, data: body }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function main() {
  const res = await req(`/boards/6a595669b8f8f99c93392f4f/lists`, { params: { fields: 'name,id', filter: 'open' } })
  console.log('status', res.status)
  const lists = Array.isArray(res.data) ? res.data : []
  console.log('lists count', lists.length)
  console.log('lists', lists.map(l => `${l.id} ${l.name}`).join('\n'))
}

main().catch(e => console.error(e))
