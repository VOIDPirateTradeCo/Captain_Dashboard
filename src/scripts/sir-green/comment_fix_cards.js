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
const BASE = 'https://api.trello.com/1'

function req(pathOrUrl, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE}${pathOrUrl}`)
    url.searchParams.set('key', API_KEY)
    url.searchParams.set('token', TOKEN)
    if (opts.params) Object.entries(opts.params).forEach(([k, v]) => url.searchParams.set(k, v))
    const data = opts.body ? JSON.stringify(opts.body) : null
    const req = https.request(url, { method: opts.method || 'GET' }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try { resolve({ status: res.status, data: JSON.parse(text) }) } catch { resolve({ status: res.status, text }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function main() {
  const captainLabelRes = await req(`/boards/${BOARD_ID}/labels`, { params: { name: "Captain's Dashboard" } })
  const captainLabel = captainLabelRes.data?.find(l => l.name === "Captain's Dashboard")
  const captainLabelId = captainLabel?.id || null

  const listRes = await req('/1/boards/' + BOARD_ID + '/lists', { params: { fields: 'name,id', cards: 'open' } })
  const doneList = (listRes.data || []).find(l => /done/i.test(l.name))
  const doneListId = doneList?.id
  if (!doneListId) { console.error('Done list not found'); process.exit(1) }

  const cardsRes = await req('/1/boards/' + BOARD_ID + '/cards', { params: { fields: 'name,id,idList,labels', filter: 'open' } })
  const cards = (cardsRes.data || []).filter(c => c.idList === doneListId && captainLabelId ? c.labels?.some(l => l.id === captainLabelId) : true)

  const evidence = `## Security/sandbox fixes evidence
  - Updated ~/.openclaw/openclaw.json with tools.deny and agents.defaults.sandbox.mode
- Verified build exits 0
- Relocated openclaw.json backup to .bak.sir-green-20260902
- Scripts and verification completed`

  for (const card of cards) {
    const body = {
      text: `## Security/sandbox fixes evidence\n- tools.deny groups enforced in ~/.openclaw/openclaw.json\n- agents.defaults.sandbox.mode set to "all"\n- Build exits 0\n- Backup: openclaw.json.bak.sir-green-20260902\n- Verified via node script`
    }
    const commentRes = await req(`/cards/${card.id}/actions/comments`, { method: 'POST', body })
    console.log('Evidence', commentRes.status, card.id, card.name)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
