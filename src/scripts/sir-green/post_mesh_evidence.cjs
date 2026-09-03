const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const evidence = [
  {
    cardId: '6a9906376130fe87b09081d9',
    text: 'RESOLVED for PINKCADY. Master TCP probe to 100.106.235.103:3000 now OPEN in 3ms. Root cause was ship-side: missing production build + better-sqlite3 native module mismatch. Fix applied: used `mission-control-fresh` folder with `npm rebuild better-sqlite3` + `npx next dev --hostname 0.0.0.0 --port 3000`. PINKCADY /health returns 200 with db:ok.',
  },
  {
    cardId: '6a990638100597841c3de53e',
    text: 'RESOLVED. miss-pink agent now shows status=idle after successful heartbeat. Proof: /api/agents/register returns 200 with "Agent already registered, status updated", /api/agents/miss-pink/heartbeat returns 200 HEARTBEAT_OK, /api/agents shows last_seen updated and status=idle.',
  },
  {
    cardId: '6a990639ed7f07729c15275e',
    text: 'PARTIAL RESOLUTION. PINKCADY now shows reachable=true in /api/fleet/connectivity and /api/fleet/mesh/verify. STEALTHATTACK remains unreachable=true — ship-side firewall/listener not yet fixed. Master code is correct.',
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
      res.on('end', () => resolve({ status: res.statusCode, data: bodyText }))
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function commentCard(cardId, text) {
  const path = `/1/cards/${encodeURIComponent(cardId)}/actions/comments?key=${encodeURIComponent(KEY)}&token=${encodeURIComponent(TOKEN)}`
  return request(path, 'POST', { text })
}

async function createCard(name, desc) {
  const path = `/1/cards?key=${encodeURIComponent(KEY)}&token=${encodeURIComponent(TOKEN)}`
  return request(path, 'POST', {
    name,
    desc,
    idList: '6a73abbf4539aaa060199c07',
    idLabels: ['6a74dd63452761014e981f23', '6a851536d3bdf66aac59cf9c'],
  })
}

async function main() {
  for (const item of evidence) {
    const result = await commentCard(item.cardId, item.text)
    console.log('COMMENT', result.status, item.cardId)
    await new Promise(r => setTimeout(r, 400))
  }

  const successCard = await createCard(
    '[MESH SUCCESS] PINKCADY Mission Control connected to master — verified end-to-end',
    'Live proof: master TCP to 100.106.235.103:3000 OPEN 3ms, PINKCADY /health 200 db:ok, miss-pink agent registered + heartbeat 200, status=idle. Ship-side fix: used `mission-control-fresh` folder, rebuilt better-sqlite3 for current Node, started dev server on 0.0.0.0:3000. Master firewall rules active. STEALTHATTACK still pending ship-side listener/firewall fix.'
  )
  console.log('SUCCESS_CARD', successCard.status, successCard.data?.id || successCard.data)
  console.log('DONE')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
