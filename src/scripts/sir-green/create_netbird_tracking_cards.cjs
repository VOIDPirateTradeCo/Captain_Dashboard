const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const boards = {
  voidOps: '6a595669b8f8f99c93392f4f',
  torusOps: '6a70a3157d0db4214ac3f9a3',
  sirAzureOps: '6a839af9b5e7e56792d25e30',
}
const lists = {
  voidOps: '6a73abbf4539aaa060199c07',
  torusOps: '6a74cbd440270147ff04bd5b',
  sirAzureOps: '6a839af9b5e7e56792d25e8e',
}
const labels = {
  sirGreen: '6a74dd63452761014e981f23',
  captainDashboard: '6a851536d3bdf66aac59cf9c',
  p0: '6a5d497ef3dd03fd20be42fc',
  missPink: '6a74dd6389bc3f6fe4c7b92e',
  sirAzure: '6a851536d3bdf66aac59cf9c',
}

const cards = [
  {
    board: 'voidOps',
    name: '[TOOLING] Install NetBird mesh on master — free tier, CLI-controlled',
    desc: 'Install NetBird on SQUIDSTATION (master). Preferred: Docker Compose on master for the NetBird management plane, or the free NetBird SaaS tier if self-hosted is too heavy. Create peer profiles for PINKCADY and STEALTHATTACK. Verify mesh IP assignment and routing. Track installation and verification steps here.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0],
  },
  {
    board: 'voidOps',
    name: '[TOOLING] Install NetBird clients on PINKCADY + STEALTHATTACK',
    desc: 'Install the NetBird Windows client on PINKCADY and STEALTHATTACK. Register each ship against the master NetBird workspace. Enable auto-connect on boot. Verify each ship gets a mesh IP and can reach master services over the mesh.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0],
  },
  {
    board: 'voidOps',
    name: '[VERIFY] End-to-end mesh connectivity — all ships to master + ship-to-ship',
    desc: 'After NetBird is installed on all nodes, run connectivity checks: master->ship, ship->master, ship->ship. Document results in this card. If any path fails, investigate firewall/routing/mesh policy.',
    labels: [labels.sirGreen, labels.captainDashboard],
  },
  {
    board: 'voidOps',
    name: '[TOOLING] Retire manual bootstrap scripts after NetBird mesh is stable',
    desc: 'Once NetBird mesh routing works, update fleet bootstrap scripts to use NetBird peer IPs. Remove manual port-forwarding workarounds. Keep scripts as offline fallback only. Close this card only with verified evidence from all ships.',
    labels: [labels.sirGreen, labels.captainDashboard],
  },
  {
    board: 'torusOps',
    name: '[MISS PINK ACTION] Install NetBird client and connect to VOID mesh',
    desc: 'After master NetBird is ready, install the NetBird Windows client from https://netbird.io/download, sign in with the provided service account, connect to VOID mesh, then run `netbird status` and `ipconfig` and send the output here.',
    labels: [labels.missPink, labels.captainDashboard],
  },
  {
    board: 'sirAzureOps',
    name: '[SIR AZURE ACTION] Install NetBird client and connect to VOID mesh',
    desc: 'After master NetBird is ready, install the NetBird Windows client from https://netbird.io/download, sign in with the provided service account, connect to VOID mesh, then run `netbird status` and `ipconfig` and send the output here.',
    labels: [labels.sirAzure, labels.captainDashboard],
  },
]

function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.trello.com',
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }
    const req = https.request(options, res => {
      let bodyText = ''
      res.on('data', chunk => (bodyText += chunk))
      res.on('end', () => resolve({ status: res.statusCode, data: bodyText }))
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function createCard(boardKey, card) {
  const list = lists[boardKey]
  const path = '/1/cards?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
  return request(path, 'POST', {
    name: card.name,
    desc: card.desc,
    idList: list,
    idLabels: card.labels,
  })
}

async function main() {
  for (const item of cards) {
    const result = await createCard(item.board, item)
    console.log('CARD', result.status, result.data && result.data.id ? result.data.id : result.data)
    await new Promise(r => setTimeout(r, 350))
  }
  console.log('DONE', cards.length)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
