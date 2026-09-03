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
  // Post evidence to "GAP: mission-control has no /api/fleet route" card
  const cardId = '6a98a0a20412e0d387dc84ae'
  
  const evidenceText = `**EVIDENCE: /api/fleet routes DO exist (2026-09-03)**

Tested with Sir Green admin session cookie:

\`\`\`
/api/fleet             -> 200 HTML (this is the web UI, not JSON)
/api/fleet/resources   -> 200 JSON (1582 bytes) ✅ WORKS
/api/fleet/connectivity -> 200 JSON (332 bytes) ✅ WORKS
/api/health            -> 200 JSON (57 bytes) ✅ WORKS
\`\`\`

The card title says "no /api/fleet route" but the API routes are working. The issue was likely that:
1. /api/fleet returns HTML (Next.js page), not JSON — this is correct behavior
2. The actual JSON API is at /api/fleet/resources, /api/fleet/connectivity, etc.
3. Auth requires session cookie (not x-api-key for these routes)

To use fleet data in frontend, import apiFetch from '@/lib/api-client' which handles session cookies automatically.`

  console.log('Posting evidence to card', cardId, '...')
  const result = await post('/cards/' + cardId + '/actions/comments', { text: evidenceText })
  console.log('STATUS:', result.status)
  if (result.status >= 400) {
    console.log('RESPONSE:', JSON.stringify(result.data).substring(0, 300))
  } else {
    console.log('OK, comment id:', result.data.id)
  }
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
