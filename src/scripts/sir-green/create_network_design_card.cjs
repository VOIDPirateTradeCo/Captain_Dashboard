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
  const VOID_OPS_P0_LIST = '6a73abbf4539aaa060199c07'
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'

  const networkCard = {
    name: '[P0] Fleet Mesh Network Design: Headscale primary + NetBird backup + full device onboarding',
    desc: `**Architecture Decision (2026-09-03):**

## PRIMARY: Headscale (Self-Hosted Tailscale Control Plane)
- Running: v0.29.3 on SQUIDSTATION, port 8080
- VOID namespace created, reusable preauthkey generated
- All devices with Tailscale clients point to: http://192.168.0.39:8080
- No external dependency if DERP disabled
- MagicDNS optional, can run IP-only

## SECONDARY: NetBird (Remote Access Mesh)
- Running: 0.77.1 on SQUIDSTATION, ports 80/443/33073
- Mesh IP: 100.82.156.195/16
- Management: Connected, 0 peers currently
- Setup keys for ship onboarding
- Fallback if Headscale has issues

## TERTIARY: Netmaker (WireGuard Mesh)
- Running: v0.22.0 on SQUIDSTATION, port 8082
- Only if we need WireGuard-specific features

## Device Onboarding Plan:

| Device | Type | Primary Mesh | Secondary | Status |
|--------|------|--------------|-----------|--------|
| SQUIDSTATION | Server | Headscale server | Netbird server | ONLINE ✅ |
| STEALTHATTACK | PC | Tailscale client | Netbird client | TAILSCALE ONLY ⚠️ |
| PINKCADY | PC | Tailscale client | Netbird client | OFFLINE ❌ |
| Phones | Mobile | Tailscale app | Netbird app | NOT STARTED |
| TVs | IoT | Subnet route | Netbird | NOT STARTED |
| PS5 | Console | Subnet route | - | NOT STARTED |

## MC Fleet Integration:
- Each ship registers as agent via /api/adapters with x-api-key
- Captain Office panel shows ship status via /api/fleet/connectivity
- Resources panel shows agent status via /api/fleet/resources
- All stats flow into Pirate Captain's Dashboard

## Immediate Actions:
1. ✅ Sir Green admin access confirmed
2. ✅ Sir Azure login card created
3. ✅ Miss Pink verification card created
4. ⚠️ PINKCADY needs restart (Miss Pink action)
5. ⚠️ STEALTHATTACK LAN firewall (Sir Azure action)
6. ⏳ Headscale DERP config for full offline
7. ⏳ NetBird setup keys for ships
8. ⏳ All devices join mesh

— Sir Green`,
    idList: VOID_OPS_P0_LIST,
    idLabels: [SIR_GREEN_LABEL, MISSION_CONTROL_LABEL],
  }

  console.log('Creating fleet mesh network design card...')
  const result = await post('/cards', networkCard)
  console.log('STATUS:', result.status)
  if (result.status === 200) console.log('CARD ID:', result.data.id)
  else console.log('RESPONSE:', JSON.stringify(result.data).slice(0, 300))
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
