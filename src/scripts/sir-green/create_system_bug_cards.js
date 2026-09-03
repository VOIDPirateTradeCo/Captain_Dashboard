import fs from 'fs'
import https from 'https'

const secretsPath = 'C:\\Users\\kidsm\\Documents\\My Docs\\VOID Pirate Trading Co\\Obsidian_Vault\\03_Business_Operations\\_Hub\\_KEY_VAULT\\secrets.env'
const secrets = {}
for (const rawLine of fs.readFileSync(secretsPath, 'utf8').split('\n')) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const idx = line.indexOf('=')
  if (idx === -1) continue
  secrets[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
}

const API_KEY = secrets.TRELLO_KEY
const TOKEN = secrets.TRELLO_TOKEN
const BOARD_ID = '6a595669b8f8f99c93392f4f'
const LIST_ID = '6a73abbf4539aaa060199c07'
const BASE = 'https://api.trello.com/1'

const CARDS = [
  { name: '[P1][SIR GREEN] Install unattended-upgrades/dnf-automatic', desc: 'Goal: fully working Mission Control dashboard.\nFix: Install unattended-upgrades on Debian/Ubuntu or dnf-automatic on RHEL/Fedora; enable automatic security updates.' },
  { name: '[P1][SIR GREEN] Encrypt data volumes with LUKS', desc: 'Goal: fully working Mission Control dashboard.\nFix: Enable LUKS encryption on data volumes; verify boot and backup recovery.' },
  { name: '[P1][SIR GREEN] Run chmod o-w on affected files', desc: 'Goal: fully working Mission Control dashboard.\nFix: Audit world-writable files and run chmod o-w; verify no sensitive files are world-writable.' },
  { name: '[P1][SIR GREEN] Enable AppArmor or SELinux', desc: 'Goal: fully working Mission Control dashboard.\nFix: Enable AppArmor or SELinux mandatory access control; verify profiles loaded and no denials on critical services.' },
  { name: '[P1][SIR GREEN] Install and enable fail2ban', desc: 'Goal: fully working Mission Control dashboard.\nFix: Install fail2ban, configure jails, enable and start service; verify banning works.' },
]

function req(pathOrUrl, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE}${pathOrUrl}`)
    url.searchParams.set('key', API_KEY)
    url.searchParams.set('token', TOKEN)
    if (opts.params) Object.entries(opts.params).forEach(([k, v]) => url.searchParams.set(k, v))
    const data = opts.body ? JSON.stringify(opts.body) : null
    const req = https.request(url, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } }, res => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }) } catch (e) { resolve({ status: res.statusCode, data: body }) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function main() {
  const labelRes = await req(`/boards/${BOARD_ID}/labels`, { params: { fields: 'id,name,color' } })
  const labels = Array.isArray(labelRes.data) ? labelRes.data : []
  const green = labels.find(l => (l.name || '').toLowerCase() === 'sir-green')
  const mission = labels.find(l => (l.name || '').toLowerCase() === 'mission control')
  const greenId = green?.id
  const missionId = mission?.id

  for (const card of CARDS) {
    const res = await req(`/cards`, {
      method: 'POST',
      params: {
        idList: LIST_ID,
        name: card.name,
        desc: card.desc,
        idLabels: [greenId, missionId].filter(Boolean).join(','),
      },
    })
    console.log(card.name, res.status, res.data?.id || res.data)
  }
}

main().catch(e => console.error(e))
