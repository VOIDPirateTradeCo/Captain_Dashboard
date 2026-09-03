const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const qs = '?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
    https.get('https://api.trello.com/1' + path + qs, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        // Don't try to parse - just return raw text and status
        resolve({ raw: data, headers: res.headers })
      })
    }).on('error', reject)
  })
}

async function main() {
  const BOARD = '6a70a3157d0db4214ac3f9a3'
  const qs = '?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)

  console.log('=== BOARD ===')
  const boardRes = await apiGet('/boards/' + BOARD)
  console.log('status check (first 300 chars):', boardRes.raw.substring(0, 300))

  console.log('\n=== LISTS ===')
  const listsRes = await apiGet('/boards/' + BOARD + '/lists?fields=id,name,closed')
  console.log(listsRes.raw.substring(0, 500))

  console.log('\n=== LABELS ===')
  const labelsRes = await apiGet('/boards/' + BOARD + '/labels?fields=id,name,color')
  console.log(labelsRes.raw.substring(0, 300))

  console.log('\n=== CARDS (last 20) ===')
  const cardsRes = await apiGet('/boards/' + BOARD + '/cards?filter=open&fields=id,name,dateLastActivity,idList&cards=open&filter=open')
  console.log(cardsRes.raw.substring(0, 3000))
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
