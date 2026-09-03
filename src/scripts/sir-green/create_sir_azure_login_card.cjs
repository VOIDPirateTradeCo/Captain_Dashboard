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
  // ===== 1. Sir Azure Ops: Login card =====
  const SIR_AZURE_BOARD = '6a839af9b5e7e56792d25e30'
  const TO_DO_LIST = '6a839af9b5e7e56792d25e8e'
  const P0_LABEL = '6a83ea703aaa717427d3aef3'
  const SIR_AZURE_LABEL = '6a87713ccc874b87cade3f68'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'

  const sirAzureCard = {
    name: '[SIR AZURE] Login to master Mission Control — your account is ready',
    desc: [
      '**Welcome to the fleet, Sir Azure!**',
      '',
      'Your master Mission Control account has been created. You have full admin access to the Pirate Captain\'s Dashboard.',
      '',
      '**Login credentials:**',
      '- **URL:** https://192.168.0.39:3100',
      '- **Username:** sirazure',
      '- **Password:** password1234!@',
      '- **Role:** admin',
      '',
      '**What to do first:**',
      '1. Open https://192.168.0.39:3100 in your browser',
      '2. Login with the credentials above',
      '3. Accept the self-signed certificate warning (this is our private cert)',
      '4. Verify you can see the dashboard with all panels',
      '',
      '**After login, report back:**',
      '- Screenshot of your dashboard',
      '- Run in browser console: `fetch("/api/auth/me").then(r=>r.json()).then(d=>console.log(d))`',
      '',
      '**Security note:** This is a shared admin account for initial fleet setup. We will be setting up individual role-based access policies soon. Do not share these credentials outside the crew.',
      '',
      '— Sir Green'
    ].join('\n'),
    idList: TO_DO_LIST,
    idLabels: [P0_LABEL, SIR_AZURE_LABEL, MISSION_CONTROL_LABEL],
  }

  console.log('1. Creating Sir Azure login card...')
  const r1 = post('/cards', sirAzureCard)
  r1.then(result => {
    console.log('   STATUS:', result.status)
    if (result.status === 200) {
      console.log('   CARD ID:', result.data.id)
      console.log('   CARD URL:', result.data.url || 'https://trello.com/c/' + result.data.id)
    } else {
      console.log('   RESPONSE:', JSON.stringify(result.data).substring(0, 300))
    }
  })

  // ===== 2. VOID Ops: User access policy card =====
  const VOID_OPS_BOARD = '6a595669b8f8f99c93392f4f'
  // Find the right list - use "P0 - Critical" or create in "Sir Green's Inbox"
  // First check what lists are available
  console.log('\n2. Fetching VOID Ops lists to find the right place for the access policy card...')
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
