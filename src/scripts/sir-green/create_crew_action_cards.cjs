const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const boards = {
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
    board: 'torusOps',
    name: '[MISS PINK ACTION] Restart PINKCADY Mission Control and verify ship listener on 3000',
    desc:
      'Exact commands to run on PINKCADY in PowerShell:\n\n```powershell\n# Stop existing node processes\nGet-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force\n\n# Enter the working app folder\nSet-Location "D:\\Work\\Torus Coffee Company LLC\\tmp\\mission-control-fresh"\n\n# Rebuild native module just in case\ncmd.exe /c "npm rebuild better-sqlite3"\n\n# Start MC dev server on all interfaces\n$env:HOST="0.0.0.0"\n$env:PORT="3000"\ncmd.exe /c "npx next dev --hostname 0.0.0.0 --port 3000"\n```\n\nAfter it starts, send back:\n1. `netstat -ano | findstr :3000`\n2. The `Local: http://0.0.0.0:3000` line',
    labels: [labels.missPink, labels.captainDashboard],
  },
  {
    board: 'torusOps',
    name: '[MISS PINK ACTION] Verify LAN login with exact password — do not use placeholder ***',
    desc:
      'Run this on PINKCADY PowerShell, replacing PASSWORD with the real master admin password:\n\n```powershell\n$body = \'{"username":"captain","password":"PASSWORD"}\'\nInvoke-RestMethod -Uri "http://192.168.0.39:3100/api/auth/login" -Method POST -ContentType "application/json" -Body $body\n```\n\nSend back the full output. If it returns 200 with a user object, LAN auth is fixed.',
    labels: [labels.missPink, labels.captainDashboard],
  },
  {
    board: 'sirAzureOps',
    name: '[SIR AZURE ACTION] Verify STEALTHATTACK Mission Control listener and fix LAN firewall',
    desc:
      'Live proof: master can reach STEALTHATTACK on Tailscale (`100.110.238.68:3000`) but not LAN (`192.168.0.68:3000`). Run these on STEALTHATTACK:\n\n```powershell\n# 1. Check listener\nnetstat -ano | findstr :3000\n\n# 2. Check Node processes\nGet-Process -Name node -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,StartTime\n\n# 3. Open LAN firewall for master\nnetsh advfirewall firewall add rule name="ALLOW-MC-STEALTHATTACK-3000" dir=in action=allow protocol=TCP localport=3000 remoteip=192.168.0.39 profile=private\n```\n\nSend back all outputs.',
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
