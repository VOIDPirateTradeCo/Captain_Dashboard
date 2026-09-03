const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const boards = {
  voidOps: '6a595669b8f8f99c93392f4f',
  torusOps: '6a70a3157d0db4214ac3f9a3',
  sirAzureOps: '6a839af9b5e7e56792d25e30',
}
const lists = {
  p0: '6a73abbf4539aaa060199c07',
  p1: '6a73abbf8482da2937217d6f',
  p2: '6a73abbf275aa5c96ab03e67',
  p3: '6a6ca000dd43dfe2c5cb1635',
  p4: '6a6ca000f44fe6a7191d14ec',
  project: '6a9529fad8385a022ad49119',
  inbox: '6a777169cd5feec20ef26ede',
  torusOps: '6a74cbd440270147ff04bd5b',
  sirAzureOps: '6a839af9b5e7e56792d25e8e',
}
const labels = {
  sirGreen: '6a74dd63452761014e981f23',
  captainDashboard: '6a851536d3bdf66aac59cf9c',
  p0: '6a5d497ef3dd03fd20be42fc',
  p1: '6a5d497ef3dd03fd20be42fc',
  p2: '6a5d497ef3dd03fd20be42fc',
  missPink: '6a74dd6389bc3f6fe4c7b92e',
  sirAzure: '6a851536d3bdf66aac59cf9c',
}

const cards = [
  {
    board: 'voidOps',
    list: lists.project,
    name: '[EPIC][MESH] Install + verify Headscale / NetBird / Netmaker on master + ships',
    desc: 'Install all 3 mesh stacks on SQUIDSTATION master. Ship packages go to S:\\Sir_Azure and D:\\Work\\Torus Coffee Company LLC. Verify each mesh gives full LAN+Tailscale coverage, then pick the winner for fleet-wide rollout.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0],
  },
  {
    board: 'voidOps',
    list: lists.p0,
    name: '[NETBIRD] Finish master activation + create setup keys for ships',
    desc: 'NetBird container is running on master and waiting for device-code auth. Complete activation, then create non-interactive setup keys for PINKCADY and STEALTHATTACK. Document the setup key flow in this card.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0],
  },
  {
    board: 'voidOps',
    list: lists.p0,
    name: '[HEADSCALE] Install self-hosted Tailscale control plane on master',
    desc: 'Install Headscale on SQUIDSTATION via Docker Compose. Configure namespace/auth. Export Tailscale client configs for ships. Verify master can manage peers and routes.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0],
  },
  {
    board: 'voidOps',
    list: lists.p0,
    name: '[NETMAKER] Install WireGuard mesh control plane on master',
    desc: 'Install Netmaker on SQUIDSTATION via Docker Compose. Create network, auth key, and peer configs for ships. Verify WireGuard mesh IP assignment and routing.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0],
  },
  {
    board: 'voidOps',
    list: lists.p1,
    name: '[NETWORK DISCOVERY] Find every device on the LAN and create a connection plan',
    desc: 'Scan 192.168.0.0/24 and 100.0.0.0/8 for phones, TVs, PlayStations, switches, etc. Build an inventory with hostnames, MAC vendors, open ports, and device type. Output: network_map.json + Trello card with connection plan.',
    labels: [labels.sirGreen, labels.captainDashboard],
  },
  {
    board: 'voidOps',
    list: lists.p1,
    name: '[MC CONNECT] Create one master Mission Control and connect all devices to it',
    desc: 'Move from 3 separate MC instances to one master on SQUIDSTATION. Devices register as agents or feed logs via lightweight collectors. Central auth, central UI, central updates.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p1],
  },
  {
    board: 'voidOps',
    list: lists.p2,
    name: '[MESH COMPARE] Headscale vs NetBird vs Netmaker — pick the fleet standard',
    desc: 'Compare all 3 on: install ease, Windows client support, mobile support, Docker footprint, CLI control, free tier limits, routing behavior. Winner gets full fleet rollout. Losers become backup options.',
    labels: [labels.sirGreen, labels.captainDashboard],
  },
  {
    board: 'voidOps',
    list: lists.project,
    name: '[PACKAGES] Build ship install packages for Sir Azure + Miss Pink',
    desc: 'Create exact, copy-forward folders:\n- S:\\Sir_Azure\\mesh-setup\\...\n- D:\\Work\\Torus Coffee Company LLC\\mesh-setup\\...\nEach contains: tool installers, setup keys, one-click bootstrap scripts, verification checklist.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p1],
  },
  {
    board: 'torusOps',
    list: lists.torusOps,
    name: '[MISS PINK ACTION] Run one exact block in D:\\Work\\Torus Coffee Company LLC',
    desc: 'Run this on PINKCADY PowerShell:\n\nSet-Location "D:\\Work\\Torus Coffee Company LLC"\nGet-ChildItem -Depth 1 | Select-Object Mode,Name\nif (Test-Path "mesh-setup") { Get-ChildItem mesh-setup -Recurse -Depth 2 | Select-Object FullName } else { "mesh-setup MISSING" }',
    labels: [labels.missPink, labels.captainDashboard],
  },
  {
    board: 'sirAzureOps',
    list: lists.sirAzureOps,
    name: '[SIR AZURE ACTION] Run one exact block in S:\\Sir_Azure',
    desc: 'Run this on STEALTHATTACK PowerShell:\n\nSet-Location "S:\\Sir_Azure"\nGet-ChildItem -Depth 1 | Select-Object Mode,Name\nif (Test-Path "mesh-setup") { Get-ChildItem mesh-setup -Recurse -Depth 2 | Select-Object FullName } else { "mesh-setup MISSING" }',
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

async function createCard(boardKey, listId, card) {
  const path = '/1/cards?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
  return request(path, 'POST', {
    name: card.name,
    desc: card.desc,
    idList: listId,
    idLabels: card.labels,
  })
}

async function main() {
  for (const item of cards) {
    const result = await createCard(item.board, item.list, item)
    console.log('CARD', result.status, result.data && result.data.id ? result.data.id : result.data)
    await new Promise(r => setTimeout(r, 350))
  }
  console.log('DONE', cards.length)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
