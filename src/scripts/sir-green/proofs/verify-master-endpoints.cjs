const https = require('https')
const fs = require('fs')

const cookieFile = 'C:/Users/kidsm/AppData/Local/Temp/mc-cookies-new.txt'
const cookie = fs.readFileSync(cookieFile, 'utf8').split(/\r?\n/).filter(Boolean).find(l => l.startsWith('Cookie:'))?.replace('Cookie:', '').trim() || ''

function get(inputUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(inputUrl)
    const req = https.get({ hostname: u.hostname, port: u.port, path: u.pathname, rejectUnauthorized: false, headers: { Cookie: cookie, Accept: 'application/json' } }, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.status, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    req.setTimeout && req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

;(async () => {
  const targets = [
    'https://192.168.0.39:3100/health',
    'https://192.168.0.39:3100/api/auth/me',
    'https://192.168.0.39:3100/api/agents',
    'https://192.168.0.39:3100/api/fleet/connectivity',
    'https://192.168.0.39:3100/api/fleet/resources',
    'https://192.168.0.39:3100/api/settings',
    'https://192.168.0.39:3100/api/backup',
  ]
  for (const u of targets) {
    try {
      const res = await get(u)
      console.log(`${u}: status=${res.status} body=${res.body.slice(0, 180)}`)
    } catch (e) {
      console.log(`${u}: ERROR=${e && e.message ? e.message : e}`)
    }
  }
})()
