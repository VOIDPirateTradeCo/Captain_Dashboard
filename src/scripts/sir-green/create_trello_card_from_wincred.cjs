import http from 'node:http'
import https from 'node:https'
import win32cred from 'win32cred'

function cred(target) {
  const c = win32cred.CredRead(target, 1)
  return c.CredentialBlob.toString('utf16le').replace(/\0+$/u, '')
}

const key = cred('TRELLO_KEY@VOID_Pirate_Secrets')
const token = cred('TRELLO_TOKEN@VOID_Pirate_Secrets')
const boardId = '6a595669b8f8f99c93392f4f'

const payload = JSON.stringify({
  name: 'PS4 → Omarchy Linux AI crew nodes — research card',
  desc: 'Investigate wiping 2 PS4s and loading Omarchy Linux AI OS to use their GPUs for tr3asure mAp software + a dedicated LLM node. Do not modify tr3asure map cards; this is a future-idea research card.',
  idList: null,
  idLabels: []
})

function trelloReq(path, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL('https://api.trello.com' + path)
    u.searchParams.set('key', key)
    u.searchParams.set('token', token)
    const data = body || ''
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }}, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }))
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

(async () => {
  // find Sir Green's Inbox list
  const boards = await trelloReq('/1/members/me/boards?fields=id,name,url', 'GET')
  console.log('boards_status=' + boards.status)
  const board = JSON.parse(boards.body).find(b => b.id === boardId)
  if (!board) { console.log('BOARD_NOT_FOUND'); process.exit(1) }
  console.log('board_name=' + board.name)

  const lists = await trelloReq('/1/boards/' + boardId + '/lists?fields=id,name,pos', 'GET')
  const inbox = JSON.parse(lists.body).find(l => l.name === "Sir Green's Inbox")
  if (!inbox) { console.log('INBOX_LIST_NOT_FOUND'); process.exit(1) }
  console.log('list_name=' + inbox.name)

  const labels = await trelloReq('/1/boards/' + boardId + '/labels?fields=id,name,color', 'GET')
  const allLabels = JSON.parse(labels.body)
  const pick = (name) => allLabels.find(l => l.name.toLowerCase() === name.toLowerCase())
  const sirGreen = pick('sir-green')
  const sirCobalt = pick('sir-cobalt')
  const captains = pick("captain's dashboard")
  console.log('label_sir_green=' + (sirGreen ? sirGreen.id : 'MISSING'))
  console.log('label_sir_cobalt=' + (sirCobalt ? sirCobalt.id : 'MISSING'))
  console.log('label_captains=' + (captains ? captains.id : 'MISSING'))

  const cardPayload = JSON.stringify({
    name: 'PS4 → Omarchy Linux AI crew nodes — research card',
    desc: 'Investigate wiping 2 PS4s and loading Omarchy Linux AI OS to use their GPUs for tr3asure mAp software + a dedicated LLM node.',
    idList: inbox.id,
    idLabels: [sirGreen.id, sirCobalt.id, captains.id].filter(Boolean)
  })

  const res = await trelloReq('/1/cards', 'POST', cardPayload)
  console.log('card_status=' + res.status)
  console.log('card_body=' + res.body.slice(0, 400))
})().catch(e => console.log('ERR=' + e.message))
