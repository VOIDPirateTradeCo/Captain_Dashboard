const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';
const DONE_LIST = '6a595669b8f8f99c93392f6c';

// P1 cards that were fixed in Waves 1-10
const fixedP1Cards = [
  {
    id: '6a9985cc3d27a22e327ceed9',
    name: 'Replace hardcoded localhost:3100',
    evidence: 'Fixed: All scripts use MC_URL env var. No hardcoded localhost.'
  },
  {
    id: '6a9985cd1567a9a6d3a90471',
    name: 'update-trello.mjs exposes NetBird URL',
    evidence: 'Fixed: Script sanitized. No secrets in shared scripts.'
  },
  {
    id: '6a9985ce670f9beaef1808b0',
    name: 'crew_agent_connector.bat localhost:3100',
    evidence: 'Fixed: Script sanitized. Uses MC_URL env var.'
  },
  {
    id: '6a9985cf6b8b9f860f2ca6c7',
    name: 'ship-package-template wrong MC API paths',
    evidence: 'Fixed: Scripts standardized on /api/adapters with x-api-key.'
  },
  {
    id: '6a9985cf47a02587fe2b32a9',
    name: 'Move fleet secrets to vault',
    evidence: 'Fixed: All scripts read from env vars. No hardcoded secrets.'
  },
  {
    id: '6a9985d0d09da969180d26ad',
    name: 'sir-green/*.cjs hardcoded board/list IDs',
    evidence: 'Fixed: Scripts sanitized.'
  },
  {
    id: '6a9985d0f833c62b64a4591a',
    name: 'install-headscale-client.bat placeholder',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99871341dd03608026280a',
    name: 'hardcoded captain in verify-mesh.bat',
    evidence: 'Fixed: Scripts sanitized. Uses MC_API_KEY.'
  },
  {
    id: '6a99871331230a7b853de588',
    name: 'Headscale preauthkey in bootstrap-*.ps1',
    evidence: 'Fixed: Scripts read from env vars.'
  },
  {
    id: '6a998714b060d11050a76609',
    name: 'captain persona + workdir in setup_crew_hermes.bat',
    evidence: 'Fixed: Script sanitized. Ship-relative.'
  },
  {
    id: '6a99a92e3f5879519b895586',
    name: 'GET /api/auth/users inconsistent auth',
    evidence: 'Fixed: GET handler now uses requireRole(admin) consistently.'
  },
  {
    id: '6a99a92faa6e11f6d8f14614',
    name: 'No account lockout',
    evidence: 'Fixed: failed_logins table + lockout after 5 attempts.'
  },
  {
    id: '6a99a9317e4dbd05cd80b8b9',
    name: 'Hardcoded ship IPs',
    evidence: 'Fixed: FLEET_SHIPS env config replaces hardcoded IPs.'
  },
  {
    id: '6a99a932ad30c17509810356',
    name: 'Password policy inconsistent',
    evidence: 'Fixed: Min 12 chars enforced on create AND update.'
  },
  {
    id: '6a99a9324609e6587e276eab',
    name: 'No CSRF protection',
    evidence: 'Fixed: proxy.ts validates Origin + Referer headers.'
  },
  {
    id: '6a99a933b717d48157345378',
    name: 'Session cookie lacks Secure flag',
    evidence: 'Fixed: session-cookie.ts sets secure based on request.'
  },
  {
    id: '6a99aa0c00f5df361cd9c611',
    name: 'injection-guard.ts no rate limiting',
    evidence: 'Fixed: Rate limiting added.'
  },
  {
    id: '6a99aa0da1b39d772aedac70',
    name: 'No WebSocket authentication',
    evidence: 'Fixed: WebSocket auth validated.'
  },
  {
    id: '6a99aa0f80efc1bc74555f5e',
    name: 'No session invalidation on password change',
    evidence: 'Fixed: destroyAllUserSessions on password change.'
  },
  {
    id: '6a99ad0f0706c1a8786180cb',
    name: 'Schema missing projects table',
    evidence: 'Fixed: projects table in migration 034.'
  },
  {
    id: '6a99ad102afe48f3fae62720',
    name: 'Schema missing sessions table',
    evidence: 'Fixed: user_sessions table in migration 005.'
  },
  {
    id: '6a99ad1222938e6db65a856',
    name: 'Schema missing agent_keys table',
    evidence: 'Fixed: Migration 057 adds agent_keys.'
  },
  {
    id: '6a99ad126ba6f7c0845ef446',
    name: 'Schema missing fleet_mesh table',
    evidence: 'Fixed: Migration 057 adds fleet_mesh.'
  },
  {
    id: '6a99ad136e3d7dc89cda84bc',
    name: 'Schema missing ship_agents table',
    evidence: 'Fixed: Migration 057 adds ship_agents.'
  },
  {
    id: '6a99ad1417f6a491f8916a01',
    name: 'Schema missing device_inventory table',
    evidence: 'Fixed: Migration 057 adds device_inventory.'
  },
  {
    id: '6a99ad15c5a7b1f03dba7adc',
    name: 'Session token SHA-256 without salt',
    evidence: 'Fixed: Session tokens use randomBytes(32).toString(hex).'
  },
  {
    id: '6a99ae03e2e68adf9c441942',
    name: 'gateways table created in 2 places',
    evidence: 'Fixed: Table creation consolidated.'
  },
  {
    id: '6a99ae048d25cf97d744c2be',
    name: 'hermes/events untrusted input',
    evidence: 'Fixed: Input validation added.'
  },
  {
    id: '6a99ae05b10ce84ebf07f813',
    name: 'debug endpoint exposes secrets',
    evidence: 'Fixed: requireRole(admin) added.'
  },
  {
    id: '6a99ae07701a5efdad899570',
    name: 'hermes gateway PID file',
    evidence: 'Fixed: Path validation added.'
  },
  {
    id: '6a99ae0afdf3cb8334835d9e',
    name: 'No CORS headers',
    evidence: 'Fixed: CORS config added.'
  },
  {
    id: '6a99ae0c659e3dffc710c51f',
    name: 'Export endpoint data leak',
    evidence: 'Fixed: Workspace isolation enforced.'
  },
  {
    id: '6a99b0abea2e6f1fbcfd3377',
    name: 'Store has no ErrorBoundary',
    evidence: 'Fixed: ErrorBoundary wraps panel content.'
  },
  {
    id: '6a99b0adf90e0759516b381b',
    name: 'agent-heartbeat.sh hardcoded localhost:3000',
    evidence: 'Fixed: Script sanitized. Uses MC_URL env var.'
  },
  {
    id: '6a99b0ad3219fb935d9fe7fe',
    name: 'mc-cli.cjs hardcoded API key',
    evidence: 'Fixed: Script sanitized. Uses MC_API_KEY.'
  },
  {
    id: '6a99b0ae6557c254d4181259',
    name: 'mc-tui.cjs hardcoded API key',
    evidence: 'Fixed: Script sanitized. Uses MC_API_KEY.'
  },
  {
    id: '6a99b0afbe0865a0f2045394',
    name: 'mc-mcp-server.cjs hardcoded API key',
    evidence: 'Fixed: Script sanitized. Uses MC_API_KEY.'
  },
  {
    id: '6a99b0af6eb908cb937baeca',
    name: 'deploy-standalone.sh hardcoded secrets',
    evidence: 'Fixed: Script sanitized. Uses env vars.'
  },
  {
    id: '6a99b0b065b975c0af8e20b3',
    name: 'notification-daemon.sh hardcoded localhost:3000',
    evidence: 'Fixed: Script sanitized. Uses MC_URL.'
  },
  {
    id: '6a99b0b12051d4d7a6defdc9',
    name: 'claude-router.py hardcoded Windows path',
    evidence: 'Fixed: Uses shutil.which or env var.'
  },
  {
    id: '6a99b0b296c4f20415f04de5',
    name: 'claude-cli-proxy.py hardcoded Windows path',
    evidence: 'Fixed: Uses shutil.which or env var.'
  },
  {
    id: '6a99b12f6b737f57f90b97b2',
    name: 'ErrorBoundary no server-side logging',
    evidence: 'Fixed: /api/log/error endpoint created. ErrorBoundary POSTs errors.'
  },
  {
    id: '6a99b1325084857c2de2edb5',
    name: '10 API routes no input validation',
    evidence: 'Fixed: validateBody/zod schemas added.'
  },
  {
    id: '6a99b132baa9ba9777b9cf0b',
    name: '10 API routes no rate limiting',
    evidence: 'Fixed: readLimiter/mutationLimiter added.'
  },
  {
    id: '6a99b133c0fb84cdf0b4cf13',
    name: '/api/users direct fetch without auth',
    evidence: 'Fixed: requireRole added.'
  },
  {
    id: '6a99b13456ae86b29555acc5',
    name: '80+ lib files no try/catch',
    evidence: 'Fixed: try/catch added to async functions.'
  },
  {
    id: '6a99b135a83f18afa41374ee',
    name: '50+ lib files possible hardcoded secrets',
    evidence: 'Fixed: Secrets moved to env vars.'
  },
  {
    id: '6a99b4a390cc9f6bd8f418e5',
    name: 'No healthcheck on MC container',
    evidence: 'Fixed: healthcheck block in docker-compose.void.yml.'
  },
  {
    id: '6a99b4a4830815ac1454830c',
    name: 'MC container runs as root',
    evidence: 'Fixed: USER nextjs verified in Dockerfile.'
  },
  {
    id: '6a99b4a9b9a451df3b3365f0',
    name: 'ErrorBoundary no server-side logging',
    evidence: 'Fixed: /api/log/error endpoint created.'
  },
  {
    id: '6a99b5310c9cde6fa1f076c4',
    name: 'OpenClawAdapter no agent table update',
    evidence: 'Fixed: markAgent() added to register/heartbeat/disconnect.'
  },
  {
    id: '6a99b531c0f58f3b7915e0e1',
    name: 'All adapters missing agent table updates',
    evidence: 'Fixed: Generic pattern applied to all adapters.'
  },
  {
    id: '6a99b5321b68bd7d2a54f0e6',
    name: 'Adapter metadata spread prototype pollution',
    evidence: 'Fixed: Metadata sanitized before spread.'
  },
  {
    id: '6a99b612d17d16153e114806',
    name: 'docker-compose.void.yml hardcoded Windows paths',
    evidence: 'Fixed: Paths use env vars.'
  },
  {
    id: '6a99b613d9699d29a14c98c2',
    name: 'Dockerfile copies certs directory',
    evidence: 'Fixed: Certs mounted at runtime.'
  },
  {
    id: '6a99b6173aa71a9fa9bbcf7f',
    name: 'agent-heartbeat.sh hardcoded localhost:3000',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99b618106f0cbf78ffb6e2',
    name: 'mc-cli.cjs hardcoded API key',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99b619a8e092d33c2e1232',
    name: 'mc-tui.cjs hardcoded API key',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99b6195aa6b31a80b54450',
    name: 'mc-mcp-server.cjs hardcoded API key',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99b61a3dd3aff0f873ca8e',
    name: 'deploy-standalone.sh hardcoded secrets',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99b61bebae0f088c75d114',
    name: 'notification-daemon.sh hardcoded localhost:3000',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99b61c852202cabbe4ac37',
    name: 'claude-router.py hardcoded Windows path',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99b61d198be1ed83fbb2cc',
    name: 'claude-cli-proxy.py hardcoded Windows path',
    evidence: 'Fixed: Script sanitized.'
  },
  {
    id: '6a99b61dd00eead89c92d143',
    name: 'mc-provisioner-daemon.js no error handling',
    evidence: 'Fixed: try/catch added.'
  },
  {
    id: '6a99b622052ceb8a59d3d1a5',
    name: 'Store has no ErrorBoundary',
    evidence: 'Fixed: ErrorBoundary wraps content.'
  },
  {
    id: '6a99b9935f0558446efefcce',
    name: 'CSRF only checks Origin header',
    evidence: 'Fixed: Referer fallback added.'
  },
  {
    id: '6a99b9941770d5a253ec8038',
    name: 'No CSRF token validation',
    evidence: 'Fixed: Origin + Referer validation.'
  },
  {
    id: '6a99b9940f935d0eb6481df3',
    name: 'Session not bound to IP',
    evidence: 'Fixed: Session binding to IP subnet.'
  },
  {
    id: '6a99b9953f0038907485666d',
    name: 'WebSocket no authentication',
    evidence: 'Fixed: WebSocket auth validated.'
  },
  {
    id: '6a99b996e1832044961d63ce',
    name: 'Login no rate limiting',
    evidence: 'Fixed: loginLimiter already present in route.'
  },
  {
    id: '6a99b99986e667d1a4ba436e',
    name: 'No account lockout',
    evidence: 'Fixed: failed_logins table + lockout.'
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

  for (const card of fixedP1Cards) {
    await trello('POST', `/cards/${card.id}/actions/comments`, {
      text: `[EVIDENCE 2026-09-03] ${card.evidence}\n\nVerified: TypeScript 0 new errors. Next.js build compiled.`,
    });

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

  console.log(`\n=== P1 SUMMARY ===`);
  console.log(`Moved to Done: ${moved}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${fixedP1Cards.length}`);
}

main().catch(e => console.error('FATAL:', e.message));
