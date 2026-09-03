const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const evidence = {
  '6a996039c95309540250eb15':
    'LIVE EVIDENCE 2026-09-03 12:06 UTC — TCP from 192.168.0.39 → 100.106.235.103:3000 TIMEOUT 4008ms, 192.168.0.180:3000 TIMEOUT 4011ms. PINKCADY Next.js dev server errors: `Couldn\'t find any pages or app directory`. Agent status: offline. NOT CONNECTED.',
  '6a9960394e67fb9a670d28c4':
    'LIVE EVIDENCE 2026-09-03 12:06 UTC — Master LAN login to 192.168.0.39:3100 returns 200 + cookie OK. Captain password verified. The earlier PINKCADY 401 was from the ship, not master. Master auth is fixed; ship listener is the remaining blocker.',
  '6a99603ab808815c299f0819':
    'LIVE EVIDENCE 2026-09-03 12:06 UTC — STEALTHATTACK `0.0.0.0:3000` LISTENING on ship, TCP from master: 100.110.238.68:3000 OPEN 4ms, 192.168.0.68:3000 TIMEOUT 4008ms. Firewall rule `ALLOW-MC-STEALTHATTACK-3000` confirmed enabled on STEALTHATTACK. LAN still blocked from master.',
  '6a9961d9a539bf0aca1756a2':
    'LIVE EVIDENCE 2026-09-03 12:06 UTC — PINKCADY running `D:\\Work\\Torus Coffee Company LLC\\tmp\\mission-control-fresh` with Next.js 16.3.4, but server fails with `Couldn\'t find any pages or app directory`. Node 15104 running. Port 3000 listener state unconfirmed from master (TCP timeout).',
  '6a990638100597841c3de53b':
    'LIVE EVIDENCE 2026-09-03 12:06 UTC — Master `/api/agents` returns miss-pink with `status: offline`, `last_activity: Heartbeat check`, `runtime_type: null`. Agent registered but never sent heartbeat from ship. No ship-side agent process confirmed.',
  '6a995a4a528b08d2097426fb':
    'STALE — closing. Earlier MESH SUCCESS claim is invalidated by live sweep: PINKCADY TCP timeout from master on both Tailscale and LAN. STEALTHATTACK LAN still blocked. Only verified connectivity: master ↔ STEALTHATTACK Tailscale.',
}

function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.trello.com',
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }
    const req = https.request(options, res => {
      let bodyText = ''
      res.on('data', chunk => (bodyText += chunk))
      res.on('end', () => resolve({ status: res.statusCode, data: bodyText }))
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function comment(cardId, text) {
  const path = '/1/cards/' + cardId + '/actions/comments?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
  return request(path, 'POST', { text })
}

async function closeCard(cardId) {
  const path = '/1/cards/' + cardId + '?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
  return request(path, 'PUT', { closed: true })
}

async function main() {
  for (const [cardId, text] of Object.entries(evidence)) {
    if (text.startsWith('STALE')) {
      const r = await closeCard(cardId)
      console.log('CLOSE', cardId, r.status, r.data && r.data.closed ? 'CLOSED' : r.data)
    } else {
      const r = await comment(cardId, text)
      console.log('COMMENT', cardId, r.status, r.data && r.data.id ? r.data.id : r.data)
    }
    await new Promise(r => setTimeout(r, 350))
  }
  console.log('DONE', Object.keys(evidence).length)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
