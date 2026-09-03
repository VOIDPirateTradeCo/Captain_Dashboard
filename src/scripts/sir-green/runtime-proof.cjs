const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const proofsDir = path.resolve('src/scripts/sir-green/proofs')
const cookiePath = 'C:/Users/kidsm/AppData/Local/Temp/mc-cookies-new.txt'

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') })
      })
    }).on('error', reject)
  })
}

function readCookieValue() {
  const raw = fs.existsSync(cookiePath) ? fs.readFileSync(cookiePath, 'utf8') : ''
  const cookieLine = raw.split(/\r?\n/).find(l => l && !(l.startsWith('#') && !l.startsWith('#HttpOnly_'))) || ''
  const cookieValue = cookieLine.split('\t').pop()?.trim() || ''
  return cookieValue ? `mc-session=${cookieValue}` : ''
}

async function main() {
  const base = 'http://127.0.0.1:3000'
  const health = await request(`${base}/health`)
  fs.mkdirSync(proofsDir, { recursive: true })
  fs.writeFileSync(path.join(proofsDir, 'local-health.json'), health.body)
  console.log('health_status=' + health.status)

  const cookieHeader = readCookieValue()
  if (!cookieHeader) {
    console.log('cookie_missing')
    return
  }

  const loginBody = JSON.stringify({ username: 'captain', password: 'captain' })
  const login = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginBody),
        Cookie: cookieHeader,
      },
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.write(loginBody)
    req.end()
  })
  fs.writeFileSync(path.join(proofsDir, 'login.json'), login.body)
  console.log('login_status=' + login.status)

  const agents = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      path: '/api/agents',
      method: 'GET',
      headers: { Cookie: cookieHeader },
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.end()
  })
  fs.writeFileSync(path.join(proofsDir, 'agents.json'), agents.body)
  console.log('agents_status=' + agents.status)
}

main().catch(e => { console.log('FATAL=' + e.message); process.exit(1) })
