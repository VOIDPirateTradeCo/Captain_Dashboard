const https = require('https')
const { URL } = require('url')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

function post(path, body, extraParams = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(BASE + path)
    u.searchParams.set('key', KEY)
    u.searchParams.set('token', TOKEN)
    for (const [k, v] of Object.entries(extraParams)) {
      u.searchParams.set(k, v)
    }
    const req = https.request(u.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try { resolve({ status: res.statusCode, data: JSON.parse(text) }) } catch (e) { resolve({ status: res.statusCode, data: text }) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function main() {
  // ===== 1. VOID Ops: PINKCADY connectivity card =====
  const VOID_OPS_P0_LIST = '6a73abbf4539aaa060199c07'
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'

  const pinkcadyCard = {
    name: '[P0] PINKCADY unreachable — both LAN and Tailscale down',
    desc: `**Problem:** PINKCADY Mission Control is unreachable on both LAN and Tailscale.

**Probe results (2026-09-03):**
| Path | Host | Status | Latency |
|------|------|--------|---------|
| PINKCADY Tailscale | 100.106.235.103:3000 | ERR socket hang up | 5009ms |
| PINKCADY LAN | 192.168.0.180:3000 | ERR socket hang up | 5006ms |
| STEALTHATTACK Tailscale | 100.110.238.68:3000 | 200 OK | 113ms |
| STEALTHATTACK LAN | 192.168.0.68:3000 | ERR socket hang up | 5005ms |
| SQUIDSTATION Master | 192.168.0.39:3100 | 200 OK | 23ms |

**Impact:**
- PINKCADY agent (id: 11) shows status "idle" but last activity is just "Heartbeat check"
- No real stats reporting from PINKCADY
- Miss Pink cannot connect to master MC from PINKCADY

**Likely cause:**
- PINKCADY MC server is down or not listening on :3000
- Tailscale on PINKCADY may be disconnected
- Firewall blocking LAN access

**Next steps for Miss Pink:**
1. Check if MC is running on PINKCADY: \`netstat -ano | findstr :3000\`
2. Check Tailscale status on PINKCADY: \`tailscale status\`
3. Restart MC if needed: \`npx next dev --hostname 0.0.0.0 --port 3000\`
4. Verify LAN cable / WiFi connection

— Sir Green`,
    idList: VOID_OPS_P0_LIST,
    idLabels: [SIR_GREEN_LABEL, MISSION_CONTROL_LABEL],
  }

  console.log('1. Creating PINKCADY connectivity card...')
  const r1 = await post('/cards', pinkcadyCard)
  console.log('   STATUS:', r1.status)
  if (r1.status === 200) console.log('   CARD ID:', r1.data.id)
  else console.log('   RESPONSE:', JSON.stringify(r1.data).slice(0, 300))

  // ===== 2. VOID Ops: Miss Pink agent verification card =====
  const missPinkCard = {
    name: '[P1] Verify Miss Pink agent connectivity and stats reporting',
    desc: `**Current state:**
- Miss Pink agent (id: 9): status "offline", last_seen 1788287856
- Config: capabilities=["commander","torus","coordination"], framework="hermes"
- Last activity: null

**Goal:**
- Miss Pink should register heartbeat from PINKCADY
- Stats should report correctly on Captain Dashboard
- Miss Pink should be able to login with her own profile

**Test for Miss Pink:**
1. Login to https://192.168.0.39:3100 with your account
2. Run in browser console: \`fetch("/api/auth/me").then(r=>r.json()).then(d=>console.log(d))\`
3. Then run: \`fetch("/api/agents").then(r=>r.json()).then(d=>console.log(d))\`
4. Check if your agent shows status "online"

**If agent is still offline:**
- Your PINKCADY MC may not be running
- You may need to register via /api/adapters with x-api-key

— Sir Green`,
    idList: VOID_OPS_P0_LIST,
    idLabels: [SIR_GREEN_LABEL, MISSION_CONTROL_LABEL],
  }

  console.log('\n2. Creating Miss Pink verification card...')
  const r2 = await post('/cards', missPinkCard)
  console.log('   STATUS:', r2.status)
  if (r2.status === 200) console.log('   CARD ID:', r2.data.id)
  else console.log('   RESPONSE:', JSON.stringify(r2.data).slice(0, 300))
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
