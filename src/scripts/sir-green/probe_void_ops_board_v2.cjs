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
  console.log('=== BOARD CHECK ===')
  try {
    const board = await apiGet('/boards/' + BOARD + '?fields=name,url,id')
    console.log('name:', board.name)
    console.log('url:', board.url)
    console.log('id:', board.id)
  } catch (e) {
    console.log('Board check failed:', e.message)
  }

  console.log('\n=== LISTS ===')
  try {
    const lists = await apiGet('/boards/' + BOARD + '/lists?fields=id,name')
    console.log('Count:', lists.length)
    for (const l of lists) {
      console.log(l.id, '|', l.name)
    }
  } catch (e) {
    console.log('Lists check failed:', e.message)
  }

  console.log('\n=== LABELS ===')
  try {
    const labels = await apiGet('/boards/' + BOARD + '/labels?fields=id,name,color')
    console.log('Count:', labels.length)
    for (const l of labels) {
      console.log(l.id, '|', l.name, '|', l.color)
    }
  } catch (e) {
    console.log('Labels check failed:', e.message)
  }

  console.log('\n=== CARDS (last 5 min activity) ===')
  try {
    const cards = await apiGet('/boards/' + BOARD + '/cards?filter=open&fields=id,name,dateLastActivity,idList,idLabels')
    console.log('Count:', cards.length)
    const recent = cards
      .filter(c => c.dateLastActivity && new Date(c.dateLastActivity) > new Date(Date.now() - 300000))
      .sort((a, b) => new Date(b.dateLastActivity) - new Date(a.dateLastActivity))
    console.log('Recent (last 5 min):', recent.length)
    for (const c of recent.slice(0, 15)) {
      const labelNames = (c.idLabels || [])
        .map(id => labels.find(l => l.id === id)?.name || id)
        .join(', ')
      console.log(c.id, '|', (c.dateLastActivity ? new Date(c.dateLastActivity).toISOString() : 'no-date'), '|', labelNames, '|', c.name.substring(0, 100))
    }
  } catch (e) {
    console.log('Cards check failed:', e.message)
  }
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
