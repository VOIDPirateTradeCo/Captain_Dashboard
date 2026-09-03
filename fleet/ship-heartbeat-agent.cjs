const https = require('https')
const http = require('http')

const MASTER = process.env.MC_MASTER || 'http://192.168.0.39:3100'
const SHIP = process.env.MC_SHIP || 'pinkcady'
const INTERVAL = Number(process.env.MC_HEARTBEAT_INTERVAL || 300000)
const MC_API_KEY = process.env.MC_API_KEY || ''

function request(url, opts, body) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.request(url, opts, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({ status: res.statusCode, data }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function heartbeat() {
  try {
    let sessionCookie = ''
    if (MC_API_KEY) {
      const regBody = JSON.stringify({ framework: 'generic', action: 'register', payload: { agentId: SHIP, name: SHIP, metadata: { host: SHIP, capabilities: ['ops'] } } })
      const regRes = await request(`${MASTER}/api/adapters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': MC_API_KEY,
          'X-Agent-Name': SHIP,
          'Content-Length': Buffer.byteLength(regBody),
        },
        timeout: 5000,
      }, regBody)
      console.log(new Date().toISOString(), 'REGISTER', regRes.status, regRes.data.slice(0, 120))
    }

    const hbBody = JSON.stringify({ framework: 'generic', action: 'heartbeat', payload: { agentId: SHIP, status: 'online' } })
    const hbRes = await request(`${MASTER}/api/adapters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(MC_API_KEY ? { 'x-api-key': MC_API_KEY } : {}),
        'X-Agent-Name': SHIP,
        'Content-Length': Buffer.byteLength(hbBody),
      },
      timeout: 5000,
    }, hbBody)

    console.log(new Date().toISOString(), 'HEARTBEAT', hbRes.status, hbRes.data.slice(0, 120))
  } catch (e) {
    console.error(new Date().toISOString(), 'HEARTBEAT_ERR', e.message)
  }
}

async function loop() {
  await heartbeat()
  setInterval(heartbeat, INTERVAL)
}

loop().catch(e => {
  console.error(e)
  process.exit(1)
})
