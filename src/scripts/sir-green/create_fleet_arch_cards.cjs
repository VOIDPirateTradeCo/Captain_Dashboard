const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const boards = { voidOps: '6a595669b8f8f99c93392f4f' }
const lists = {
  p0: '6a73abbf4539aaa060199c07',
  p1: '6a73abbf8482da2937217d6f',
  p2: '6a73abbf275aa5c96ab03e67',
  p3: '6a6ca000dd43dfe2c5cb1635',
  project: '6a9529fad8385a022ad49119',
}
const labels = {
  sirGreen: '6a74dd63452761014e981f23',
  captainDashboard: '6a851536d3bdf66aac59cf9c',
  p0: '6a5d497ef3dd03fd20be42fc',
  p1: '6a5d497ef3dd03fd20be42fc',
  p2: '6a5d497ef3dd03fd20be42fc',
}

const cards = [
  {
    list: lists.project,
    name: '[EPIC][FLEET] One Master Mission Control + Headscale mesh for every device',
    desc: 'Architecture decision: one master MC on SQUIDSTATION. Headscale is the self-hosted mesh control plane. Ships become lightweight agents, not full MC instances. Phones, TVs, consoles join via Tailscale clients. NetBird stays as backup/remote-access mesh. Netmaker stays as tertiary backup. Goal: every device on the LAN gets a mesh IP, registers to master MC, and can be updated centrally.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0],
  },
  {
    list: lists.p0,
    name: '[HEADSCALE] Bring up self-hosted control plane on SQUIDSTATION and create namespaces',
    desc: 'Headscale is the easiest path because the fleet already uses Tailscale clients on Windows, iOS, Android, TVs, and consoles. Steps: 1) Fix the failed container start, 2) generate TLS or use HTTP for lab, 3) create VOID namespace, 4) create auth key, 5) verify dashboard on 8080.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0],
  },
  {
    list: lists.p0,
    name: '[LAN DISCOVERY] Build device inventory for 192.168.0.0/24 and assign onboarding plan',
    desc: 'Live scan found: 192.168.0.1 router, 192.168.0.32 MC instance on 3000 + SMB, 192.168.0.63, .81, .172, .227, .154, .171, .3. Tailscale peers: 100.106.235.103 PINKCADY, 100.110.238.68 STEALTHATTACK. Next: identify device types, open ports, and assign each a mesh onboarding path.',
    labels: [labels.sirGreen, labels.captainDashboard],
  },
  {
    list: lists.p1,
    name: '[SHIP AGENT] Replace full Mission Control on ships with lightweight agent + single master MC',
    desc: 'Ships should not run separate MC web apps. Instead: ship agent script does firewall, rebuild, start local MC if needed, register to master, heartbeat every 5 min, and report logs. Master MC becomes the only UI. This removes the 3-instance sync problem.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p1],
  },
  {
    list: lists.p1,
    name: '[NETBIRD] Keep as backup/remote-access mesh, create non-interactive setup keys',
    desc: 'NetBird is already running on master. Use it for remote crew access instead of exposing ports. After you complete browser auth, create setup keys for ships. NetBird becomes the remote/guest path; Headscale becomes the primary LAN+device mesh.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p1],
  },
  {
    list: lists.p2,
    name: '[NETMAKER] Retire or keep as tertiary fallback only',
    desc: 'Netmaker profile creation failed. Since we have Headscale + NetBird working, demote Netmaker to backup only. If it is needed later, fix profile creation via CLI or direct DB.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p2],
  },
  {
    list: lists.p2,
    name: '[DEVICES] Onboard phones, TVs, PlayStation, Nintendo, and unknown LAN nodes',
    desc: 'For each discovered device: 1) identify type, 2) install Tailscale client or lightweight agent, 3) assign device name in Headscale, 4) verify mesh IP, 5) add to master MC inventory. Start with 192.168.0.32, .63, .81, .172, .227.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p2],
  },
  {
    list: lists.p3,
    name: '[VERSION CONTROL] Central update push from master to all devices',
    desc: 'Once all devices are mesh-connected, build a deploy pipeline on master that pushes MC updates, configs, and scripts to ships. Use the ship agent package as the runner. Keep rollback capability.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p3],
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

async function main() {
  for (const card of cards) {
    const path = '/1/cards?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
    const result = await request(path, 'POST', {
      name: card.name,
      desc: card.desc,
      idList: card.list,
      idLabels: card.labels,
    })
    console.log('CARD', result.status, result.data && result.data.id ? result.data.id : result.data)
    await new Promise(r => setTimeout(r, 350))
  }
  console.log('DONE', cards.length)
}

main().catch(e => { console.error(e); process.exit(1) })
