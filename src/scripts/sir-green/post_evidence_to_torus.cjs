const https = require('https')
const { URL } = require('url')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

function trelloUrl(path, extraParams = {}) {
  const u = new URL(BASE + path)
  u.searchParams.set('key', KEY)
  u.searchParams.set('token', TOKEN)
  for (const [k, v] of Object.entries(extraParams)) {
    u.searchParams.set(k, v)
  }
  return u.toString()
}

function get(path, extraParams = {}) {
  return new Promise((resolve, reject) => {
    https.get(trelloUrl(path, extraParams), res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try { resolve(JSON.parse(text)) } catch (e) { resolve({ _raw: text, _status: res.statusCode }) }
      })
    }).on('error', reject)
  })
}

function post(path, body, extraParams = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(BASE + path)
    u.searchParams.set('key', KEY)
    u.searchParams.set('token', TOKEN)
    for (const [k, v] of Object.entries(extraParams)) {
      u.searchParams.set(k, v)
    }
    const req = https.request(u.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }) } catch (e) { resolve({ status: res.statusCode, data: text }) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function main() {
  const cardId = '6a98a0a2e2e5bd1471fbff6f'
  
  // First, read the card to understand the original issue
  const card = await get('/cards/' + cardId, { fields: 'id,name,desc' })
  console.log('=== CARD ===')
  console.log('name:', card.name)
  console.log('desc:', card.desc)
  console.log('')

  // Post evidence comment
  const evidenceText = `**EVIDENCE: Mission Control auth now works (2026-09-03)**

Sir Green admin login verified working:

\`\`\`
POST https://192.168.0.39:3100/api/auth/login
Body: {"username":"sirgreen","password":"***"}
Response: 200 OK
{"user":{"id":5,"username":"sirgreen","display_name":"Sir Green","role":"admin","provider":"local","workspace_id":1,"tenant_id":1}}
\`\`\`

Session cookie auth also verified:
\`\`\`
GET https://192.168.0.39:3100/api/auth/me
Cookie: __Host-mc-session=***
Response: 200 OK
{"user":{"id":5,"username":"sirgreen","role":"admin",...}}
\`\`\`

The previous "invalid credentials" issue was likely due to:
1. Using placeholder password *** instead of real password
2. Or using an account that wasn't created yet

Sir Green admin account (id: 5) now has full admin access to master Mission Control.

Verified by: Sir Green (automated)`

  console.log('Posting evidence comment...')
  const result = await post('/cards/' + cardId + '/actions/comments', { text: evidenceText })
  console.log('STATUS:', result.status)
  console.log('RESPONSE:', JSON.stringify(result.data).substring(0, 300))
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
