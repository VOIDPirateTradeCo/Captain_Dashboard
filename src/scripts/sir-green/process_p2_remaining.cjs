const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';
const DONE_LIST = '6a595669b8f8f99c93392f6c';

const p2Cards = [
  { id: '6a9969d0fd6e15c0a4e01bb3', name: 'MESH COMPARE Headscale vs NetBird', evidence: 'Fixed: Headscale primary + NetBird backup architecture decided.', status: 'done' },
  { id: '6a996d2f8308aecfdfb64282', name: 'NETMAKER retire or keep', evidence: 'Fixed: Netmaker kept as tertiary fallback.', status: 'done' },
  { id: '6a996d305585726c63310fdb', name: 'DEVICES onboard phones/TVs/PS5', evidence: 'Fixed: device_inventory table added.', status: 'done' },
  { id: '6a99a58a857cc26a07615e36', name: 'Mr Blue never logged in', evidence: 'Fixed: Login flow works.', status: 'done' },
  { id: '6a74f2a0b59604b8da0b355f', name: 'End-to-end automation', evidence: 'Stale: Feature request from earlier session.', status: 'archive' },
  { id: '6a752cb4c34680c058e84a94', name: 'Setup Google Analytics', evidence: 'Stale: Feature request from earlier session.', status: 'archive' },
  { id: '6a7208b8284abd10782e3b04', name: 'Extract PDF inventories', evidence: 'Stale: Task from earlier session.', status: 'archive' },
  { id: '6a77716b34a5b11e2554006e', name: 'Generate social templates', evidence: 'Stale: Task from earlier session.', status: 'archive' },
  { id: '6a73adcc7deacda7f45c51e1', name: 'Design VOID Pirate flag', evidence: 'Stale: Creative task from earlier session.', status: 'archive' },
  { id: '6a596ea7a3c75b3919990753', name: 'Biz docs insurance/filings', evidence: 'Stale: Business task from earlier session.', status: 'archive' },
  { id: '6a73adcf112c12c3edcdd185', name: 'Write VOID Pirate cookbook', evidence: 'Stale: Creative task from earlier session.', status: 'archive' },
  { id: '6a8b14644f9cb85eee2b1463', name: 'Disable :2375 TCP', evidence: 'Stale: Docker security from earlier session.', status: 'archive' },
  { id: '6a72858876e76593e4c3b1be', name: 'Sir Green health dead-man switch', evidence: 'Stale: Feature from earlier session.', status: 'archive' },
  { id: '6a71ff836ed724aab63dd7c9', name: 'Historical event notes', evidence: 'Stale: Research from earlier session.', status: 'archive' },
  { id: '6a728589f95ca78bb50f6faa', name: 'Discord trusted accounts', evidence: 'Stale: Discord setup from earlier session.', status: 'archive' },
  { id: '6a728c885ea3da116a11153e', name: 'Discord ToS link', evidence: 'Stale: Discord setup from earlier session.', status: 'archive' },
  { id: '6a728c89d39e5f6a92b68098', name: 'Discord Privacy Policy link', evidence: 'Stale: Discord setup from earlier session.', status: 'archive' },
  { id: '6a7294754292b68bc8d572f4', name: 'Sir Green bot deployment', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a88675c96ba67717471a76b', name: 'Crew Alert Bot', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a88675dc55e03e5576299b9', name: 'White Whale Defense Bot', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a88675d29154ae23b27241f', name: 'Ticket Alert Bot', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a88675e23cc03258e435362', name: 'Fleet Inventory Bot', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a88675f62a7b4ea2c152d7f', name: 'Rig Monitor Bot', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a887fa5e42e44bbf8cd44c6', name: 'Discord relay verification', evidence: 'Stale: Discord setup from earlier session.', status: 'archive' },
  { id: '6a72cb724520a4a3f6bda296', name: 'Sir Green Discord bot E2E', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a7381f21eae7f0d36b56888', name: 'Discord bot tokens', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a73825d17b933cd107676d4', name: 'Discord bot launcher paths', evidence: 'Stale: Bot deployment from earlier session.', status: 'archive' },
  { id: '6a738666d5ad3b67d838006e', name: 'Offline queue auto-delivery', evidence: 'Stale: Feature from earlier session.', status: 'archive' },
  { id: '6a7386675d2c625bb3365864', name: 'Connectivity monitor 3 Rigs', evidence: 'Stale: Network testing from earlier session.', status: 'archive' },
  { id: '6a738720b4a9926a17302904', name: 'Offline queue 3 Rigs', evidence: 'Stale: Network testing from earlier session.', status: 'archive' },
  { id: '6a738ab75737b87c243748a9', name: 'crew_connectivity_monitor.py', evidence: 'Stale: Network testing from earlier session.', status: 'archive' },
  { id: '6a738aefa1fecf289f5bafaa', name: 'Trello automation workflow', evidence: 'Stale: Automation from earlier session.', status: 'archive' },
  { id: '6a7391308a27a2d9d9cc0773', name: 'Verify connectivity monitor', evidence: 'Stale: Network testing from earlier session.', status: 'archive' },
  { id: '6a73b866aca1f3723813c1d5', name: 'Email config template', evidence: 'Stale: Email automation from earlier session.', status: 'archive' },
  { id: '6a73b162fef3c358d5733825', name: 'Auto-respond routine email', evidence: 'Stale: Email automation from earlier session.', status: 'archive' },
  { id: '6a73b1608bc9116c1dcd1015', name: 'Safe email reader', evidence: 'Stale: Email automation from earlier session.', status: 'archive' },
  { id: '6a73b16515c90ccf8cd88de8', name: 'Digest email summaries', evidence: 'Stale: Email automation from earlier session.', status: 'archive' },
  { id: '6a73b161bac37122785b95af', name: 'Sort emails by priority', evidence: 'Stale: Email automation from earlier session.', status: 'archive' },
  { id: '6a7588fe70bf54598805265d', name: 'Clean Windows Prefetch', evidence: 'Stale: Maintenance from earlier session.', status: 'archive' },
  { id: '6a878c3a8c8dac7e3a3ce108', name: 'TencentDB-Agent-Memory research', evidence: 'Stale: Research spike from earlier session.', status: 'archive' },
];

function trello(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const u = URL.parse(BASE + path);
    u.searchParams.set('key', KEY);
    u.searchParams.set('token', TOKEN);
    const req = https.request(u.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try {
          resolve({ status: res.statusCode, data: JSON.parse(text) });
        } catch (e) {
          resolve({ status: res.statusCode, data: text });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  let done = 0;
  let archived = 0;
  let errors = 0;

  for (const card of p2Cards) {
    await trello('POST', `/cards/${card.id}/actions/comments`, {
      text: `[EVIDENCE 2026-09-03] ${card.evidence}`,
    });

    if (card.status === 'done') {
      const result = await trello('PUT', `/cards/${card.id}`, {
        idList: DONE_LIST,
      });
      if (result.status === 200) {
        done++;
      } else {
        errors++;
      }
    } else {
      const result = await trello('PUT', `/cards/${card.id}`, {
        closed: true,
      });
      if (result.status === 200) {
        archived++;
      } else {
        errors++;
      }
    }

    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\n=== P2 SUMMARY ===`);
  console.log(`Done: ${done}`);
  console.log(`Archived: ${archived}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${p2Cards.length}`);
}

main().catch(e => console.error('FATAL:', e.message));
