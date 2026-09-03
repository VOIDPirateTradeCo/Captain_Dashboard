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
        try { resolve(JSON.parse(data)) } catch { resolve(data) }
      })
    }).on('error', reject)
  })
}

async function main() {
  const BOARD = '6a70a3157d0db4214ac3f9a3'

  // Fetch boards, lists, labels, and cards in parallel
  const [board, lists, labels, cards] = await Promise.all([
    apiGet('/boards/' + BOARD + '?fields=name,url,id'),
    apiGet('/boards/' + BOARD + '/lists?fields=id,name,closed'),
    apiGet('/boards/' + BOARD + '/labels?fields=id,name,color'),
    apiGet('/boards/' + BOARD + '/cards?filter=open&fields=id,name,dateLastActivity,idList,idLabels,due,comments&cards=open&filter=open')
  ])

  console.log('=== TORUS OPS BOARD ===')
  console.log('name:', board.name)
  console.log('url:', board.url)
  console.log('id:', board.id)
  console.log('')

  console.log('=== LISTS ===')
  const labelMap = new Map()
  for (const l of labels) labelMap.set(l.id, l.name)
  for (const l of lists) {
    const cardCount = cards.filter(c => c.idList === l.id).length
    console.log('[' + (l.closed ? 'CLOSED' : 'OPEN') + '] ' + l.id + ' | ' + l.name + ' | ' + cardCount + ' cards')
  }
  console.log('')

  console.log('=== LABELS ===')
  for (const l of labels) {
    console.log(l.id + ' | ' + l.name + ' | ' + l.color)
  }
  console.log('')

  console.log('=== OPEN CARDS (sorted by last activity) ===')
  console.log('Total:', cards.length)
  const sorted = [...cards].sort((a, b) => {
    const da = a.dateLastActivity ? new Date(a.dateLastActivity).getTime() : 0
    const db = b.dateLastActivity ? new Date(b.dateLastActivity).getTime() : 0
    return db - da
  })

  // Group by list
  const byList = new Map()
  for (const c of sorted) {
    const listName = (lists.find(l => l.id === c.idList) || {}).name || 'UNKNOWN'
    if (!byList.has(listName)) byList.set(listName, [])
    byList.get(listName).push(c)
  }

  for (const [listName, listCards] of byList) {
    console.log('\n--- LIST: ' + listName + ' (' + listCards.length + ' cards) ---')
    for (const c of listCards) {
      const labelNames = (c.idLabels || [])
        .map(id => labelMap.get(id) || id)
        .join(', ')
      const due = c.due ? 'DUE:' + new Date(c.due).toISOString().slice(0, 10) : ''
      console.log('  ' + c.id + ' | ' + c.dateLastActivity.slice(0, 19).replace('T', ' '))
      console.log('    LABELS: ' + labelNames + (due ? ' | ' + due : ''))
      console.log('    TITLE: ' + c.name.substring(0, 120))
      console.log('')
    }
  }
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
