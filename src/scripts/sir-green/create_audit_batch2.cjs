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
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
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
  const VOID_OPS_P1_LIST = '6a73abbf8482da2937217d6f'
  const VOID_OPS_P2_LIST = '6a73abbf275aa5c96ab03e67'
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'
  const BUG_LABEL = '6a839af9b5e7e56792d25e9c'

  const cards = [
    {
      name: '[BUG] Agent status not linked to user login — Miss Pink logged in but miss-pink agent still offline',
      desc: `**Finding (2026-09-03):**

Miss Pink (username: misspink, id: 3) logged in at timestamp 1788449236 but the miss-pink agent (id: 8) still shows status=offline with last_seen 1788287856.

**Users table:**
| ID | Username | Display Name | Role | Last Login |
|----|----------|--------------|------|------------|
| 1 | admin | Admin | admin | 1788260143 |
| 2 | captain | Captain Brewbeard | admin | 1788448679 |
| 3 | misspink | Miss Pink | admin | 1788449236 |
| 4 | sirazure | Sir Azure | admin | NEVER |
| 5 | sirgreen | Sir Green | admin | 1788454219 |
| 6 | mrblue | Mr Blue | operator | NEVER |

**Agents table:**
| ID | Name | Status | Last Seen |
|----|------|--------|-----------|
| 8 | miss-pink | offline | 1788287856 |
| 6 | sir-azure | offline | 1788287856 |
| 3 | sir-green | offline | 1788279184 |

**Root cause:**
- User login does NOT update agent status
- Agents need separate heartbeat mechanism
- No heartbeat daemon running

**Fix required:**
- On login, update corresponding agent status to "online"
- Deploy heartbeat daemon on each ship
- Or: create agents for users who don't have them (sir-green user has no agent)`,
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Username mismatch: user is "misspink" but agent is "miss-pink" — naming inconsistency',
      desc: `**Finding (2026-09-03):**

The user account is "misspink" but the agent is "miss-pink". This creates confusion and potential bugs.

**Affected:**
- User: misspink (id: 3) → Agent: miss-pink (id: 8)
- User: sirazure (id: 4) → Agent: sir-azure (id: 6)
- User: sirgreen (id: 5) → Agent: sir-green (id: 3)
- User: mrblue (id: 6) → Agent: mr-blue (id: 9)

**Recommendation:**
- Standardize naming: usernames should match agent names
- Use lowercase-no-space or kebab-case consistently
- Create agent for sirgreen user (currently no agent)
- Document the user-agent mapping`,
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Sir Azure has never logged in — needs to use sirazure/password1234!@',
      desc: `**Finding (2026-09-03):**

User sirazure (id: 4) has last_login_at: null. Account created but never used.

**Action needed for Sir Azure:**
1. Login to https://192.168.0.39:3100
2. Username: sirazure
3. Password: password1234!@
4. Verify dashboard access

**After login, agent sir-azure (id: 6) should show status=online if heartbeat system is fixed.**`,
      idList: VOID_OPS_P1_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] No heartbeat daemon running — agents never update status',
      desc: `**Finding (2026-09-03):**

No heartbeat daemon or cron job is running on any ship to update agent status. The /api/agents/:id/heartbeat endpoint exists but nothing calls it.

**Current state:**
- All agents show offline
- last_seen timestamps are days old
- No automated status reporting

**Solution needed:**
- Deploy heartbeat daemon on each ship (PowerShell scheduled task or systemd timer)
- Heartbeat should run every 5 minutes
- Should also report system stats (CPU, memory, disk)
- Should report mesh IP and connectivity status`,
      idList: VOID_OPS_P0_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] No ship-to-master stats reporting — PINKCADY/STEALTHATTACK health unknown',
      desc: `**Finding (2026-09-03):**

Master MC cannot pull health/stats from ship MCs. Only SQUIDSTATION (self) and STEALTHATTACK Tailscale health are confirmed.

**Missing data:**
- PINKCADY: unreachable on both LAN and Tailscale
- STEALTHATTACK LAN: unreachable
- No ship resource reporting (CPU, memory, disk, MC version)
- No ship MC health status on dashboard

**Action needed:**
- Fix PINKCADY MC connectivity
- Fix STEALTHATTACK LAN firewall
- Deploy stats collector on each ship
- Report to master via /api/adapters or dedicated stats endpoint`,
      idList: VOID_OPS_P1_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Mr Blue account created but never logged in — needs onboarding',
      desc: `**Finding (2026-09-03):**

User mrblue (id: 6, role: operator) was created but last_login_at: null.

**Action needed:**
- Mr Blue needs to login with mrblue/password1234!@
- Verify agent mr-blue (id: 9) status updates
- Assign to Lady Seraphine phone or appropriate device`,
      idList: VOID_OPS_P2_LIST,
      idLabels: [MISSION_CONTROL_LABEL],
    },
  ]

  let created = 0
  for (const card of cards) {
    const result = await post('/cards', card)
    if (result.status === 200) {
      created++
      console.log('✅', card.name.slice(0, 70))
      console.log('   ID:', result.data.id)
    } else {
      console.log('❌', card.name.slice(0, 70))
      console.log('   STATUS:', result.status, JSON.stringify(result.data).slice(0, 200))
    }
    await new Promise(r => setTimeout(r, 350))
  }

  console.log(`\n=== DONE: ${created}/${cards.length} cards created ===`)
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
