const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const boards = {
  voidOps: { board: '6a595669b8f8f99c93392f4f', list: '6a73abbf4539aaa060199c07' },
  torusOps: { board: '6a70a3157d0db4214ac3f9a3', list: '6a74cbd440270147ff04bd5b' },
  sirAzureOps: { board: '6a839af9b5e7e56792d25e30', list: '6a839af9b5e7e56792d25e8e' },
}

const labels = {
  sirGreen: '6a74dd63452761014e981f23',
  captainDashboard: '6a851536d3bdf66aac59cf9c',
  p0: '6a5d497ef3dd03fd20be42fc',
  p1: '6a5d497ef3dd03fd20be42fc',
  missPink: '6a74dd6389bc3f6fe4c7b92e',
  sirAzure: '6a851536d3bdf66aac59cf9c',
}

const cards = [
  {
    board: 'voidOps',
    name: '[PINKCADY] Mission Control dev server failing — missing `app` or `pages` directory in active folder',
    desc:
      'Live symptom from PINKCADY: `npx next dev --hostname 0.0.0.0 --port 3000` errors with `Couldn\'t find any pages or app directory`. Earlier ZIP extraction showed source in `mission-control-fresh/src/app`, but the running folder may be wrong or incomplete. Fix: verify exact working directory with `Get-Location`, then `Get-ChildItem -Depth 1` to confirm `package.json`, `src`, and `app` exist in the active folder. If missing, use the folder that actually contains the Next.js source.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0, labels.missPink],
  },
  {
    board: 'voidOps',
    name: '[TOOLING] Build fleet bootstrap scripts + webhook auto-registration to eliminate manual PowerShell back-and-forth',
    desc:
      'Current state: every ship requires manual PowerShell commands for firewall, clone, build, rebuild, start, register, heartbeat. Proposed fix: build per-ship bootstrap scripts (`bootstrap-pinkcady.ps1`, `bootstrap-stealthattack.ps1`) that automate the full pipeline, plus a webhook/polling agent that auto-registers with master and heartbeats every 5 minutes. Master already has `/api/agents/register` and `/api/agents/:name/heartbeat`. Ships just need a small wrapper script + scheduled task. Outcome: one command per ship instead of 10+ round trips.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p1],
  },
  {
    board: 'torusOps',
    name: '[MISS PINK ACTION] Run one exact diagnostic block — find the real broken folder',
    desc:
      'Run this on PINKCADY PowerShell and send back ALL output:\n\n```powershell\nGet-Location\nGet-ChildItem -Depth 1 | Select-Object Mode,Name\nnetstat -ano | findstr :3000\nGet-Process -Name node -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,StartTime\n```\n\nThis tells us whether she is in the right folder and whether anything is actually listening on port 3000.',
    labels: [labels.missPink, labels.captainDashboard],
  },
  {
    board: 'sirAzureOps',
    name: '[SIR AZURE ACTION] Fix STEALTHATTACK LAN firewall — listener is up but LAN still blocked',
    desc:
      'Live proof: master can reach `100.110.238.68:3000` OPEN 4ms, but `192.168.0.68:3000` TIMEOUT. STEALTHATTACK has `0.0.0.0:3000` LISTENING. Root cause: ship-side firewall still blocking LAN from `192.168.0.39`. Run on STEALTHATTACK:\n\n```powershell\nnetsh advfirewall firewall add rule name="ALLOW-MC-STEALTHATTACK-3000" dir=in action=allow protocol=TCP localport=3000 remoteip=192.168.0.39 profile=private\nnetsh advfirewall firewall show rule name="ALLOW-MC-STEALTHATTACK-3000"\n```\n\nSend back both outputs.',
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
  const board = boards[boardKey]
  const path = '/1/cards?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
  return request(path, 'POST', {
    name: card.name,
    desc: card.desc,
    idList: board.list,
    idLabels: card.labels,
  })
}

async function main() {
  for (const item of cards) {
    const result = await createCard(item.board, item)
    console.log('CARD', result.status, result.data && result.data.id ? result.data.id : result.data)
    await new Promise(r => setTimeout(r, 400))
  }
  console.log('DONE', cards.length)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
