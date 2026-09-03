const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'
const BOARD = '6a595669b8f8f99c93392f4f'
const LIST = '6a73abbf4539aaa060199c07'
const LABELS = [
  '6a74dd63452761014e981f23',
  '6a851536d3bdf66aac59cf9c',
  '6a5d497ef3dd03fd20be42fc',
]

const cards = [
  {
    name: '[MESH BUG] Master cannot reach PINKCADY/STEALTHATTACK on port 3000 — TCP timeout from 192.168.0.39',
    desc:
      'Live proof: master TCP probes to 100.106.235.103:3000, 192.168.0.180:3000, 100.110.238.68:3000, 192.168.0.68:3000 all timeout after 5s. PINKCADY can reach master on 192.168.0.39:3100. Root cause is ship-side listener/firewall, not master code. Fix: verify ship MC is listening on 0.0.0.0:3000 and firewall allows inbound from 192.168.0.39.',
  },
  {
    name: '[MESH BUG] miss-pink agent shows status=offline despite successful registration + heartbeat',
    desc:
      'Live proof: /api/agents/register returns 201 for miss-pink, /api/agents/miss-pink/heartbeat returns 200 HEARTBEAT_OK, but /api/agents still shows status=offline. Root cause: database agent status is not updated by heartbeat for manually registered agents. Fix: update agent status derivation or heartbeat writer to mark online after successful heartbeat.',
  },
  {
    name: '[MESH BUG] Fleet connectivity/mesh show false no_response for reachable ships',
    desc:
      'Live proof: /api/fleet/connectivity and /api/fleet/mesh/verify show STEALTHATTACK/PINKCADY as reachable=false with error=no_response. This currently reflects actual network state, but the dashboard should distinguish ship-offline vs master-cannot-probe vs firewall-blocked. Fix: add probe failure categorization and ship-reported status field.',
  },
]

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
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(bodyText) })
        } catch {
          resolve({ status: res.statusCode, data: bodyText })
        }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function createCard(card) {
  const path = `/1/cards?key=${encodeURIComponent(KEY)}&token=${encodeURIComponent(TOKEN)}`
  return request(path, 'POST', {
    name: card.name,
    desc: card.desc,
    idList: LIST,
    idLabels: LABELS,
  })
}

async function main() {
  for (const card of cards) {
    const result = await createCard(card)
    console.log('CARD', result.status, result.data?.id || result.data)
    await new Promise(r => setTimeout(r, 400))
  }
  console.log('DONE', cards.length)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
