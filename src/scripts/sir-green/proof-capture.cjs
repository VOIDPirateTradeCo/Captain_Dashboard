const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const cookiePath = 'C:/Users/kidsm/AppData/Local/Temp/mc-cookies-new.txt'
const proofsDir = path.resolve('src/scripts/sir-green/proofs')

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: opts.method || 'GET', headers: opts.headers || {} }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  await fs.promises.mkdir(proofsDir, { recursive: true })

  const cookie = await fs.promises.readFile(cookiePath, 'utf8').catch(() => '')
  const cookieHeader = cookie ? cookie.split(/\r?\n/).find(l => l && !l.startsWith('#')) || '' : ''
  const headers = cookieHeader ? { Cookie: cookieHeader } : {}

  const health = await request('http://127.0.0.1:3000/health', { headers })
  await fs.promises.writeFile(path.join(proofsDir, 'local-health.json'), JSON.stringify({ status: health.status, body: health.body }, null, 2))

  const login = await request('http://127.0.0.1:3000/api/auth/me', { headers })
  await fs.promises.writeFile(path.join(proofsDir, 'login.json'), JSON.stringify({ status: login.status, body: login.body }, null, 2))

  const agents = await request('http://127.0.0.1:3000/api/agents', { headers })
  await fs.promises.writeFile(path.join(proofsDir, 'agents.json'), JSON.stringify({ status: agents.status, body: agents.body }, null, 2))

  const tokens = await request('http://127.0.0.1:3000/api/tokens', { headers })
  await fs.promises.writeFile(path.join(proofsDir, 'tokens.json'), JSON.stringify({ status: tokens.status, body: tokens.body }, null, 2))

  const models = await request('http://127.0.0.1:3000/api/status?action=models', { headers })
  await fs.promises.writeFile(path.join(proofsDir, 'models.json'), JSON.stringify({ status: models.status, body: models.body }, null, 2))

  console.log('PROOF_CAPTURE_OK')
}

main().catch(e => { console.log('PROOF_CAPTURE_ERR=' + e.message); process.exit(1) })
