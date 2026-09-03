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
      name: '[GAP] Schema missing agent_trust_scores table — security-events.ts references it',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/security-events.ts references `agent_trust_scores` table but it does NOT exist in schema.sql or migrations.\n\n**Impact:** Security event logging will fail silently. Trust scores not persisted.\n\n**Fix:** Add migration to create agent_trust_scores table.',
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing workspaces table — auth.ts references it',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/auth.ts queries `workspaces` table but it does NOT exist in schema.sql.\n\n**Impact:** Workspace isolation broken. All queries fail.\n\n**Fix:** Add workspaces table to schema.',
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing projects table — tasks reference project_id',
      desc: '**Finding (2026-09-03):**\n\ntasks table has `project_id` column but no `projects` table exists.\n\n**Impact:** Project-based task organization broken.\n\n**Fix:** Add projects table to schema.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing sessions table — gateway sessions not persisted',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/sessions.ts reads gateway session files but no `sessions` table in DB.\n\n**Impact:** Sessions not searchable, filterable, or persistable across restarts.\n\n**Fix:** Add sessions table for metadata indexing.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing token_usage table — tokens route references it',
      desc: '**Finding (2026-09-03):**\n\nsrc/app/api/tokens/route.ts has `token_usage` table but it does NOT exist in schema.sql.\n\n**Impact:** Token tracking broken. Cost monitoring fails.\n\n**Fix:** Add token_usage table to schema.',
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing security_events table — security-events.ts references it',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/security-events.ts inserts into `security_events` table but it does NOT exist in schema.sql.\n\n**Impact:** Security events not logged. No audit trail.\n\n**Fix:** Add security_events table to schema.',
      idList: VOID_OPS_P0_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing agent_keys table — per-agent API keys not implemented',
      desc: '**Finding (2026-09-03):**\n\nauth.ts mentions agent-scoped API keys but no `agent_keys` table exists.\n\n**Impact:** Only global API key works. No per-agent least-privilege access.\n\n**Fix:** Add agent_keys table, implement key generation per agent.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing fleet_mesh table — mesh state not persisted',
      desc: '**Finding (2026-09-03):**\n\nNo table to store mesh network state, peer status, or routing info.\n\n**Impact:** Fleet mesh state lost on restart. No historical connectivity data.\n\n**Fix:** Add fleet_mesh table for mesh state persistence.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing ship_agents table — ship-agent mapping not persisted',
      desc: '**Finding (2026-09-03):**\n\nNo table to map agents to ships. Agent.ship field is in config JSON only.\n\n**Impact:** Cannot query "which agents are on which ship". Fleet panel limited.\n\n**Fix:** Add ship_agents table or ship column to agents table.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[GAP] Schema missing device_inventory table — LAN devices not tracked',
      desc: '**Finding (2026-09-03):**\n\nNo table to store discovered LAN devices, their types, or onboarding status.\n\n**Impact:** Device onboarding not tracked. No network inventory.\n\n**Fix:** Add device_inventory table for LAN device tracking.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Session token stored as SHA-256 hash without salt — rainbow table risk',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/auth.ts hashSessionToken():\n```typescript\nfunction hashSessionToken(rawToken: string): string {\n  return createHash("sha256").update(rawToken).digest("hex")\n}\n```\n\n**Problem:** No salt. If DB is leaked, session tokens can be rainbow-tabled.\n\n**Fix:** Use HMAC with server-side pepper, or store token hash with per-token salt.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] Session duration is 7 days — too long for security',
      desc: '**Finding (2026-09-03):**\n\nsrc/lib/auth.ts: `const SESSION_DURATION = 7 * 24 * 60 * 60` (7 days)\n\n**Problem:** Stolen session token valid for 7 days. No refresh mechanism.\n\n**Fix:** Reduce to 24h with sliding refresh, or implement token rotation.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] updateUser does not validate password length',
      desc: '**Finding (2026-09-03):**\n\ncreateUser requires 12+ char password. updateUser (change password) has NO length validation.\n\n**Impact:** Admin can set weak passwords via API. Inconsistent policy.\n\n**Fix:** Add password length validation to updateUser.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No rate limiting on user creation — admin can be flooded',
      desc: '**Finding (2026-09-03):**\n\nPOST /api/auth/users has identitySecurityMutationLimiter but it is per-admin-ID, not per-IP.\n\n**Impact:** Comprominated admin account can create unlimited users.\n\n**Fix:** Add per-IP rate limiting on user creation.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No audit trail for agent actions — agents not linked to users',
      desc: '**Finding (2026-09-03):**\n\naudit_log table exists but agent actions are not logged. No user_id column in agents table.\n\n**Impact:** Cannot trace which user performed which action. No accountability.\n\n**Fix:** Add user_id to agents table, log agent actions to audit_log.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] Foreign key constraints missing in some tables',
      desc: '**Finding (2026-09-03):**\n\nSome tables lack foreign keys:\n- messages: no FK to conversations\n- activities: no FK to entities\n- notifications: no FK to source\n\n**Impact:** Orphaned records. Data integrity issues.\n\n**Fix:** Add foreign key constraints where appropriate.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No index on users.last_login_at — slow login queries',
      desc: '**Finding (2026-09-03):**\n\nusers table has no index on last_login_at. Querying "recently active users" is slow.\n\n**Impact:** Admin panel slow with many users.\n\n**Fix:** Add index on last_login_at.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] No remember me / session refresh mechanism',
      desc: '**Finding (2026-09-03):**\n\nSessions are 7 days then expire. No refresh token, no remember me.\n\n**Impact:** Users logged out after 7 days. Poor UX.\n\n**Fix:** Implement refresh tokens or sliding session expiry.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[BUG] API key is global — no per-agent least privilege',
      desc: '**Finding (2026-09-03):**\n\nmatchesGlobalApiKey() checks against single global key. Agent-scoped keys mentioned in comments but not implemented.\n\n**Impact:** Any agent with API key has full access. No least-privilege.\n\n**Fix:** Implement per-agent API keys with scoped permissions.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] No workspace isolation in many API routes',
      desc: '**Finding (2026-09-03):**\n\nMany routes check requireRole but not workspace_id. Cross-workspace data leak possible.\n\n**Impact:** Multi-tenant isolation broken. One tenant can see another data.\n\n**Fix:** Add workspace_id filter to all queries.',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
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
