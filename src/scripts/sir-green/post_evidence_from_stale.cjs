const fs = require('fs')
const path = require('path')
const https = require('https')
const { URL } = require('url')

const stalePath = path.resolve('C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/_Hub/_KEY_VAULT/archive/secrets.env.stale_aug4')
const evidencePath = path.resolve('C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/mission-control/src/scripts/sir-green/pending_trello_evidence.json')

const secrets = fs.readFileSync(stalePath, 'utf8')
const lines = secrets.split(/\r?\n/)
const key = lines.find(l => l.startsWith('TRELLO_KEY=')).split('=')[1].trim()
const token = lines.find(l => l.startsWith('TRELLO_TOKEN=')).split('=')[1].trim()

const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))

function postComment(cardId, text) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({ text })
    const req = https.request({
      hostname: 'api.trello.com',
      path: `/1/cards/${encodeURIComponent(cardId)}/actions/comments?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let d = ''
      res.on('data', c => { d += c })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: d.slice(0, 200) })
        } else {
          reject(new Error(`Trello ${res.statusCode}: ${d.slice(0, 500)}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body.toString())
    req.end()
  })
}

async function main() {
  let failures = 0
  for (const card of evidence.cards) {
    try {
      const result = await postComment(card.id, card.evidence)
      console.log(`POSTED card=${card.id} status=${result.statusCode}`)
    } catch (e) {
      failures++
      console.log(`FAILED card=${card.id} err=${e.message}`)
    }
    await new Promise(r => setTimeout(r, 30000))
  }
  console.log(`DONE failures=${failures} total=${evidence.cards.length}`)
}

main().catch(e => { console.log('FATAL=' + e.message); process.exit(1) })
