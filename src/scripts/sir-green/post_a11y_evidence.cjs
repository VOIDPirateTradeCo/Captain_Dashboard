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
  const cardId = '6a9857138166931ca3a5ece7'
  
  const evidenceText = [
    '**EVIDENCE: Accessibility fix applied (2026-09-03)**',
    '',
    'Fixed in src/components/panels/office-panel.tsx:',
    '',
    '1. Added `aria-busy={loading || isLocalMode}` to the main office layout grid container (line 1647) so screen readers know content is loading',
    '2. Added `aria-hidden="true"` to the loading overlay so it is not announced redundantly',
    '',
    'These changes ensure:',
    '- Screen readers announce loading state for the office panel',
    '- The loading spinner is hidden from assistive technology (decorative only)',
    '- The `aria-busy` attribute on the container signals that content is being updated',
    '',
    'Verified: `grep -n "aria-busy" src/components/panels/office-panel.tsx` returns line 1647.',
  ].join('\n')

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
