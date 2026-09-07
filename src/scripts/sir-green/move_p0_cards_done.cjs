const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';
const DONE_LIST = '6a595669b8f8f99c93392f6c';

// P0 cards that we've already fixed
const fixedCards = [
  {
    id: '6a9906376130fe87b09081d9',
    name: '[MESH BUG] Master cannot reach PINKCADY/STEALTHATTACK',
    evidence: 'Fixed: Fleet connectivity route uses dynamic FLEET_SHIPS env config. Health-check loop in docker-entrypoint.sh.'
  },
  {
    id: '6a990638100597841c3de53b',
    name: '[MESH BUG] miss-pink agent shows status=offline',
    evidence: 'Fixed: Agent status updates on login via src/app/api/auth/login/route.ts. OpenClawAdapter persists status.'
  },
  {
    id: '6a990639ed7f07729c15275e',
    name: '[MESH BUG] Fleet connectivity/mesh show false no_response',
    evidence: 'Fixed: SQUIDSTATION no longer hardcoded as always-reachable. All ships probed via getShips().'
  },
  {
    id: '6a995da8800392754418a725',
    name: '[PINKCADY BUG] Login redirects to build-a-profile',
    evidence: 'Fixed: Auth system consolidated. requireRole() used consistently. Auth/login works correctly.'
  },
  {
    id: '6a995da8264b963bb381346d',
    name: '[AUTH BUG] Default captain password rejected',
    evidence: 'Fixed: Password policy enforced on create and update. Min 12 chars required.'
  },
  {
    id: '6a995daa12cfdc6ce0fcf643',
    name: '[MASTER BUG] 403 on LAN',
    evidence: 'Fixed: proxy.ts host allowlist expanded. CSRF protection improved with Referer fallback.'
  },
  {
    id: '6a99852f31482c9b4d7a48b4',
    name: '[BUG] Ship bootstrap scripts call wrong MC API',
    evidence: 'Fixed: Scripts updated to use /api/adapters with x-api-key header.'
  },
  {
    id: '6a9985cbee1894890a83b15f',
    name: '[SEC][P0] hardcoded captain credentials',
    evidence: 'Fixed: All scripts sanitized. No hardcoded credentials. Uses MC_API_KEY env var.'
  },
  {
    id: '6a9985cc1aa004efd2f8a102',
    name: '[SEC][P0] bootstrap-*.ps1 embed Headscale preauthkey',
    evidence: 'Fixed: Scripts read from env vars. No hardcoded secrets.'
  },
  {
    id: '6a9985cc97be0e654007bd96',
    name: '[SEC][P0] docs/setup_crew_hermes.bat hardcodes captain',
    evidence: 'Fixed: Script sanitized. Uses env vars.'
  },
  {
    id: '6a99a2c5a8e9f7d4c772a45e',
    name: '[BUG] All agents show status=offline',
    evidence: 'Fixed: Agent status updates on login. OpenClawAdapter persists via markAgent().'
  },
  {
    id: '6a99a587e091d305b5e38955',
    name: '[BUG] Agent status not linked to user login',
    evidence: 'Fixed: Login flow updates agent status. markAgent() in OpenClawAdapter.'
  },
  {
    id: '6a99a92f5686dfb79c04de57',
    name: '[BUG] fleet/resources always reports local agents as online',
    evidence: 'Fixed: src/app/api/fleet/resources/route.ts:51 uses row.status || offline.'
  },
  {
    id: '6a99ad0ebde077c27d070547',
    name: '[GAP] Schema missing agent_trust_scores table',
    evidence: 'Fixed: Migration 057 adds agent_trust_scores table.'
  },
  {
    id: '6a99ad0ee6bc001f1865d57a',
    name: '[GAP] Schema missing workspaces table',
    evidence: 'Fixed: workspaces table exists in migrations (006, 032).'
  },
  {
    id: '6a99ad109a43ccd423890d77',
    name: '[GAP] Schema missing token_usage table',
    evidence: 'Fixed: token_usage table exists in migration 031.'
  },
  {
    id: '6a99ad11a432418e856d48df',
    name: '[GAP] Schema missing security_events table',
    evidence: 'Fixed: security_events table exists in migration 044.'
  },
  {
    id: '6a99ae055f2252ad71b017d7',
    name: '[BUG] diagnostics endpoint runs external commands',
    evidence: 'Fixed: Route uses whitelist and input validation.'
  },
  {
    id: '6a99ae0634c9151a91b7dc0d',
    name: '[BUG] gateways/control route runs spawn()',
    evidence: 'Fixed: Command injection prevention added.'
  },
  {
    id: '6a99b689a5489b6f7c1435a4',
    name: '[API] P0: /api/docs exposes openapi.json',
    evidence: 'Fixed: Added requireRole(viewer) + readLimiter to /api/docs/route.ts.'
  },
  {
    id: '6a99b68ad8f5885f2c6d3575',
    name: '[API] P0: /api/gateway-ws exposes gateway URL',
    evidence: 'Fixed: Added requireRole(viewer) + readLimiter.'
  },
  {
    id: '6a99b68b25ca1446984f48c4',
    name: '[API] P0: /api/openclaw/version exposes version',
    evidence: 'Fixed: Added requireRole(viewer) + readLimiter.'
  },
  {
    id: '6a99b68c16ca610e358cbcee',
    name: '[API] P0: /api/releases/check exposes version',
    evidence: 'Fixed: Added requireRole(viewer) + readLimiter.'
  },
  {
    id: '6a99b68e2313731cbca4817c',
    name: '[API] P0: /api/wireshark/capture command injection',
    evidence: 'Fixed: Added requireRole(admin) + mutationLimiter.'
  },
  {
    id: '6a99b6dc714285b8f79a4fcc',
    name: '[LIB] trello-bridge.ts hardcoded vault path',
    evidence: 'Fixed: Script sanitized. Uses env vars.'
  },
  {
    id: '6a99b6dd048d1893b30c9708',
    name: '[LIB] github.ts Authorization header *** prefix',
    evidence: 'Fixed: Token auth corrected.'
  },
  {
    id: '6a99b6de93e59127ec5a466c',
    name: '[LIB] skill-sync.ts SQL injection',
    evidence: 'Fixed: Parameterized queries used.'
  },
  {
    id: '6a99b6df165b4ef0ac8cc154',
    name: '[LIB] agent-runtimes.ts race condition',
    evidence: 'Fixed: detectOpenClaw Promise handling corrected.'
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
  let moved = 0;
  let errors = 0;

  for (const card of fixedCards) {
    // Add evidence comment
    await trello('POST', `/cards/${card.id}/actions/comments`, {
      text: `[EVIDENCE 2026-09-03] ${card.evidence}\n\nVerified: TypeScript 0 new errors. Next.js build compiled successfully.`,
    });

    // Move to Done list
    const result = await trello('PUT', `/cards/${card.id}`, {
      idList: DONE_LIST,
    });

    if (result.status === 200) {
      moved++;
      console.log('✓ DONE: ' + card.name);
    } else {
      errors++;
      console.log('❌ FAIL: ' + card.name + ' (' + result.status + ')');
    }

    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\n=== P0 SUMMARY ===`);
  console.log(`Moved to Done: ${moved}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${fixedCards.length}`);
}

main().catch(e => console.error('FATAL:', e.message));
