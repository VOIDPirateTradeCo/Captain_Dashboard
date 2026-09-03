import fs from 'fs'
import path from 'path'
import https from 'https'

const SECRETS_PATH = path.join('C:', 'Users', 'kidsm', 'Documents', 'My Docs', 'VOID Pirate Trading Co', 'Captain_Dashboard', 'Obsidian_Vault', '03_Business_Operations', '_Hub', '_KEY_VAULT', 'secrets.env')

function loadSecrets() {
  const text = fs.readFileSync(SECRETS_PATH, 'utf8')
  const vars = Object.create(null)
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const value = match[2].replace(/^["']|["']$/g, '')
    vars[match[1]] = value
  }
  return vars
}

function request(url, method = 'GET', body, headers = {}) {
  const secrets = loadSecrets()
  const key = secrets.TRELLO_API_KEY
  const token = secrets.TRELLO_TOKEN
  if (!key || !token) throw new Error('Missing TRELLO_API_KEY or TRELLO_TOKEN in secrets.env')

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers: { 'Content-Type': 'application/json', ...headers } }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  const boardId = '6a595669b8f8f99c93392f4f'
  const listName = 'VOID Ops'
  const cards = JSON.parse(fs.readFileSync(path.join('src', 'scripts', 'sir-green', 'fleet-bug-cards.json'), 'utf8'))

  const lists = await request(`https://api.trello.com/1/boards/${boardId}/lists?fields=name,id`)
  const list = JSON.parse(lists.body).find((l) => l.name === listName)
  if (!list) throw new Error(`List "${listName}" not found on board ${boardId}`)

  const labelMap = new Map()
  const allLabels = await request(`https://api.trello.com/1/boards/${boardId}/labels?fields=name,id`)
  for (const label of JSON.parse(allLabels.body)) {
    labelMap.set(label.name, label.id)
  }

  for (const card of cards) {
    const createBody = { idList: list.id, name: card.name, desc: card.desc }
    const matched = card.labels.map((l) => labelMap.get(l)).filter(Boolean)
    if (matched.length) createBody.idLabels = matched

    const res = await request('https://api.trello.com/1/cards', 'POST', createBody)
    if (res.status >= 400) {
      console.error('Failed', card.name, res.status, res.body)
      continue
    }
    const created = JSON.parse(res.body)
    console.log(`Created ${created.id}: ${card.name}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
