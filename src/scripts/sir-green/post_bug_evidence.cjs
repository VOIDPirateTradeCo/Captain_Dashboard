const https = require('https')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const comments = [
  {
    cardId: '6a995da8800392754418a725',
    text: 'UPDATE: Master LAN auth path is now working. PINKCADY can reach `http://192.168.0.39:3100/api/auth/login` and gets 200 with `mc-session` cookie. If PINKCADY `/login` still redirects to `/setup`, the likely cause is a fresh local DB with zero users. Fix: run `/setup` on PINKCADY once to create an admin, or copy master `.data/mission-control.db` to PINKCADY so both instances share the same users.',
  },
  {
    cardId: '6a995da8264b963bb381346d',
    text: 'UPDATE: Password length policy is enforced in `src/lib/auth.ts` (`password.length < 12` throws). `captain` is blocked. Workaround: use a 12-char password for `/setup` on PINKCADY, e.g. `CaptainVoid2026!`. Long-term fix: relax local setup policy to 8 chars with a security note, or seed admin via `AUTH_PASS` env with a strong password.',
  },
  {
    cardId: '6a995daa12cfdc6ce0fcf643',
    text: 'RESOLVED. Root cause: `src/proxy.ts` host allowlist blocked non-localhost `Host` headers in production. `.env` had only `localhost,127.0.0.1,::1`. Fix applied: set `MC_ALLOWED_HOSTS=localhost,127.0.0.1,::1,192.168.0.39,100.83.247.14,100.106.235.103,192.168.0.180,100.110.238.68,192.168.0.68` in master `.env` and restarted. Live proof: `http://192.168.0.39:3100/api/auth/login` returns 200 + `mc-session` cookie from LAN.',
  },
  {
    cardId: '6a995dab124b30e5caaadba4',
    text: 'UPDATE: `next start` requires `.next` production build, which is absent after ZIP download. Verified workaround: `npx next dev --hostname 0.0.0.0 --port 3000` works after `npm rebuild better-sqlite3`. Long-term: add a documented `next build` step to PINKCADY bootstrap, or include `.next` in distribution.',
  },
  {
    cardId: '6a995dacfb6fff178dd6591c',
    text: 'RESOLVED for PINKCADY. Root cause: `better-sqlite3` native module compiled for Node NODE_MODULE_VERSION 127, runtime requires 137. Fix: `npm rebuild better-sqlite3` in `mission-control-fresh` before starting. Verified `/health` returns 200 db:ok after rebuild.',
  },
  {
    cardId: '6a995dad1fa3a3cadba9c935',
    text: 'UPDATE: STEALTHATTACK Tailscale `100.110.238.68:3000` is now OPEN 3ms from master after firewall rules applied. LAN `192.168.0.68:3000` still times out — likely ship-side firewall/listener issue. Next: verify STEALTHATTACK MC is running on `0.0.0.0:3000` and check local firewall on that ship.',
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

async function commentCard(cardId, text) {
  const path = `/1/cards/${encodeURIComponent(cardId)}/actions/comments?key=${encodeURIComponent(KEY)}&token=${encodeURIComponent(TOKEN)}`
  return request(path, 'POST', { text })
}

async function main() {
  for (const item of comments) {
    const result = await commentCard(item.cardId, item.text)
    console.log('COMMENT', result.status, item.cardId)
    await new Promise(r => setTimeout(r, 400))
  }
  console.log('DONE', comments.length)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
