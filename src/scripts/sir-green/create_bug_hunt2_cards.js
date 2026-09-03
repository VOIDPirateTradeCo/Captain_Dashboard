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
const BOARD_ID = '6a595669b8f8f99c93392f4f'
const TODO_LIST_ID = '6a595667ce299b73aab30f88'
const DONE_LIST_ID = '6a595669b8f8f99c93392f6c'
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

async function findLabel(name) {
  const res = await req(`/boards/${BOARD_ID}/labels`, { params: { name } })
  const data = Array.isArray(res.data) ? res.data : []
  return data.find(l => l.name === name)?.id || null
}

async function main() {
  const sirGreenLabel = '6a97a24de6f187d922d8674b'
  let captainLabelId = await findLabel("captain's dashboard")
  if (!captainLabelId) {
    const created = await req('/labels', {
      method: 'POST',
      params: { name: "captain's dashboard", color: 'yellow', idBoard: BOARD_ID }
    })
    captainLabelId = created.data?.id || null
  }

  const cards = [
    {
      name: '[SIR GREEN] Second bug hunt: runtime panel failures',
      list: 'To Do',
      desc: 'Re-audit Mission Control panels for runtime 502/500/auth/data errors after previous fixes. Focus: actual API response codes, not route existence.',
      labels: [sirGreenLabel, captainLabelId].filter(Boolean)
    },
    {
      name: '[SIR GREEN] tools.deny + sandbox.mode wiring',
      list: 'To Do',
      desc: 'Implement tools.deny groups and agents.defaults.sandbox.mode="all" in OpenClaw config writer/sync path, not just UI.',
      labels: [sirGreenLabel, captainLabelId].filter(Boolean)
    }
  ]

  for (const card of cards) {
    const listId = card.list === 'To Do' ? TODO_LIST_ID : DONE_LIST_ID
    const res = await req('/cards', {
      method: 'POST',
      params: {
        idList: listId,
        name: card.name,
        desc: card.desc,
        idLabels: card.labels.join(',')
      }
    })
    console.log('Created', res.status, res.data?.id, card.name)
  }
}

main().catch(e => console.error(e))
