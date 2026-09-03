const https = require('https')
const { URL } = require('url')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

// Move card to different board
function moveCard(cardId, targetBoardId, targetListId) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + '/cards/' + cardId)
    u.searchParams.set('key', KEY)
    u.searchParams.set('token', TOKEN)
    u.searchParams.set('idBoard', targetBoardId)
    u.searchParams.set('idList', targetListId)
    
    const req = https.request(u.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }) } catch (e) { resolve({ status: res.statusCode, data: body }) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

// Close (archive) a board
function closeBoard(boardId) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + '/boards/' + boardId)
    u.searchParams.set('key', KEY)
    u.searchParams.set('token', TOKEN)
    u.searchParams.set('closed', 'true')
    
    const req = https.request(u.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    }, res => {
      let body = ''
      res.on('data', c => body += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }) } catch (e) { resolve({ status: res.statusCode, data: body }) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  const WRONG_BOARD = '6a737c97a7d29e8c7c34cf5a'
  const CORRECT_BOARD = '6a839af9b5e7e56792d25e30'
  const CORRECT_TODO_LIST = '6a839af9b5e7e56792d25e8e'
  
  const cardsToMove = [
    { id: '6a7913a6fecc1260cf848143', name: 'Sir Azure: Git sync + crew notify' },
    { id: '6a9984ac3ef5c2f8547140ca', name: '[SIR AZURE] Fix LAN auth to master' },
    { id: '6a9984d754362484563617bd', name: '[SIR AZURE] Fix LAN auth to master (dup)' },
    { id: '6a9984d77af0368c816d9b80', name: '[SIR AZURE] Run bootstrap-stealthattack.ps1' },
    { id: '6a9984d8972e84c81c83a75d', name: '[SIR AZURE] Verify Headscale/Tailscale' },
    { id: '6a7913a7eaeaafbea99d0ac3', name: 'Sir Azure: NSSM service elevated restart' },
    { id: '6a7913a72115573b2b73a8dc', name: 'Sir Azure: docker_bridge stability test' },
  ]
  
  console.log('=== MOVING CARDS FROM WRONG BOARD TO SIR AZURE OPS ===\n')
  
  let moved = 0
  for (const card of cardsToMove) {
    const result = await moveCard(card.id, CORRECT_BOARD, CORRECT_TODO_LIST)
    if (result.status === 200) {
      moved++
      console.log('✅ Moved:', card.name.substring(0, 60))
    } else {
      console.log('❌ Failed:', card.name.substring(0, 60), result.status, JSON.stringify(result.data).substring(0, 100))
    }
    await new Promise(r => setTimeout(r, 350))
  }
  
  console.log(`\nMoved ${moved}/${cardsToMove.length} cards`)
  
  console.log('\n=== CLOSING WRONG BOARD ===')
  const closeResult = await closeBoard(WRONG_BOARD)
  console.log('Close status:', closeResult.status)
  if (closeResult.status === 200) {
    console.log('✅ Wrong board "Sir Azure / STEALTHATTACK" is now closed/archived')
  } else {
    console.log('Close response:', JSON.stringify(closeResult.data).substring(0, 200))
  }
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
