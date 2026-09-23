#!/usr/bin/env node
/**
 * Phase A (v3): Export Trello to JSON.
 * Bulk endpoints fail with 400s on this board, so we fetch per-card
 * but in parallel batches of 10 with rate limiting.
 */
const path = require('path')
const fs = require('fs')

const BOARD_ID = '6a595669b8f8f99c93392f4f'
const OUT_DIR = path.join(__dirname, '..', 'tmp', 'trello-export')
const CREDS = (() => {
  const lines = fs.readFileSync('C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Obsidian_Vault/03_Business_Operations/_Hub/_KEY_VAULT/secrets.env', 'utf-8').split(/\r?\n/)
  return {
    key: (lines.find(l => l.startsWith('TRELLO_KEY=')) || '').split('=')[1],
    token: (lines.find(l => l.startsWith('TRELLO_TOKEN=')) || '').split('=')[1]
  }
})()

async function fetchJson(url) {
  const sep = url.includes('?') ? '&' : '?'
  const resp = await fetch(`${url}${sep}key=${CREDS.key}&token=${CREDS.token}`)
  if (!resp.ok) throw new Error(`${resp.status}: ${url}`)
  return resp.json()
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try { return await fetchJson(url) }
    catch (e) { if (i === retries - 1) throw e; await new Promise(r => setTimeout(r, 1000)) }
  }
}

async function processBatch(cards, fn) {
  return Promise.all(cards.map(async c => ({ id: c.id, result: await fn(c) })))
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  console.log('1. Lists...')
  const lists = await fetchWithRetry(`https://api.trello.com/1/boards/${BOARD_ID}/lists?fields=id,name,closed`)
  fs.writeFileSync(path.join(OUT_DIR, 'lists.json'), JSON.stringify(lists))

  console.log('2. Cards...')
  const cards = await fetchWithRetry(`https://api.trello.com/1/boards/${BOARD_ID}/cards?fields=id,idShort,name,desc,closed,due,dateLastActivity,idList,labels,shortUrl,url&limit=1000`)
  fs.writeFileSync(path.join(OUT_DIR, 'cards.json'), JSON.stringify(cards))

  const openCards = cards.filter(c => !c.closed)
  console.log(`   ${openCards.length} open cards`)

  // 3. Comments + checklists in batches of 10
  const comments = {}, checklists = {}
  let done = 0
  const queue = [...openCards]

  async function worker() {
    while (queue.length) {
      const card = queue.shift()
      try {
        const [clActions, clList] = await Promise.all([
          fetchWithRetry(`https://api.trello.com/1/cards/${card.id}/actions?filter=commentCard&fields=data,date&limit=1000`),
          fetchWithRetry(`https://api.trello.com/1/cards/${card.id}/checklists?fields=name&checkItems=all`)
        ])
        comments[card.id] = clActions
        checklists[card.id] = clList
      } catch (err) {
        console.error(`   FAIL ${card.idShort}: ${err.message}`)
        comments[card.id] = []
        checklists[card.id] = []
      }
      done++
      if (done % 25 === 0) {
        console.log(`   ${done}/${openCards.length}`)
        // incremental save
        fs.writeFileSync(path.join(OUT_DIR, 'comments.json'), JSON.stringify(comments))
        fs.writeFileSync(path.join(OUT_DIR, 'checklists.json'), JSON.stringify(checklists))
      }
    }
  }

  console.log('3. Comments + checklists (parallel, batch=10)...')
  await Promise.all(Array.from({ length: 10 }, worker))

  fs.writeFileSync(path.join(OUT_DIR, 'comments.json'), JSON.stringify(comments))
  fs.writeFileSync(path.join(OUT_DIR, 'checklists.json'), JSON.stringify(checklists))

  const totalCmts = Object.values(comments).reduce((s, a) => s + a.length, 0)
  const totalCl = Object.values(checklists).reduce((s, cls) => s + cls.reduce((ss, cl) => ss + cl.checkItems.length, 0), 0)
  console.log(`\nDone: ${openCards.length} cards, ${totalCmts} comments, ${totalCl} checklist items`)
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
