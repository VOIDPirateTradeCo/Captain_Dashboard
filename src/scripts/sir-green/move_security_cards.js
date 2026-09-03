import fs from 'fs'
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
const BOARD_ID = '6a595669b8f8f99c93392f4f'
const CARD_IDS = [
  '6a97c628c196633137aa0968',
  '6a97c62865eb90ac67d16c6f',
]

function req(input, opts = {}) {
  return new Promise((resolve, reject) => {
    const base = new URL('https://api.trello.com/1' + input.split('?')[0])
    const qs = new URLSearchParams(input.split('?')[1] || '')
    qs.set('key', API_KEY)
    qs.set('token', TOKEN)
    if (opts.params) Object.entries(opts.params).forEach(([k, v]) => qs.set(k, v))
    const url = `${base.toString()}?${qs.toString()}`
    const method = opts.method || 'GET'
    const body = opts.body ? JSON.stringify(opts.body) : null
    const request = https.request(url, { method }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try { resolve({ status: res.status, data: JSON.parse(text) }) } catch { resolve({ status: res.status, text }) }
      })
    })
    request.on('error', reject)
    if (body) request.write(body)
    request.end()
  })
}

async function main() {
  const listRes = await req(`/boards/${BOARD_ID}/lists?fields=name,id&cards=open`)
  console.log('lists status', listRes.status)
  console.log('lists count', listRes.data?.length)
  if (Array.isArray(listRes.data)) {
    for (const l of listRes.data.slice(0, 20)) {
      console.log(' -', l.id, l.name, 'cards', (l.cards || []).length)
    }
  } else {
    console.log('lists body', listRes.text || listRes.data)
  }
  const doneList = Array.isArray(listRes.data) ? listRes.data.find(l => /done/i.test((l && l.name) || '')) : null
  const doneListId = doneList?.id
  if (!doneListId) { console.error('Done list not found'); process.exit(1) }
  console.log('doneList', doneListId, doneList.name)

  for (const cardId of CARD_IDS) {
    const commentUrl = `/cards/${cardId}/actions/comments`
    const commentRes = await req(commentUrl, { method: 'POST', body: { text: 'Verified security/sandbox fixes in ~/.openclaw/openclaw.json: tools.deny + sandbox.mode=all, build exits 0, backup present.' } })
    console.log('Evidence', commentRes.status, cardId, commentRes.data?.id)
    const moveUrl = `/cards/${cardId}?idList=${doneListId}`
    console.log('move url', moveUrl)
    const moveRes = await req(moveUrl, { method: 'PUT' })
    console.log('Move', moveRes.status, cardId, moveRes.data?.name, moveRes.data?.idList)
    if (moveRes.status >= 400) console.log('move body', moveRes.text || moveRes.data)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
