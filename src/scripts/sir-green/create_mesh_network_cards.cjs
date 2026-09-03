const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BOARDS = {
  voidOps: '6a595669b8f8f99c93392f4f',
}
const LISTS = {
  p0: '6a73abbf4539aaa060199c07',
  p1: '6a73abbf8482da2937217d6f',
  p2: '6a73abbf275aa5c96ab03e67',
  p3: '6a6ca000dd43dfe2c5cb1635',
  project: '6a9529fad8385a022ad49119',
  inbox: '6a777169cd5feec20ef26ede',
}
const LABELS = {
  sirGreen: '6a74dd63452761014e981f23',
  captainDashboard: '6a851536d3bdf66aac59cf9c',
  p0: '6a5d497ef3dd03fd20be42fc',
  p1: '6a5d497ef3dd03fd20be42fc',
  p2: '6a5d497ef3dd03fd20be42fc',
}

const cards = [
  {
    list: LISTS.project,
    name: '[EPIC][MESH] LAN-First Mesh Network: Headscale as primary, NetBird fallback, Netmaker tertiary',
    desc: `RESEARCH FINDINGS (2026-09-03):

## CURRENT STATE (all 3 deployed on SQUIDSTATION, all running)
- Headscale v0.29.3 → 0.0.0.0:8080 (TCP+UDP 3478), VOID namespace created, reusable preauthkey generated
- NetBird → 0.0.0.0:80/443 + 33073, mesh IP 100.82.156.195/16, authorized (user_code HQCZ-HSZF completed)
- Netmaker → 0.0.0.0:8082 (remapped from 8081 due to cadvisor conflict), grafana on 3002

## NETBIRD ANALYSIS
- Designed as remote-access zero-trust (like Tailscale cloud), not LAN-only
- Self-hosted management plane + relay server required for NAT traversal
- When LAN peers use host/host ICE: ~0.29-2.27ms direct LAN (excellent)
- When no LAN route: falls back to relay.netbird.io (external SaaS dependency)
- Free tier: limited devices, no SSO, limited audit logs on cloud
- Self-hosted is free but still needs management URL reachable from clients
- Verdict: EXCELLENT for LAN-only direct peers, but relay dependency remains for edge cases; better as secondary/fallback mesh

## HEADSCALE ANALYSIS
- Self-hosted Tailscale control plane — uses Tailscale protocol
- Can run fully offline LAN: disable embedded DERP, peers use direct UDP on LAN
- Can run with embedded DERP for NAT traversal (self-hosted, no external dependency)
- Can disable Tailscale public DERP urls for full self-containment
- Existing fleet devices already have Tailscale clients (Windows, iOS, Android, TVs, PS5)
- No client install needed — just point to headscale login server + auth key
- MagicDNS optional; can run with IPs only for full offline
- Free, open source, no device limits, no SaaS dependency when DERP disabled
- Verdict: BEST FIT for LAN-first fleet with existing Tailscale clients; primary mesh choice

## NETMAKER ANALYSIS
- WireGuard-based, GUI management, Kubernetes-oriented
- Positions as "remote access" + "mesh VPN" 
- Netclient for endpoints, can set gateway for LAN subnet access
- More complex than Headscale for simple LAN mesh
- Good if we want full remote access from outside LAN later
- Verdict: TERTIARY option — over-engineered for current LAN-only requirement

## RECOMMENDATION
PRIMARY: Headscale (already running, already has VOID namespace + authkey)
- Use Tailscale clients already on all devices
- Disable public DERP for full offline LAN
- Enable embedded DERP only if we need NAT traversal across subnets
- Point all devices to http://192.168.0.39:8080

SECONDARY: NetBird (already running)
- Keep as backup mesh / remote access path
- If Headscale has issues, switch devices to NetBird setup keys

TERTIARY: Netmaker (already running)
- Keep container running; only use if we need WireGuard-specific features later

## NEXT STEPS (work in this order)
1. [HEADSCALE-PRIMARY] Verify Headscale VOID namespace + authkey, test with one Tailscale client
2. [DERP-DISABLE] Disable Tailscale public DERP urls in Headscale config for full LAN-only
3. [EMBEDDED-DERP] Enable embedded DERP server in Headscale for cross-subnet NAT traversal
4. [DEVICE-ONBOARD] Point all LAN devices to Headscale: phones, TVs, PS5, steamlabs, etc.
5. [NETBIRD-FALLBACK] Document NetBird setup key flow as backup if Headscale fails
6. [REMOTE-ACCESS] Decide if we need remote access later → if yes, enable DERP or use NetBird`,
    labels: [LABELS.sirGreen, LABELS.captainDashboard, LABELS.p0],
  },
  {
    list: LISTS.p0,
    name: '[HEADSCALE-PRIMARY] Verify Headscale VOID namespace + authkey works with one Tailscale client',
    desc: `## Goal
Verify the already-running Headscale (0.0.0.0:8080) can onboard at least one device using Tailscale client.

## Current state
- Headscale container: UP, 0.0.0.0:8080, VOID namespace created
- Preauthkey: generated (stored in container, not in scripts for security)
- Config: server_url=http://192.168.0.39:8080, prefixes 100.64.0.0/10, sqlite DB

## Test steps
1. Get the reusable preauthkey from Headscale container:
   docker exec headscale headscale keys create --reusable --expiration 8760h
   
2. On one LAN Windows machine, run:
   tailscale up --login-server=http://192.168.0.39:8080 --auth-key=<KEY> --hostname=<DEVICE_NAME>
   
3. Verify on Headscale:
   docker exec headscale headscale nodes list
   
4. Verify peer-to-peer LAN connectivity between two mesh IPs

## Evidence needed
- Preauthkey output (redact if needed)
- tailscale status output from client
- headscale nodes list showing the new node
- ping test between two mesh IPs`,
    labels: [LABELS.sirGreen, LABELS.captainDashboard, LABELS.p0],
  },
  {
    list: LISTS.p1,
    name: '[DERP-DISABLE] Remove Tailscale public DERP dependency from Headscale for full offline LAN',
    desc: `## Goal
Configure Headscale to not use Tailscale's public DERP servers (controlplane.tailscale.com), making the mesh fully self-hosted and offline-capable.

## Current config (needs change)
From fleet/headscale/config/config.yaml:
  derp:
    urls:
      - https://controlplane.tailscale.com/derpmap/default

## Changes needed
Option A (full offline, no NAT traversal):
  derp:
    urls: []
    server:
      enabled: false

Option B (LAN + embedded DERP for cross-subnet):
  derp:
    urls: []
    server:
      enabled: true
      region_id: 999
      region_code: "headscale"
      region_name: "VOID Embedded DERP"
      verify_clients: true
      stun_listen_addr: "0.0.0.0:3478"
      private_key_path: /var/lib/headscale/derp_server_private.key
      automatically_add_embedded_derp_region: true
      ipv4: 198.51.100.1
      ipv6: 2001:db8::1

Option B is recommended for fleet: LAN devices talk direct, devices on different subnets use embedded DERP (still self-hosted, no external dependency).

## Test
After config change, restart container and verify:
  docker exec headscale headscale nodes list
  tailscale status on a client (should show self-hosted DERP or direct)`,
    labels: [LABELS.sirGreen, LABELS.captainDashboard, LABELS.p1],
  },
  {
    list: LISTS.p1,
    name: '[DEVICE-ONBOARD] Create onboarding plan for all LAN devices to Headscale mesh',
    desc: `## Goal
Get every device on the LAN onto the Headscale mesh: phones, TVs, PlayStations, Steam decks, IoT, printers, switches.

## Known devices (from LAN scan 2026-09-03)
- 192.168.0.1 — router
- 192.168.0.32 — SQUIDSTATION (MC + SMB, Headscale server)
- 192.168.0.63 — ?
- 192.168.0.81 — ?
- 192.168.0.172 — file sharing
- 192.168.0.227 — ?
- 192.168.0.154 — ?
- 192.168.0.171 — ?
- 192.168.0.3 — ?

Tailscale peers (already on mesh):
- 100.106.235.103 — PINKCADY
- 100.110.238.68 — STEALTHATTACK

## Device type → onboarding path
| Device | OS | Method | Priority |
|--------|-----|--------|----------|
| Crew PCs (SQUIDSTATION, STEALTHATTACK, PINKCADY) | Windows | tailscale CLI or PowerShell | P0 |
| Phones (iOS/Android) | Mobile | Tailscale app + Headscale login URL | P1 |
| TVs (Smart TV) | Linux/Android TV | tailscale CLI if possible, or router subnet route | P2 |
| PlayStation 5 | PS5 | No native Tailscale — use router subnet route or LAN IP | P2 |
| Steam Deck / Linux laptops | Linux | tailscale CLI | P1 |
| IoT / printers | Various | Router subnet advertisement or static route | P3 |

## Steps
1. Build complete device inventory (MAC vendor, hostname, open ports)
2. For each device, determine onboarding method
3. For Windows/Linux: point to Headscale login server + reusable authkey
4. For mobile: use Tailscale app, login server URL http://192.168.0.39:8080
5. For consoles/IoT without Tailscale client: use subnet routes from a gateway node
6. Verify each device gets a 100.64.x.x mesh IP and can reach MC`,
    labels: [LABELS.sirGreen, LABELS.captainDashboard, LABELS.p1],
  },
  {
    list: LISTS.p2,
    name: '[NETBIRD-FALLBACK] Document NetBird setup key flow as backup mesh',
    desc: `## Goal
Document how to switch devices from Headscale to NetBird if Headscale fails, using the already-running NetBird container.

## Current state
- NetBird container: UP, 0.0.0.0:80/443 + 33073
- Mesh IP: 100.82.156.195/16
- Authorized: user completed activation (user_code HQCZ-HSZF)

## Setup key flow (for ships)
On each ship, run the NetBird client:
  netbird up --management-url https://192.168.0.39

Or use setup key (non-interactive):
  netbird up --setup-key=<SETUP_KEY> --management-url https://192.168.0.39

Get setup keys from NetBird management UI or API:
  https://192.168.0.39:443/setup-keys

## When to use this card
- If Headscale fails to onboard a device type
- If we need remote access path (NetBird has better remote-access design)
- If we want to compare both meshes side-by-side`,
    labels: [LABELS.sirGreen, LABELS.captainDashboard, LABELS.p2],
  },
  {
    list: LISTS.p2,
    name: '[REMOTE-ACCESS] Decide if fleet needs remote access outside LAN — if yes, enable DERP or use NetBird',
    desc: `## Question
Do we need crew devices to connect to the mesh when they are NOT on the local LAN (e.g., mobile phones on cellular, laptops at coffee shops)?

## If NO (LAN only)
- Keep Headscale with public DERP disabled
- All devices must be on LAN or VPN into LAN first
- Simpler, more secure, no external dependency
- Use case: crew always works from home/office LAN

## If YES (remote access needed)
Option A: Enable Headscale embedded DERP
- Self-hosted DERP server handles NAT traversal
- No external SaaS dependency
- Works for devices on any network reaching 192.168.0.39:8080 (needs port forward on router if accessing from outside)

Option B: Use NetBird as remote-access mesh
- NetBird designed for this use case
- Management URL must be reachable from outside (port forward or reverse proxy)
- Setup keys work for onboarding from anywhere

Option C: Tailscale cloud (not self-hosted)
- Easiest but uses Tailscale's infrastructure
- Free for up to 100 devices, 4 peers
- Not fully self-hosted

## Recommendation
Start with LAN-only (Option A disable DERP). If we later need remote access, enable embedded DERP first (still self-hosted). Only move to NetBird or Tailscale cloud if embedded DERP is insufficient.`,
    labels: [LABELS.sirGreen, LABELS.captainDashboard, LABELS.p2],
  },
  {
    list: LISTS.inbox,
    name: '[MESH-COMPARISON] Headscale vs NetBird vs Netmaker — detailed feature matrix for fleet decision',
    desc: `## Comparison matrix (research 2026-09-03)

| Feature | Headscale | NetBird | Netmaker |
|---------|-----------|---------|----------|
| Protocol | Tailscale (WireGuard+DERP) | WireGuard | WireGuard |
| Self-hosted | Yes, full | Yes, mgmt+relay | Yes, full |
| External dependency | None if DERP disabled | Relay server for NAT | None |
| LAN performance | Direct UDP, ~sub-ms | Direct host/host ICE ~0.3-2ms | WireGuard direct |
| Windows client | Tailscale Windows app | netbird CLI/service | netclient |
| Mobile client | Tailscale iOS/Android | NetBird iOS/Android | netclient (limited) |
| Console support (PS5/Xbox) | None native — subnet route | None native — subnet route | None native — subnet route |
| Docker management | Yes (v0.29.3 running) | Yes (running) | Yes (running) |
| Device limit | None (self-hosted) | Free tier limited | None (self-hosted) |
| Auth | Preauthkeys, OIDC | Setup keys, OIDC | API keys, users |
| DNS/MagicDNS | Optional (configurable) | Built-in | Configurable |
| Subnet routing | Yes (advertise routes) | Yes | Yes (gateway nodes) |
| CLI control | headscale CLI | netbird CLI | netmaker CLI/API |
| Complexity | Medium | Low-medium | High |
| Current status | RUNNING on 0.0.0.0:8080 | RUNNING on 0.0.0.0:80/443 | RUNNING on 0.0.0.0:8082 |
| Best fit | LAN-first fleet with Tailscale clients | Remote-access mesh / backup | Kubernetes-heavy or WireGuard-specific needs |

## Verdict
Headscale wins for this fleet: existing Tailscale clients, no external dependency when DERP disabled, no device limits, fully free and self-hosted.`,
    labels: [LABELS.sirGreen, LABELS.captainDashboard],
  },
]

function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null
    const options = {
      hostname: 'api.trello.com',
      port: 443,
      path: '/1' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }
    const req = https.request(options, res => {
      let text = ''
      res.on('data', chunk => (text += chunk))
      res.on('end', () => resolve({ status: res.statusCode, data: text }))
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function createCard(listId, card) {
  const qs = '?key=' + encodeURIComponent(KEY) + '&token=' + encodeURIComponent(TOKEN)
  const result = await request(qs, 'POST', {
    name: card.name,
    desc: card.desc,
    idList: listId,
    idLabels: card.labels,
  })
  console.log('CARD', result.status, result.data.id || result.data)
  await new Promise(r => setTimeout(r, 350))
}

async function main() {
  console.log('Creating', cards.length, 'cards on VOID Ops board...')
  for (const card of cards) {
    await createCard(card.list, card)
  }
  console.log('DONE')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
