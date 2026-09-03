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
  console.log('=== BOARD', BOARD, '===')
  const board = await apiGet('/boards/' + BOARD + '?fields=name,url')
  console.log('name:', board.name)
  console.log('url:', board.url)

  console.log('\n=== LISTS ===')
  const lists = await apiGet('/boards/' + BOARD + '/lists?fields=id,name')
  for (const l of lists) {
    console.log(l.id, '|', l.name)
  }

  console.log('\n=== LABELS ===')
  const labels = await apiGet('/boards/' + BOARD + '/labels?fields=id,name,color')
  for (const l of labels) {
    console.log(l.id, '|', l.name, '|', l.color)
  }

  console.log('\n=== CARDS (Mesh-related, last 5 min) ===')
  const cards = await apiGet('/boards/' + BOARD + '/cards?filter=open&fields=id,name,dateLastActivity,idList,idLabels&cards=open')
  const recent = cards
    .filter(c => c.dateLastActivity && new Date(c.dateLastActivity) > new Date(Date.now() - 300000))
    .sort((a, b) => new Date(b.dateLastActivity) - new Date(a.dateLastActivity))
  for (const c of recent.slice(0, 10)) {
    console.log(c.id, '|', c.name.substring(0, 90))
  }
  console.log('\nTotal open cards on board:', cards.length)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
