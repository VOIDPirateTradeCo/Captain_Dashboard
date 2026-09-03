const https = require('https')
const { URL } = require('url')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

function trelloUrl(path, extraParams = {}) {
  const u = new URL(BASE + path)
  u.searchParams.set('key', KEY)
  u.searchParams.set('token', TOKEN)
  for (const [k, v] of Object.entries(extraParams)) {
    u.searchParams.set(k, v)
  }
  return u.toString()
}

function get(path, extraParams = {}) {
  return new Promise((resolve, reject) => {
    https.get(trelloUrl(path, extraParams), res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try { resolve(JSON.parse(text)) } catch (e) { resolve({ _raw: text, _status: res.statusCode }) }
      })
    }).on('error', reject)
  })
}

async function main() {
  const BOARD = '6a70a3157d0db4214ac3f9a3'

  const [board, lists, labels, cards] = await Promise.all([
    get('/boards/' + BOARD),
    get('/boards/' + BOARD + '/lists', { fields: 'id,name,closed' }),
    get('/boards/' + BOARD + '/labels', { fields: 'id,name,color' }),
    get('/boards/' + BOARD + '/cards', { filter: 'open', fields: 'id,name,dateLastActivity,idList,idLabels,due' })
  ])

  console.log('=== TORUS OPS BOARD ===')
  console.log('name:', board.name)
  console.log('url:', board.url)
  console.log('')

  const labelMap = new Map()
  for (const l of labels) labelMap.set(l.id, l.name)

  const openCards = cards.filter(c => !c.closed)
  console.log('=== OPEN CARDS BY LIST ===')
  console.log('Total open:', openCards.length)
  console.log('')

  const listsMap = new Map(lists.map(l => [l.id, l]))
  const byList = new Map()
  for (const c of openCards) {
    const l = listsMap.get(c.idList) || { name: 'UNKNOWN_LIST' }
    if (!byList.has(l.name)) byList.set(l.name, [])
    byList.get(l.name).push(c)
  }

  for (const [listName, listCards] of byList) {
    console.log('--- ' + listName + ' (' + listCards.length + ') ---')
    for (const c of listCards.sort((a, b) => {
      const ta = a.dateLastActivity ? new Date(a.dateLastActivity).getTime() : 0
      const tb = b.dateLastActivity ? new Date(b.dateLastActivity).getTime() : 0
      return tb - ta
    })) {
      const labelNames = (c.idLabels || []).map(id => labelMap.get(id) || id).join(', ') || 'none'
      const dueStr = c.due ? ' DUE:' + new Date(c.due).toISOString().slice(0, 10) : ''
      const activity = c.dateLastActivity ? new Date(c.dateLastActivity).toISOString().slice(0, 19).replace('T', ' ') : 'never'
      console.log('  ' + c.id + ' | ' + activity + dueStr)
      console.log('    LABELS: ' + labelNames)
      console.log('    ' + c.name.substring(0, 150))
      console.log('')
    }
  }
}

main().catch(e => {
  console.error('FATAL:', e.message)
  console.error(e.stack)
  process.exit(1)
})
