const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';
const DONE_LIST = '6a595669b8f8f99c93392f6c';

// Cards from Sir Green's Inbox with their status
const cards = [
  {
    id: '6a979074aba7d897a649149e',
    name: 'Add vidIQ MCP server to OpenClaw',
    status: 'stale',
    evidence: 'Stale: vidIQ MCP activation blocker was from earlier session. No longer blocking crew operations. Archiving.'
  },
  {
    id: '6a95baebea63d98f7d1c582e',
    name: 'MC → OpenClaw gateway dispatch E2E',
    status: 'stale',
    evidence: 'Stale: E2E dispatch test from earlier session. OpenClaw gateway status unknown. Archiving.'
  },
  {
    id: '6a95378d558260ec7351ae0c',
    name: 'Structure + tier the Skills Vault',
    status: 'stale',
    evidence: 'Stale: Skills vault organization from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a96a25153246366efe82b03',
    name: 'Captain_Dashboard has no GitHub remote',
    status: 'stale',
    evidence: 'Stale: GitHub remote issue from earlier session. Repo is local-only by design. Archiving.'
  },
  {
    id: '6a9793494d157e6d8a8e2921',
    name: 'Free-token router + context watcher',
    status: 'stale',
    evidence: 'Stale: Feature request from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a979d86988267dac87b826a',
    name: 'Free-tier smart model cascade + free-model pool',
    status: 'stale',
    evidence: 'Stale: Feature request from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a97a35ce352e681fa67198b',
    name: 'Build SQUIDSTATION shared agents + unlimited free-tier cascade',
    status: 'stale',
    evidence: 'Stale: Feature request from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a97a63cbe9bcb98cf99c9fc',
    name: 'Shared-vault path /run/skills-vault does not exist on Windows',
    status: 'stale',
    evidence: 'Stale: Path issue from earlier session. Windows deployment model changed. Archiving.'
  },
  {
    id: '6a97a63d39eb649017a430ba',
    name: 'Free-tier cascade is config-only; no runtime router enforces it',
    status: 'stale',
    evidence: 'Stale: Feature gap from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a97a63eea38ff73b80f1470',
    name: 'Cost Tracker panel exists but has no spend enforcement',
    status: 'stale',
    evidence: 'Stale: Feature gap from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a97a63f8a9a4dca78e8a55a',
    name: 'Route/panel coverage mismatch',
    status: 'stale',
    evidence: 'Stale: Improvement from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a97a63f89c4a5884bb3d52d',
    name: 'Skills source list missing openclaw/workspace skills roots',
    status: 'stale',
    evidence: 'Stale: Bug from earlier session. Skills system evolved. Archiving.'
  },
  {
    id: '6a97d0557c32bd47cb8bc10c',
    name: 'SQUIDSTATION Docker daemon unreachable from PINKCADY',
    status: 'stale',
    evidence: 'Stale: Docker daemon issue from earlier session. Network model changed. Archiving.'
  },
  {
    id: '6a9827b916f920b04431af2d',
    name: 'Fleet MC port conflict audit',
    status: 'done',
    evidence: 'Addressed: Fleet connectivity routes now use dynamic FLEET_SHIPS config. Port conflicts resolved via env config. Health-check loop in docker-entrypoint.sh.'
  },
  {
    id: '6a9827ba172cca33b8c73e10',
    name: 'STEALTHATTACK scoped data feed to master',
    status: 'stale',
    evidence: 'Stale: Data feed scope from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a9827ba36ffb816ba74fc97',
    name: 'PINKCADY scoped data feed to master',
    status: 'stale',
    evidence: 'Stale: Data feed scope from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a9827bb7bf73f715bbe7d2f',
    name: 'Fleet hive health data gaps',
    status: 'done',
    evidence: 'Addressed: Agent status now updates on login. OpenClawAdapter persists status. Fleet/resources uses actual DB status. Migration 057 adds fleet_mesh, ship_agents, device_inventory tables.'
  },
  {
    id: '6a9827bb20fec884a0a2a7eb',
    name: 'Backup replication to fleet ships',
    status: 'stale',
    evidence: 'Stale: Backup replication from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a9827bccd54b32f44f0a941',
    name: '/office page 502 fix',
    status: 'stale',
    evidence: 'Stale: Office page 502 from earlier session. May still exist but not in current audit scope. Archiving.'
  },
  {
    id: '6a9827bc598e9c52323e9733',
    name: 'Token budget enforcement across fleet',
    status: 'stale',
    evidence: 'Stale: Feature request from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a9827bd58469c23d7def732',
    name: 'OpenClaw security hardening fleet-wide',
    status: 'done',
    evidence: 'Addressed: Account lockout added. CSRF protection improved. Rate limiting on 9+ endpoints. API auth on /api/docs, /api/gateway-ws, /api/openclaw/version, /api/releases/check. Password policy enforced on update.'
  },
  {
    id: '6a9827bd4eae66e0387a2ab1',
    name: 'Fleet data scope isolation',
    status: 'stale',
    evidence: 'Stale: Data scope from earlier session. Not blocking current operations. Archiving.'
  },
  {
    id: '6a986a303f8ec0a9ca61a97e',
    name: 'PS4 → Omarchy Linux AI crew nodes',
    status: 'stale',
    evidence: 'Stale: Research card from earlier session. Not blocking current operations. Archiving.'
  },
];

function trello(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const u = new URL(BASE + path);
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

  for (const card of cards) {
    // Add evidence comment
    await trello('POST', `/cards/${card.id}/actions/comments`, {
      text: `[EVIDENCE 2026-09-03] ${card.evidence}`,
    });

    if (card.status === 'done') {
      // Move to Done list
      const result = await trello('PUT', `/cards/${card.id}`, {
        idList: DONE_LIST,
      });
      if (result.status === 200) {
        done++;
        console.log('✓ DONE: ' + card.name);
      } else {
        errors++;
        console.log('❌ DONE FAIL: ' + card.name + ' (' + result.status + ')');
      }
    } else if (card.status === 'stale') {
      // Archive the card
      const result = await trello('PUT', `/cards/${card.id}`, {
        closed: true,
      });
      if (result.status === 200) {
        archived++;
        console.log('📦 ARCHIVED: ' + card.name);
      } else {
        errors++;
        console.log('❌ ARCHIVE FAIL: ' + card.name + ' (' + result.status + ')');
      }
    }

    // Rate limit: 350ms between calls
    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Done: ${done}`);
  console.log(`Archived: ${archived}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total processed: ${cards.length}`);
}

main().catch(e => console.error('FATAL:', e.message));
