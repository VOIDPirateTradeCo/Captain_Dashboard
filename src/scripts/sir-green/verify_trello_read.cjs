const https = require('https')
const fs = require('fs')
const path = require('path')

const vaultPath = path.resolve('C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/_Hub/_KEY_VAULT/archive/secrets.env.stale_aug4')

function loadSecrets() {
  const raw = fs.readFileSync(vaultPath, 'utf8')
  const lines = raw.split(/\r?\n/)
  const key = lines.find(l => l.startsWith('TRELLO_KEY=')).split('=')[1].trim()
  const token = lines.find(l => l.startsWith('TRELLO_TOKEN=')).split('=')[1].trim()
  return { key, token }
}

function get(requestPath) {
  const { key, token } = loadSecrets()
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.trello.com',
      path: `${requestPath}?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null })
        } else {
          reject(new Error(`Trello ${res.statusCode}: ${text.slice(0, 500)}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  const board = await get('/1/members/me/boards?fields=id,name,url')
  console.log('boards_status=', JSON.stringify(board).slice(0, 400))
  const target = Array.isArray(board.body) ? board.body.find(b => /VOID Ops/i.test(b.name)) : null
  if (!target) {
    console.log('NO_VOID_OPS_BOARD')
    return
  }
  const lists = await get(`/1/boards/${target.id}/lists?fields=id,name,pos&cards=open`)
  console.log('lists_status=', JSON.stringify(lists).slice(0, 800))
}

main().catch(e => { console.log('FATAL=' + e.message); process.exit(1) })
