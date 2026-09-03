const https = require('https')
const fs = require('fs')
const path = require('path')

const cookieFile = 'C:/Users/kidsm/AppData/Local/Temp/mc-cookies-new.txt'

function saveCookie(setCookie) {
  const parts = (setCookie || [])
    .map(c => c.split(';')[0].trim())
    .filter(Boolean)
  if (parts.length) fs.writeFileSync(cookieFile, parts.join('; ') + '\n', 'utf8')
}

function loadCookie() {
  try {
    const line = fs.readFileSync(cookieFile, 'utf8').split(/\r?\n/).filter(Boolean)[0] || ''
    return line
  } catch { return '' }
}

function request(opts) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        resolve({ status: res.status, body, setCookie: res.headers['set-cookie'] || [] })
      })
    })
    req.on('error', reject)
    req.setTimeout && req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

;(async () => {
  const postData = JSON.stringify({ username: 'captain', password: 'captain' })
  const loginRes = await request({ hostname: '192.168.0.39', port: 3100, path: '/api/auth/login', method: 'POST', rejectUnauthorized: false, headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Content-Length': Buffer.byteLength(postData) } })
  saveCookie(loginRes.setCookie)
  console.log('login_status=', loginRes.status, 'body=', loginRes.body.slice(0, 200))

  const cookie = loadCookie()
  console.log('cookie_set=', !!cookie)

  const targets = [
    'https://192.168.0.39:3100/api/auth/me',
    'https://192.168.0.39:3100/api/agents',
    'https://192.168.0.39:3100/api/fleet/connectivity',
    'https://192.168.0.39:3100/api/fleet/resources',
    'https://192.168.0.39:3100/api/settings',
    'https://192.168.0.39:3100/api/backup',
  ]
  for (const u of targets) {
    try {
      const url = new URL(u)
      const res = await request({ hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET', rejectUnauthorized: false, headers: { Cookie: cookie, Accept: 'application/json' } })
      console.log(`${u}: status=${res.status} body=${res.body.slice(0, 220)}`)
    } catch (e) {
      console.log(`${u}: ERROR=${e && e.message ? e.message : e}`)
    }
  }
})()
