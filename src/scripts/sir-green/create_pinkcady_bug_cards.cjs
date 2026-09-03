const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'
const BOARD = '6a595669b8f8f99c93392f4f'
const LIST = '6a73abbf4539aaa060199c07'
const LABELS = [
  '6a74dd63452761014e981f23',
  '6a851536d3bdf66aac59cf9c',
  '6a5d497ef3dd03fd20be42fc',
]

const cards = [
  {
    name: '[PINKCADY BUG] Login redirects to build-a-profile/setup instead of existing admin login',
    desc:
      'Live symptom: `http://localhost:3000/login` on PINKCADY does not accept `captain`/`captain`; instead Miss Pink is asked to build a new profile. Root-cause candidates: (1) fresh DB has zero users, so `needsFirstTimeSetup()` redirects to `/setup`; (2) fresh instance is using a different data dir than master. Fix: verify `mission-control-fresh/.data/mission-control.db` user count, seed/create admin via `/setup` or API, then confirm `/login` works.',
  },
  {
    name: '[AUTH BUG] Default `captain` password rejected by minimum-length policy',
    desc:
      'Code evidence: `src/lib/auth.ts` has `if (password.length < 12) throw new Error("Password must be at least 12 characters")`. That blocks `captain` and any short seeded password. Fix options: keep policy but seed via env with a strong password; or relax min length to 8 for local admin setup only, with a security note.',
  },
  {
    name: '[MASTER BUG] 403 on LAN `192.168.0.39:3100/api/auth/login` — default-deny host allowlist',
    desc:
      'Code evidence: `src/proxy.ts` enforces host allowlist in production. `.env` only had `localhost,127.0.0.1,::1`, so LAN/Tailscale `Host: 192.168.0.39:3100` is rejected before auth. Fix applied: set `MC_ALLOWED_HOSTS` to include LAN/Tailscale IPs, then restart master.',
  },
  {
    name: '[PINKCADY BUG] `next start` fails because no production build; `next dev` works but requires rebuild workflow',
    desc:
      'Live evidence: `mission-control-fresh` has no `.next` production build after ZIP download. `next start` errors with `production-start-no-build-id`. `next dev` succeeds after `npm rebuild better-sqlite3`. Fix: standardize PINKCADY startup to `npx next dev --hostname 0.0.0.0 --port 3000` for now, or add a documented build step before start.',
  },
  {
    name: '[PINKCADY BUG] `better-sqlite3` native module mismatch after fresh ZIP/node install',
    desc:
      'Live evidence: `better-sqlite3` compiled for NODE_MODULE_VERSION 127, runtime requires 137. Error on `/health` until `npm rebuild better-sqlite3`. Fix applied in verified steps; need to bake into PINKCADY bootstrap so fresh clones don’t hit this.',
  },
  {
    name: '[MESH BLOCKER] STEALTHATTACK still unreachable from master after firewall rules applied',
    desc:
      'Live proof: master TCP probes to `100.110.238.68:3000` and `192.168.0.68:3000` still timeout after 5s. PINKCADY is OPEN. SQUIDSTATION is healthy. Firewall rules `TEMP-ALLOW-FLEET-ALL` applied on STEALTHATTACK but no change. Next step: ship-side diagnostics on STEALTHATTACK to verify MC listener, port, and local firewall state.',
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

async function createCard(card) {
  const path = `/1/cards?key=${encodeURIComponent(KEY)}&token=${encodeURIComponent(TOKEN)}`
  return request(path, 'POST', {
    name: card.name,
    desc: card.desc,
    idList: LIST,
    idLabels: LABELS,
  })
}

async function main() {
  for (const card of cards) {
    const result = await createCard(card)
    console.log('CARD', result.status, result.data?.id || result.data)
    await new Promise(r => setTimeout(r, 400))
  }
  console.log('DONE', cards.length)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
