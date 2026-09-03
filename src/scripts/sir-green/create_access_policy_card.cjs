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
  // VOID Ops: User access policy card
  const VOID_OPS_P0_LIST = '6a73abbf4539aaa060199c07'
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'
  const P0_LABEL = '6a83ea703aaa717427d3aef3'  // This is from Sir Azure board, need VOID Ops P0 label

  // For VOID Ops, use the board's own labels
  // sir-green: 6a87710bf076f35335eea45f, mission control: 6a97a358ba401f0b04f58a92
  // P0: need to check VOID Ops labels

  const accessPolicyCard = {
    name: '[P0] Build granular user access policies for Mission Control profiles',
    desc: [
      '**Goal:** Replace shared admin accounts with role-based access control (RBAC) for each crew profile.',
      '',
      '**Current state:**',
      '- All crew use shared admin accounts (sirgreen, sirazure, miss-pink all have admin)',
      '- No granular permissions per profile',
      '- No audit trail per user',
      '',
      '**Target state:**',
      '| Profile | Role | Permissions |',
      '|---------|------|-------------|',
      '| captain | owner | all |',
      '| sir-green | admin | all |',
      '| sir-azure | operator | code, review, art, gpu |',
      '| miss-pink | operator | ops, torus, dashboard |',
      '| sir-cobalt | operator | code, review, research |',
      '| sir-violet | viewer | research, intel |',
      '| mr-blue | viewer | code, review |',
      '',
      '**Implementation plan:**',
      '1. Add `role` column to users table (if not exists)',
      '2. Define permission matrix per role',
      '3. Add `requirePermission()` middleware to API routes',
      '4. Update all `/api/` routes to check permissions',
      '5. Add UI: Settings → Users → Role management',
      '6. Audit log: track who did what',
      '',
      '**Security requirements:**',
      '- Never expose .env/secrets to non-admin roles',
      '- Captain approves role changes',
      '- All auth events logged',
      '- Session timeout after 30min inactivity',
      '',
      '— Sir Green'
    ].join('\n'),
    idList: VOID_OPS_P0_LIST,
    idLabels: [SIR_GREEN_LABEL, MISSION_CONTROL_LABEL],
  }

  console.log('Creating VOID Ops access policy card...')
  const result = await post('/cards', accessPolicyCard)
  console.log('STATUS:', result.status)
  if (result.status === 200) {
    console.log('CARD ID:', result.data.id)
    console.log('CARD URL:', result.data.url || 'https://trello.com/c/' + result.data.id)
  } else {
    console.log('RESPONSE:', JSON.stringify(result.data).substring(0, 300))
  }
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
