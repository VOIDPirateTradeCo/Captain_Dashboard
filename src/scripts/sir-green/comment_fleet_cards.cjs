const fs = require('fs')
const path = require('path')
const https = require('https')

const SECRETS_PATH = path.join('C:', 'Users', 'kidsm', 'Documents', 'My Docs', 'VOID Pirate Trading Co', 'Obsidian_Vault', '03_Business_Operations', '_Hub', '_KEY_VAULT', 'secrets.env')

function loadSecrets() {
  const text = fs.readFileSync(SECRETS_PATH, 'utf8')
  const vars = Object.create(null)
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    vars[match[1]] = match[2].replace(/^['\"]|['\"]$/g, '')
  }
  return vars
}

function request(input) {
  const secrets = loadSecrets()
  const key = secrets.TRELLO_KEY
  const token = secrets.TRELLO_TOKEN
  if (!key || !token) throw new Error('Missing TRELLO_KEY or TRELLO_TOKEN in secrets.env')

  const url = new URL('https://api.trello.com/1' + input.split('?')[0])
  url.searchParams.set('key', key)
  url.searchParams.set('token', token)

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'GET' }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.end()
  })
}

function post(input, body) {
  const secrets = loadSecrets()
  const key = secrets.TRELLO_KEY
  const token = secrets.TRELLO_TOKEN
  if (!key || !token) throw new Error('Missing TRELLO_KEY or TRELLO_TOKEN in secrets.env')

  const url = new URL('https://api.trello.com/1' + input.split('?')[0])
  url.searchParams.set('key', key)
  url.searchParams.set('token', token)

  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

const EVIDENCE = {
  masterHealth: 'https://192.168.0.39:3100/health → {"status":"ok","db":"ok"}',
  localHealth: 'http://192.168.0.39:3000/health → 200',
  stealtAttack: 'STEALTHATTACK 192.168.0.68:3000 TCP closed from SQUIDSTATION',
  pinkcady: 'PINKCADY 192.168.0.3:3000 TCP closed from SQUIDSTATION',
  commit: 'Local commit 4ce51d6 on branch void: fleet probe routes, backup fallback, office/hive fixes',
  cards: '10 fleet bug-hunt cards created on VOID Ops board with sir-green + captain\'s dashboard labels',
}

const CARD_COMMENTS = {
  '6a9827b916f920b04431af2d': `Fleet MC port conflict audit — verified: master 3100 healthy, local 3000 healthy, ship 3000 ports unreachable from SQUIDSTATION.`,
  '6a9827ba172cca33b8c73e10': `STEALTHATTACK scoped data feed — bug confirmed: 192.168.0.68:3000 unreachable from master.`,
  '6a9827ba36ffb816ba74fc97': `PINKCADY scoped data feed — bug confirmed: 192.168.0.3:3000 unreachable from master.`,
  '6a9827bb2c16e266d04d370d': `Master reverse proxy — master 3100 healthy, but fleet upstreams missing.`,
  '6a9827bb7bf73f715bbe7d2f': `Hive health gaps — /api/fleet/connectivity/resources still need live merge verification.`,
  '6a9827bb20fec884a0a2a7eb': `Backup replication — code added; SMB unreachable from SQUIDSTATION.`,
  '6a9827bccd54b32f44f0a941': `/office page — /office returns 200 with session; dev path OK, proxy path needs recheck.`,
  '6a9827bc598e9c52323e9733': `Token budget — task-dispatch.ts cascade unchanged in this pass.`,
  '6a9827bd58469c23d7def732': `OpenClaw security — hardened local ACL; fleet push blocked by LAN/repo access.`,
  '6a9827bd4eae66e0387a2ab1': `Scope isolation — not yet implemented; needs middleware.`,
}

async function main() {
  for (const [cardId, text] of Object.entries(CARD_COMMENTS)) {
    const res = await post(`/cards/${cardId}/actions/comments`, { text })
    if (res.status >= 400) {
      console.error('Failed', cardId, res.status, res.body)
    } else {
      console.log('Commented', cardId)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
