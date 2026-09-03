const fs = require('fs')
const http = require('http')
const https = require('https')
const url = require('url')

const cookieFile = 'C:/Users/kidsm/AppData/Local/Temp/mc-cookies-new.txt'
const cookie = fs.readFileSync(cookieFile, 'utf8').split(/\r?\n/).filter(Boolean).find(l => l.startsWith('Cookie:'))?.replace('Cookie:', '').trim() || ''

function get(inputUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(inputUrl)
    const mod = u.protocol === 'https:' ? https : http
    const opts = url.parse(u.toString())
    opts.headers = { Cookie: cookie, Accept: 'application/json' }
    const req = mod.get(opts, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve({ status: res.status, body: Buffer.concat(chunks).toString() }))
    })
    req.on('error', reject)
    req.setTimeout && req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

;(async () => {
  const targets = [
    'http://localhost:3000/office',
    'http://localhost:3000/hive',
    'http://localhost:3000/api/void-proxy/monitor',
    'http://localhost:3000/api/void-proxy/connectivity',
    'http://localhost:3000/api/settings',
  ]
  for (const u of targets) {
    try {
      const res = await get(u)
      console.log(`${u}: status=${res.status} body=${res.body.slice(0, 200)}`)
    } catch (e) {
      console.log(`${u}: ERROR=${e.message}`)
    }
  }
})()
