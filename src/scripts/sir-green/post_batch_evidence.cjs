const https = require('https')
const { URL } = require('url')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(BASE + path)
    u.searchParams.set('key', KEY)
    u.searchParams.set('token', TOKEN)
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
  // Post evidence: ErrorBoundary already exists
  const errorBoundaryCardId = '6a983ef5d10bd8b87ece316b'
  const errorBoundaryText = [
    '**EVIDENCE: ErrorBoundary already exists (2026-09-03)**',
    '',
    'The main dashboard page (src/app/[[...panel]]/page.tsx) already has ErrorBoundary at line 481:',
    '',
    '```tsx',
    '<ErrorBoundary key={activeTab}>',
    '  <ContentRouter tab={activeTab} />',
    '</ErrorBoundary>',
    '```',
    '',
    'This wraps all tab content (including OfficePanel, CaptainOfficePanel, VoidHiveHealthPanel).',
    '',
    'Verified: `grep -n "ErrorBoundary" src/app/[[...panel]]/page.tsx` returns lines 55, 481, 483.',
    '',
    'The ErrorBoundary component is at src/components/ErrorBoundary.tsx with full retry UI.'
  ].join('\n')

  console.log('1. Posting ErrorBoundary evidence...')
  const r1 = await post('/cards/' + errorBoundaryCardId + '/actions/comments', { text: errorBoundaryText })
  console.log('   STATUS:', r1.status, r1.status === 200 ? 'OK' : JSON.stringify(r1.data).substring(0, 200))

  // Post evidence: offline mode / cached data
  const offlineModeCardId = '6a98f62880a330ba05ce9a53'
  const offlineModeText = [
    '**EVIDENCE: Partial offline/cached data support (2026-09-03)**',
    '',
    'OfficePanel already has an "office degraded" fallback UI (office-panel.tsx:1568-1594) that shows empty office layout when crew data fails to load.',
    '',
    'apiFetch (src/lib/api-client.ts) handles network errors with ApiError code=NETWORK_ERROR but does not cache responses for offline reuse.',
    '',
    'The previous "no offline mode" card predates these partial fixes. The remaining gap is:',
    '- No response caching for /api/fleet/resources, /api/fleet/connectivity',
    '- No service-worker or localStorage cache for panel data',
    '',
    'Status: Partially addressed. Full offline mode would require a service worker implementation.'
  ].join('\n')

  console.log('2. Posting offline mode evidence...')
  const r2 = await post('/cards/' + offlineModeCardId + '/actions/comments', { text: offlineModeText })
  console.log('   STATUS:', r2.status, r2.status === 200 ? 'OK' : JSON.stringify(r2.data).substring(0, 200))
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
