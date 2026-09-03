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
  const VOID_OPS_P1_LIST = '6a73abbf8482da2937217d6f'
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'

  const networkCard = {
    name: '[P1] Fleet Mesh: exact commands for each device to join Headscale + NetBird',
    desc: `**Fleet Mesh Onboarding Commands (2026-09-03)**

## Headscale (Primary Mesh) — All devices run Tailscale client

### Windows PCs (STEALTHATTACK, PINKCADY):
\`\`\`powershell
# Install Tailscale (if not already)
winget install Tailscale.Tailscale

# Connect to our Headscale server
tailscale up --login-server=http://192.168.0.39:8080 --auth-key=hskey-auth-LkEFw4oSaepO-DsQJXNimle9QIs-98u0Rypk4q1dmziKw2cS2l8xIn70HZguuHB2aiUar8UzqViBJ

# Verify
tailscale status
\`\`\`

### macOS/Linux:
\`\`\`bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Connect
sudo tailscale up --login-server=http://192.168.0.39:8080 --auth-key=hskey-auth-LkEFw4oSaepO-DsQJXNimle9QIs-98u0Rypk4q1dmziKw2cS2l8xIn70HZguuHB2aiUar8UzqViBJ
\`\`\`

### iOS/Android:
1. Install Tailscale app from App Store/Play Store
2. Go to Settings → Account → Change server
3. Enter: http://192.168.0.39:8080
4. Login with auth key above

### Smart TVs / Consoles (no native Tailscale):
Use subnet route from a gateway PC:
\`\`\`powershell
# On a PC that's always on (e.g., SQUIDSTATION)
tailscale up --advertise-routes=192.168.0.0/24 --accept-routes
\`\`\`
Then enable the route in Headscale admin.

## NetBird (Secondary Mesh) — Backup / Remote Access

### Windows PCs:
\`\`\`powershell
# Install NetBird
winget install NetBird.NetBird

# Connect with setup key (get key from Captain)
netbird up --setup-key=<SETUP_KEY> --management-url http://192.168.0.39
\`\`\`

### Verify both meshes:
\`\`\`powershell
# Headscale
tailscale status
tailscale ip -4

# NetBird
netbird status
\`\`\`

## Current Status:
- Headscale: v0.29.3, DERP enabled, MagicDNS enabled, 0 nodes connected
- NetBird: v0.77.1, 0 peers connected
- Preauthkey: hskey-auth-LkEFw4oSaepO-*** (reusable, expires 2027-09-03)

— Sir Green`,
    idList: VOID_OPS_P1_LIST,
    idLabels: [SIR_GREEN_LABEL, MISSION_CONTROL_LABEL],
  }

  console.log('Creating fleet mesh onboarding card...')
  const result = await post('/cards', networkCard)
  console.log('STATUS:', result.status)
  if (result.status === 200) console.log('CARD ID:', result.data.id)
  else console.log('RESPONSE:', JSON.stringify(result.data).slice(0, 300))
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
