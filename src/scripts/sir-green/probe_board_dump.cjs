const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BOARD = '6a595669b8f8f99c93392f4f'

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const qs = '?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
    https.get('https://api.trello.com/1' + path + qs, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { resolve(data) }
      })
    }).on('error', reject)
  })
}

async function main() {
  const [board, lists, labels, cards] = await Promise.all([
    apiGet('/boards/' + BOARD + '?fields=name,url,id'),
    apiGet('/boards/' + BOARD + '/lists?fields=id,name'),
    apiGet('/boards/' + BOARD + '/labels?fields=id,name,color'),
    apiGet('/boards/' + BOARD + '/cards?filter=open&fields=id,name,dateLastActivity,idList,idLabels,comments')
  ])

  console.log('=== BOARD ===')
  console.log(json(board))

  console.log('\n=== LISTS ===')
  console.log(json(lists))

  console.log('\n=== LABELS ===')
  console.log(json(labels))

  console.log('\n=== CARDS (last 5 min) ===')
  const cutoff = Date.now() - 300000
  const recent = cards
    .filter(c => c.dateLastActivity && new Date(c.dateLastActivity).getTime() > cutoff)
    .sort((a, b) => new Date(b.dateLastActivity) - new Date(a.dateLastActivity))
  console.log('recent count:', recent.length)
  for (const c of recent.slice(0, 15)) {
    console.log(json(c))
  }

  console.log('\n=== TOTAL OPEN CARDS ===', cards.length)
}

function json(x) {
  return JSON.stringify(x, null, 2)
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
