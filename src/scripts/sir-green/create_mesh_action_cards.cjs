const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const boards = {
  voidOps: { board: '6a595669b8f8f99c93392f4f', list: '6a73abbf4539aaa060199c07' },
  torusOps: { board: '6a70a3157d0db4214ac3f9a3', list: '6a70a324f8b2c11f01b52e1a' },
  sirAzureOps: { board: '6a839af9b5e7e56792d25e30', list: '6a839b0ab8f0d13bdb6d81c3' },
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
    name: '[PINKCADY] Mission Control ship listener down from master — Tailscale + LAN timeout',
    desc:
      'Live proof from master: TCP to 100.106.235.103:3000 and 192.168.0.180:3000 both timeout. HTTP /health fails. PINKCADY cannot serve fleet traffic right now. Fix: restart `npx next dev --hostname 0.0.0.0 --port 3000` in `D:\\Work\\Torus Coffee Company LLC\\tmp\\mission-control-fresh` and confirm `netstat -ano | findstr :3000` shows LISTENING.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0, labels.missPink],
  },
  {
    board: 'voidOps',
    name: '[PINKCADY] LAN login returns 401 — verify real password and exact request body',
    desc:
      'Live symptom: PowerShell `Invoke-RestMethod` to `http://192.168.0.39:3100/api/auth/login` returned 401. Master LAN login works from SQUIDSTATION. Most likely cause: the request body contained the literal placeholder instead of the real password. Fix: use exact password, not placeholder. Test with PowerShell: `Invoke-RestMethod -Uri "http://192.168.0.39:3100/api/auth/login" -Method POST -ContentType "application/json" -Body "{\"username\":\"captain\",\"password\":\"REPLACE_WITH_REAL_PASSWORD\"}"`',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p0, labels.missPink],
  },
  {
    board: 'voidOps',
    name: '[STEALTHATTACK] LAN listener closed — Tailscale works, LAN does not',
    desc:
      'Live proof from master: TCP to `100.110.238.68:3000` OPEN 4ms, HTTP `/health` 200 db:ok. TCP to `192.168.0.68:3000` TIMEOUT. Root cause: ship-side firewall or listener binding on LAN interface only. Fix for Sir Azure: verify `netstat -ano | findstr :3000` shows LISTENING on `0.0.0.0:3000`, and add firewall allow rule for `192.168.0.39` on port 3000.',
    labels: [labels.sirGreen, labels.captainDashboard, labels.p1, labels.sirAzure],
  },
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
  for (const [index, item] of cards.entries()) {
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
