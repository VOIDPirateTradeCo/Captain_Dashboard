const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

async function request(path, method, body) {
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

async function main() {
  const card = await request(
    `/1/cards?key=${encodeURIComponent(KEY)}&token=${encodeURIComponent(TOKEN)}`,
    'POST',
    {
      name: '[MESH BLOCKER] STEALTHATTACK still unreachable from master after firewall rules applied',
      desc:
        'Live proof: master TCP probes to 100.110.238.68:3000 and 192.168.0.68:3000 still timeout after 5s. PINKCADY is OPEN. SQUIDSTATION is healthy. Firewall rules TEMP-ALLOW-FLEET-ALL applied on STEALTHATTACK but no change. Next step: ship-side diagnostics on STEALTHATTACK to verify MC listener, port, and local firewall state. Card for Sir Azure.',
      idList: '6a73abbf4539aaa060199c07',
      idLabels: ['6a74dd63452761014e981f23', '6a851536d3bdf66aac59cf9c'],
    }
  )
  console.log('CARD', card.status, card.data?.id || card.data)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
