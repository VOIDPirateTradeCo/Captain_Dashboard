const https = require('node:https')
const fs = require('node:fs')
const path = require('node:path')
const proofsDir = path.resolve('src/scripts/sir-green/proofs')
function request(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const headers = { 'Cookie': 'mc-session=efe705c69a708c8001533e64bb1d103311f485ad840dd4825ecfbb1d9865080c', Accept: 'application/json' }
    const req = https.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET', headers, rejectUnauthorized: false }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}
async function main() {
  await fs.promises.mkdir(proofsDir, { recursive: true })
  const endpoints = [
    ['master-health', 'https://127.0.0.1:3100/health'],
    ['auth-status', 'https://127.0.0.1:3100/api/auth/status'],
    ['agents', 'https://127.0.0.1:3100/api/agents'],
    ['connectivity', 'https://127.0.0.1:3100/api/fleet/connectivity'],
    ['resources', 'https://127.0.0.1:3100/api/fleet/resources'],
    ['mesh', 'https://127.0.0.1:3100/api/fleet/mesh/verify'],
    ['hivehealth', 'https://127.0.0.1:3100/api/panels/hivehealth'],
    ['settings', 'https://127.0.0.1:3100/api/settings'],
    ['backup', 'https://127.0.0.1:3100/api/backup']
  ]
  for (const [name, url] of endpoints) {
    try {
      const res = await request(url)
      await fs.promises.writeFile(path.join(proofsDir, name + '.json'), JSON.stringify({ url, status: res.status, body: res.body.slice(0, 4000) }, null, 2))
      console.log('OK ' + name + '=' + res.status)
    } catch (e) {
      await fs.promises.writeFile(path.join(proofsDir, name + '.json'), JSON.stringify({ url, error: e.message }, null, 2))
      console.log('ERR ' + name + '=' + e.message)
    }
  }
  console.log('LIVE_PROOF_OK')
}
main().catch(e => { console.log('LIVE_PROOF_ERR=' + e.message); process.exit(1) })
