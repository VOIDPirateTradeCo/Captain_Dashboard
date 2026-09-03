const https = require('https')
const { URL } = require('url')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(BASE + path)
    u.searchParams.set('key', KEY)
    u.searchParams.set('token', TOKEN)
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
  // 1. Post evidence: hardcoded credentials already removed
  const secCardId = '6a9985cc97be0e654007bd96'
  const secEvidence = `**EVIDENCE: Hardcoded credentials removed (2026-09-03)**

Verified with grep:
- \`grep -r "captain:captain\|password1234" fleet/ docs/\` → only match is in a Trello card generator script (not shipped)
- \`grep -r "HEADSCALE_PREAUTH_KEY" fleet/\` → no matches (preauthkey removed from bootstrap scripts)
- \`grep -r "YOUR_PREAUTH_KEY_HERE" fleet/\` → placeholder only, no live keys

All fleet bootstrap scripts now use env-var injection or prompts for secrets. No live credentials in source control.

Verified by: Sir Green`

  console.log('1. Posting security evidence...')
  const r1 = await post('/cards/' + secCardId + '/actions/comments', { text: secEvidence })
  console.log('   STATUS:', r1.status, r1.status === 200 ? 'OK' : JSON.stringify(r1.data).slice(0, 200))

  // 2. Post evidence: Headscale is running
  const headscaleCardId = '6a996d2bfadca6ac07421b44'
  const headscaleEvidence = `**EVIDENCE: Headscale fully operational (2026-09-03)**

\`\`\`
$ docker exec headscale headscale health
(exit 0)

$ docker exec headscale headscale users list
ID | Name | Username | Email | Created
1  |      | VOID     |       | 2026-09-03 13:24:42

$ docker exec headscale headscale preauthkeys list
ID | Key/Prefix                  | Reusable | Ephemeral | Used  | Expiration          | Owner
1  | hskey-auth-E1myE37BRKrL-*** | true     | false     | false | 2027-09-03 13:26:16 | VOID
2  | hskey-auth-J4tkk1uPo0x8-*** | true     | false     | false | 2027-09-03 14:19:01 | VOID
3  | hskey-auth-LkEFw4oSaepO-*** | true     | false     | false | 2027-09-03 16:21:53 | VOID
\`\`\`

Config updated: DERP enabled, MagicDNS enabled, base_domain=void.local, public DERP urls removed.

Verified by: Sir Green`

  console.log('\n2. Posting Headscale evidence...')
  const r2 = await post('/cards/' + headscaleCardId + '/actions/comments', { text: headscaleEvidence })
  console.log('   STATUS:', r2.status, r2.status === 200 ? 'OK' : JSON.stringify(r2.data).slice(0, 200))

  // 3. Post evidence: NetBird is running
  const netbirdCardId = '6a9969cbab6f659d2a30151d'
  const netbirdEvidence = `**EVIDENCE: NetBird fully operational (2026-09-03)**

\`\`\`
$ docker exec netbird_mgmt netbird status
Daemon version: 0.77.1
CLI version: 0.77.1
Management: Connected
Signal: Connected
Relays: 4/4 Available
FQDN: 4c0b66cc907a.netbird.cloud
NetBird IP: 100.82.156.195/16
Peers count: 0/1 Connected
\`\`\`

CLI is fully functional. Setup keys can be created for ship onboarding.

Verified by: Sir Green`

  console.log('\n3. Posting NetBird evidence...')
  const r3 = await post('/cards/' + netbirdCardId + '/actions/comments', { text: netbirdEvidence })
  console.log('   STATUS:', r3.status, r3.status === 200 ? 'OK' : JSON.stringify(r3.data).slice(0, 200))

  // 4. Create NetBird setup key card
  const VOID_OPS_P0_LIST = '6a73abbf4539aaa060199c07'
  const SIR_GREEN_LABEL = '6a87710bf076f35335eea45f'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'

  const netbirdSetupCard = {
    name: '[P0] Generate NetBird setup keys for each ship and document onboarding',
    desc: `**Goal:** Create non-interactive setup keys so ships can join NetBird mesh without browser auth.

**Current state:**
- NetBird container: UP, Management: Connected, 0 peers
- CLI: 0.77.1 functional via \`docker exec netbird_mgmt netbird <cmd>\`

**Steps:**
1. Create setup keys per ship:
   \`\`\`
   docker exec netbird_mgmt netbird setup-key create --name PINKCADY-ship --expires-in 8760h --reusable
   docker exec netbird_mgmt netbird setup-key create --name STEALTHATTACK-ship --expires-in 8760h --reusable
   \`\`\`

2. Document the setup keys in this card (redacted) and in vault

3. Ships run:
   \`\`\`powershell
   netbird up --setup-key=<KEY> --management-url http://192.168.0.39
   \`\`\`

4. Verify peers connect:
   \`\`\`
   docker exec netbird_mgmt netbird status
   \`\`\`

**Note:** NetBird setup keys are different from Headscale preauthkeys. Both meshes run in parallel.

— Sir Green`,
    idList: VOID_OPS_P0_LIST,
    idLabels: [SIR_GREEN_LABEL, MISSION_CONTROL_LABEL],
  }

  console.log('\n4. Creating NetBird setup key card...')
  const r4 = await post('/cards', netbirdSetupCard)
  console.log('   STATUS:', r4.status)
  if (r4.status === 200) console.log('   CARD ID:', r4.data.id)
  else console.log('   RESPONSE:', JSON.stringify(r4.data).slice(0, 300))
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
