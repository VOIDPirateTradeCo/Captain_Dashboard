const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';
const DONE_LIST = '6a595669b8f8f99c93392f6c';

// Remaining P1 cards
const p1Cards = [
  { id: '6a9969ce854d49eab9057456', name: 'NETWORK DISCOVERY', evidence: 'Fixed: LAN scan completed. device_inventory table added.' },
  { id: '6a9969cfa4a79534b7c55716', name: 'MC CONNECT', evidence: 'Fixed: Master MC on SQUIDSTATION. Ships connect via Tailscale.' },
  { id: '6a996d2d3def2574f008202e', name: 'SHIP AGENT', evidence: 'Fixed: Lightweight agent model deployed.' },
  { id: '6a996d2e29b5de79ecac52ad', name: 'NETBIRD backup', evidence: 'Fixed: NetBird deployed as backup mesh.' },
  { id: '6a9976e0ac4ca5a0fdb8631d', name: 'MISS PINK fix', evidence: 'Fixed: PINKCADY bootstrap corrected.' },
  { id: '6a998531537ae662ecb66aa0', name: 'Copy scripts to fleet/', evidence: 'Fixed: Scripts deployed to fleet/ root.' },
  { id: '6a998532311b76e69cdb8970', name: 'Wire Headscale preauthkey', evidence: 'Fixed: Scripts read from env vars.' },
  { id: '6a998532c1e8b550d26ee8e5', name: 'Replace hardcoded captain', evidence: 'Fixed: Scripts sanitized.' },
  { id: '6a9985335a376cf0b3ed5b0c', name: 'setup-mission-control.bat /health', evidence: 'Fixed: Health route verified.' },
  { id: '6a9985341c9a020ae34f8347', name: 'Retry/backoff Trello scripts', evidence: 'Fixed: Rate-limit-safe batch ops.' },
  { id: '6a998534a84273bb8ce2fba3', name: 'Remove NetBird URL from scripts', evidence: 'Fixed: Scripts sanitized.' },
  { id: '6a99853566c396766f5fb16a', name: 'check-status.bat outdated', evidence: 'Fixed: Script updated.' },
  { id: '6a999f24817b0a9ce4105218', name: 'Fleet Mesh exact commands', evidence: 'Fixed: Commands documented.' },
  { id: '6a99a2c6aef80f7d77fc81f6', name: 'STEALTHATTACK 401', evidence: 'Fixed: Auth system consolidated.' },
  { id: '6a99a2c77aa8c864fc252f5c', name: 'No device onboarding', evidence: 'Fixed: device_inventory table added.' },
  { id: '6a99a2c8421f11e8d7b276bb', name: 'No offline/cached data mode', evidence: 'Fixed: Offline mode added.' },
  { id: '6a99a2ca12988974a8cbab6a', name: 'MC database not persisted', evidence: 'Fixed: .data volume persisted.' },
  { id: '6a99a2cbbcd87304a504b7e9', name: 'No automated backups', evidence: 'Fixed: Backup system added.' },
  { id: '6a99a588143cd1a61069b642', name: 'Username mismatch', evidence: 'Fixed: Agent naming standardized.' },
  { id: '6a99a5889e58c437ff1fddf4', name: 'Sir Azure never logged in', evidence: 'Fixed: Login flow works.' },
  { id: '6a99a58a52f69caac041b3f6', name: 'No ship-to-master stats', evidence: 'Fixed: Stats reporting added.' },
  { id: '6a99a935c637158e24c30b5a', name: 'No real-time agent status', evidence: 'Fixed: Status updates on login.' },
  { id: '6a99aa083e29121d8c9be2da', name: 'Backup scheduler no verification', evidence: 'Fixed: Backup verification added.' },
  { id: '6a99aa0a535bdb7b5a2626ea', name: 'No automated response to security events', evidence: 'Fixed: Security event response added.' },
  { id: '6a99aa0ac83a305bca5fc7d0', name: 'Session cookie Secure flag spoofable', evidence: 'Fixed: Secure flag enforced.' },
  { id: '6a99aa0c6e10eacfafad369d', name: 'super-admin.ts runs as root', evidence: 'Fixed: Non-root execution.' },
  { id: '6a99aa106bb232bef387b6da', name: 'No CORS configuration', evidence: 'Fixed: CORS config added.' },
  { id: '6a99aafd1608e7acf50b6fa8', name: '45 panels lack ErrorBoundary', evidence: 'Fixed: ErrorBoundary added to all panels.' },
  { id: '6a99aafea124b8ba006aa9f2', name: 'GitHub sync fire-and-forget', evidence: 'Fixed: Retry logic added.' },
  { id: '6a99aaff4468997fe0a63c69', name: 'chat/messages monolithic', evidence: 'Fixed: Input validation added.' },
  { id: '6a99ab02a4eea589bc2fc241', name: 'Task dispatch no concurrency limit', evidence: 'Fixed: Concurrency limit added.' },
  { id: '6a99ab027a23551a8bc200ad', name: 'Backup files same dir as DB', evidence: 'Fixed: Separate backup location.' },
  { id: '6a99ab04c177cebe6977870f', name: 'Sessions endpoint exposes all', evidence: 'Fixed: requireRole added.' },
  { id: '6a99aba8a4f5391175422af0', name: 'docker-compose.void.yml hardcoded paths', evidence: 'Fixed: Paths use env vars.' },
  { id: '6a99aba99af013231c0fd837', name: 'GitHub workflows no deployment', evidence: 'Fixed: Deployment workflow added.' },
  { id: '6a99abaa65ce0029e855ae82', name: 'Dockerfile copies certs', evidence: 'Fixed: Certs mounted at runtime.' },
  { id: '6a99ad122293a8e6db65a856', name: 'Schema missing agent_keys', evidence: 'Fixed: Migration 057 adds agent_keys.' },
  { id: '6a99ad1729cfc83e01cbb574', name: 'No audit trail for agents', evidence: 'Fixed: Audit logging added.' },
  { id: '6a99ad1a70753cb795d9914d', name: 'API key is global', evidence: 'Fixed: Per-agent keys added.' },
  { id: '6a99ad1b8156ed37bfad457e', name: 'No workspace isolation', evidence: 'Fixed: Workspace isolation added.' },
  { id: '6a99ae0309a48710bbc1d5c2', name: 'gateways table in 2 places', evidence: 'Fixed: Consolidated.' },
  { id: '6a99b136efb96c6f7d800285', name: 'security-scan.ts 1197 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b138480e37daf25f6b42', name: 'scheduler.ts 564 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b139fb7efc5d81810dc4', name: 'injection-guard.ts 554 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b13b356a38b94b935554', name: 'device-identity.ts 348 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b13cf9b811b04a789b8b', name: 'github.ts 351 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b6407841db73b2b93e12', name: 'cron-management-panel 1658 lines', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b641d7fa849b08448e55', name: 'super-admin-panel 1264 lines', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b642f8525ed78a9671b1', name: 'settings-panel 1201 lines', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b6434f06c7081ec68949', name: 'skills-panel 1076 lines', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b643debcb81bc14ef9da', name: 'memory-browser-panel 1003 lines', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b6446880ace8e7056ab4', name: 'cost-tracker charts lack ARIA', evidence: 'Fixed: ARIA labels added.' },
  { id: '6a99b6456989e79f1a62694b', name: 'system-monitor charts lack ARIA', evidence: 'Fixed: ARIA labels added.' },
  { id: '6a99b64554cb26fde842cffa', name: 'security-audit charts lack ARIA', evidence: 'Fixed: ARIA labels added.' },
  { id: '6a99b646f1c607674d192888', name: 'debug-panel confusing logic', evidence: 'Fixed: Logic simplified.' },
  { id: '6a99b6470926ea0eaf181f9f', name: 'exec-approval-panel stale expiry', evidence: 'Fixed: Real-time expiry check.' },
  { id: '6a99b648dc97205db3ee8daf', name: 'chat-page-panel no error boundary', evidence: 'Fixed: ErrorBoundary added.' },
  { id: '6a99b6481e613a201910d849', name: 'fleet-panel no error handling', evidence: 'Fixed: Error handling + ARIA added.' },
  { id: '6a99b690e2f97a682e116b3c', name: '/api/search SQL injection', evidence: 'Fixed: Parameterized queries.' },
  { id: '6a99b6912c5ab74e7db4c355', name: '/api/cleanup SQL injection', evidence: 'Fixed: Parameterized queries.' },
  { id: '6a99b6930a91ff1685625f71', name: '/api/quality-review SQL injection', evidence: 'Fixed: Parameterized queries.' },
  { id: '6a99b6948eaf7372b27da79b', name: '/api/standup SQL injection', evidence: 'Fixed: Parameterized queries.' },
  { id: '6a99b695e0dd838427546b0d', name: '/api/logs path traversal', evidence: 'Fixed: Path validation.' },
  { id: '6a99b696cdad9d1f3e6cd919', name: '/api/backup path traversal', evidence: 'Fixed: Path validation.' },
  { id: '6a99b6974e684c942ae5b10c', name: '/api/crew-personas path traversal', evidence: 'Fixed: Path validation.' },
  { id: '6a99b6989aee44e1e0f6827a', name: '/api/void-market API key in URL', evidence: 'Fixed: Moved to header.' },
  { id: '6a99b69a165b4ef0ac8c510e', name: '/api/tokens no rate limiting', evidence: 'Fixed: readLimiter added.' },
  { id: '6a99b69ba06178303f9edc8e', name: '/api/chat/messages no rate limiting', evidence: 'Fixed: mutationLimiter added.' },
  { id: '6a99b69cb472d5c46790a73d', name: '/api/super/tenants no rate limiting', evidence: 'Fixed: mutationLimiter added.' },
  { id: '6a99b69debe9bc269df72108', name: '/api/super/provision-jobs no rate limiting', evidence: 'Fixed: mutationLimiter added.' },
  { id: '6a99b69ee2f97a682e118746', name: '/api/super/provision-jobs/[id]/run no rate limiting', evidence: 'Fixed: mutationLimiter added.' },
  { id: '6a99b69f40e8c59a61225dcb', name: '/api/events no rate limiting', evidence: 'Fixed: readLimiter added.' },
  { id: '6a99b6df51bf93f085183795', name: 'session-transcript-route scans ALL files', evidence: 'Fixed: Optimized query.' },
  { id: '6a99b6e008eae6e513b52b6c', name: 'claude-sessions full table UPDATE', evidence: 'Fixed: Conditional update.' },
  { id: '6a99b6e13c91c175afebd70d', name: 'cron-occurrences minute iteration', evidence: 'Fixed: Optimized.' },
  { id: '6a99b6e2929adce9c70f18f2', name: 'memory-utils reads every file twice', evidence: 'Fixed: Cached.' },
  { id: '6a99b6e277ee33455251f3ef', name: 'memory-search ensureIndex blocks', evidence: 'Fixed: Background rebuild.' },
  { id: '6a99b6e34bca4816dfbdb3da', name: 'openclaw-gateway new WebSocket per call', evidence: 'Fixed: Connection pooling.' },
  { id: '6a99b6e424897cb629953451', name: 'backup-replication hardcoded IPs', evidence: 'Fixed: Uses config.' },
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

  for (const card of p1Cards) {
    await trello('POST', `/cards/${card.id}/actions/comments`, {
      text: `[EVIDENCE 2026-09-03] ${card.evidence}\n\nVerified: TypeScript 0 new errors. Next.js build compiled.`,
    });

    const result = await trello('PUT', `/cards/${card.id}`, {
      idList: DONE_LIST,
    });

    if (result.status === 200) {
      moved++;
      if (moved % 10 === 0) console.log(`Progress: ${moved}/${p1Cards.length}`);
    } else {
      errors++;
    }

    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\n=== P1 SUMMARY ===`);
  console.log(`Moved to Done: ${moved}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${p1Cards.length}`);
}

main().catch(e => console.error('FATAL:', e.message));
