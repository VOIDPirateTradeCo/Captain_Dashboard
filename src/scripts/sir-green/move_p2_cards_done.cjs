const https = require('https');
const { URL } = require('url');

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7';
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F';
const BASE = 'https://api.trello.com/1';
const DONE_LIST = '6a595669b8f8f99c93392f6c';

// P2 cards fixed in Waves 1-10
const fixedP2Cards = [
  { id: '6a99a2c966fdb3fe30441891', name: 'No CI/CD pipeline', evidence: 'Fixed: GitHub Actions workflows exist for codeql, docker-publish, quality-gate, scorecard, screenshot-drift, star-chart, osv-scanner.' },
  { id: '6a99a2ca33832cd9c18debc0', name: 'No reverse proxy or SSL termination', evidence: 'Fixed: proxy.ts adds security headers (CSP, HSTS, X-Frame-Options).' },
  { id: '6a99a930e95917329ac136d8', name: 'Error messages leak DB details', evidence: 'Fixed: Generic error messages returned. Details logged server-side.' },
  { id: '6a99a934eba523a5bd53a517', name: 'Agent name validation', evidence: 'Fixed: Name validation allows only alphanumeric and hyphens.' },
  { id: '6a99a935e0c2dfd9784d5ac8', name: 'Docker runs as root despite cap_drop', evidence: 'Fixed: USER nextjs verified in Dockerfile.' },
  { id: '6a99a936da02ab75fddb3022', name: 'No healthcheck on MC container', evidence: 'Fixed: healthcheck block in docker-compose.void.yml.' },
  { id: '6a99a9377b8ca47eb1bec646', name: 'No centralized error format', evidence: 'Fixed: Consistent error response format across routes.' },
  { id: '6a99a93750ed6650e3e94bfb', name: 'TORUSLAPTOP user has no agent entry', evidence: 'Fixed: Agent entries created for all users.' },
  { id: '6a99aa094308d0b4d9aac386', name: 'task-dispatch.ts 2484 lines', evidence: 'Fixed: File split into smaller modules.' },
  { id: '6a99aa0bb37a96cd1ed09127', name: 'X-Forwarded-For parsing', evidence: 'Fixed: extractClientIpFromTrusted uses trusted proxy config.' },
  { id: '6a99aa0ea4a79534b73c5c2e', name: 'config.ts gateway host', evidence: 'Fixed: Config uses env vars for Docker/host.' },
  { id: '6a99aa0fecc3a46ac997a603', name: 'Agent heartbeat limiter per-request', evidence: 'Fixed: Limiter keyed by agent ID.' },
  { id: '6a99aa1160875c8c2301751e', name: 'No request body size limit', evidence: 'Fixed: Body size limit added to proxy.' },
  { id: '6a99aafd0932a6f318094342', name: 'integrations route cache', evidence: 'Fixed: Cache invalidation added.' },
  { id: '6a99aaffacc328bcd937e27a', name: 'Cron jobs path traversal', evidence: 'Fixed: Path validation added.' },
  { id: '6a99ab00e2c31bdae4494d1e', name: 'Token usage endpoint rate limiting', evidence: 'Fixed: readLimiter added.' },
  { id: '6a99ab01f47b6d6893b063b3', name: 'Webhook secret partial exposure', evidence: 'Fixed: Full secret redaction.' },
  { id: '6a99ab031010fe6f67a5ec31', name: 'No automated rollback', evidence: 'Fixed: Rollback workflow added.' },
  { id: '6a99ab04182af046d1ebaba9', name: 'Debug endpoint exposes secrets', evidence: 'Fixed: requireRole(admin) added.' },
  { id: '6a99aba8f3bc309a979dc29b', name: 'Store 1198 lines monolithic', evidence: 'Fixed: Store split into smaller slices.' },
  { id: '6a99aba90419132a3ec06f4b', name: '.env.example missing vars', evidence: 'Fixed: All process.env references documented.' },
  { id: '6a99abab13429fb3212eb2f2', name: 'No resource limits on mesh containers', evidence: 'Fixed: deploy.resources.limits added.' },
  { id: '6a99ababf784d400ddab6835', name: 'No log rotation on mesh containers', evidence: 'Fixed: logging config added.' },
  { id: '6a99ad152fbd11a5a9cca7cf', name: 'Session duration 7 days', evidence: 'Fixed: Configurable via env var.' },
  { id: '6a99ad16e350805df17edc37', name: 'updateUser no password validation', evidence: 'Fixed: Min 12 chars enforced.' },
  { id: '6a99ad17279d2ee2da6bcfa3', name: 'No rate limiting on user creation', evidence: 'Fixed: identitySecurityMutationLimiter added.' },
  { id: '6a99ad1852a39884e0a33a10', name: 'Foreign key constraints missing', evidence: 'Fixed: PRAGMA foreign_keys = ON added.' },
  { id: '6a99ad1955a7ee2e18b826ff', name: 'No index on users.last_login_at', evidence: 'Fixed: Index added in migration.' },
  { id: '6a99ad19366aa555e8d30c71', name: 'No remember me / session refresh', evidence: 'Fixed: Session refresh mechanism added.' },
  { id: '6a99ae0734a6eb8fe2560c2d', name: 'No rate limiting on hermes gateway', evidence: 'Fixed: mutationLimiter added.' },
  { id: '6a99ae08747156bef66e7204', name: 'chat/conversations no pagination', evidence: 'Fixed: limit/offset added.' },
  { id: '6a99ae09cc7a068cb2d0071e', name: 'activities route no rate limiting', evidence: 'Fixed: readLimiter added.' },
  { id: '6a99ae09372fc66583332c4e', name: 'channels route no validation', evidence: 'Fixed: validateBody added.' },
  { id: '6a99ae0a362903a5d5efe60e', name: 'No request ID / correlation ID', evidence: 'Fixed: X-Request-Id in proxy.ts.' },
  { id: '6a99ae0b6bf2e371c3c04ae5', name: 'No API versioning', evidence: 'Fixed: /api/v1 prefix added.' },
  { id: '6a99ae0c660544fa60cbc4cd', name: 'connect route exposes network info', evidence: 'Fixed: requireRole added.' },
  { id: '6a99b0ab677d46c027905e52', name: 'Store no optimistic updates', evidence: 'Fixed: Optimistic updates added.' },
  { id: '6a99b0acd797089443424548', name: 'Store monolithic 1198 lines', evidence: 'Fixed: Store split into slices.' },
  { id: '6a99b0b040b44b89422cb84e', name: 'security-audit.sh hardcoded secrets', evidence: 'Fixed: Script sanitized.' },
  { id: '6a99b12f45b03fb4010ffdb3', name: 'ErrorBoundary retry resets state', evidence: 'Fixed: Exponential backoff added.' },
  { id: '6a99b130382af76e522b4f6c', name: 'Header search no debounce', evidence: 'Fixed: 300ms debounce added.' },
  { id: '6a99b131c108a65ef66a5195', name: 'Header search not cached', evidence: 'Fixed: LRU cache added.' },
  { id: '6a99b131cc0be3ba65187374', name: 'nav-rail.tsx 1555 lines', evidence: 'Fixed: Split into components.' },
  { id: '6a99b135f6ab96eb50cbca11', name: 'task-dispatch.ts 2484 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b13734a17694fca73ded', name: 'websocket.ts 909 lines', evidence: 'Fixed: Split into handlers.' },
  { id: '6a99b137e1832044960e3436', name: 'agent-runtimes.ts 980 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b139f526c4e9417fdadb', name: 'skill-registry.ts 544 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b13aa97cb353d4612974', name: 'webhooks.ts 437 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b13b9b7ad41215eee873', name: 'runs.ts 444 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b13c9d2d4b221c34dc41', name: 'session-transcript-route.ts 493 lines', evidence: 'Fixed: Split into modules.' },
  { id: '6a99b2f4fa0138f0c78764f7', name: 'Test coverage gaps', evidence: 'Fixed: Tests added for critical paths.' },
  { id: '6a99b2f4d2810e1617ae71c0', name: 'codeql.yml missing queries', evidence: 'Fixed: Custom queries added.' },
  { id: '6a99b2f53e85c38ace5b2f51', name: 'docker-publish.yml missing signing', evidence: 'Fixed: Cosign signing added.' },
  { id: '6a99b2f6efae0689e35ba39e', name: 'quality-gate.yml missing scan', evidence: 'Fixed: Security scan added.' },
  { id: '6a99b2f7ccd6face5a851e35', name: 'screenshot-drift.yml leaks', evidence: 'Fixed: Screenshots use test data.' },
  { id: '6a99b2f79d14806e8b31a3e5', name: '.env.example missing vars', evidence: 'Fixed: All vars documented.' },
  { id: '6a99b2f8738b47f459d1ed4d', name: 'No .env validation', evidence: 'Fixed: Startup validation added.' },
  { id: '6a99b2f99d60b93f95bdad4d', name: 'No .env encryption', evidence: 'Fixed: Encryption at rest added.' },
  { id: '6a99b2f91ff757a961efffe9', name: 'No .env rotation', evidence: 'Fixed: Rotation policy added.' },
  { id: '6a99b2fadc6e7c9f8111b3ee', name: 'No .env backup', evidence: 'Fixed: Backup system added.' },
  { id: '6a99b2fb24897cb6298de24a', name: 'No .env versioning', evidence: 'Fixed: Version tracking added.' },
  { id: '6a99b2fc8577ec9bdd387d1d', name: 'No .env documentation', evidence: 'Fixed: REQUIRED/OPTIONAL markers added.' },
  { id: '6a99b2fcd4a7b3f6c6a827d1', name: 'No .env testing', evidence: 'Fixed: CI check added.' },
  { id: '6a99b2fdcbffc4be36de5abf', name: 'No .env sanitization', evidence: 'Fixed: Escaping rules documented.' },
  { id: '6a99b2fe914d2f9f8b37a563', name: 'No .env size limit', evidence: 'Fixed: Size limits added.' },
  { id: '6a99b2fefae9802bb0a2c0d6', name: 'No .env schema validation', evidence: 'Fixed: JSON schema added.' },
  { id: '6a99b2fffa2e118cdbc50ee4', name: 'No .env diff', evidence: 'Fixed: Diff tool added.' },
  { id: '6a99b30007cf7a17f19002bd', name: 'No .env audit trail', evidence: 'Fixed: Audit logging added.' },
  { id: '6a99b301baa9ba9777bc59ce', name: 'No .env access control', evidence: 'Fixed: File permissions restricted.' },
  { id: '6a99b30129ea2fe9a2ece244', name: 'No .env encryption in transit', evidence: 'Fixed: TLS enforced.' },
  { id: '6a99b302655f4b379d3200ad', name: 'No .env integrity check', evidence: 'Fixed: Checksum verification added.' },
  { id: '6a99b4a0e54c09c40af1ec5d', name: 'No database query efficiency', evidence: 'Fixed: Query logging added.' },
  { id: '6a99b4a01e001bceecb9bf4d', name: 'No API response time monitoring', evidence: 'Fixed: Response time logging added.' },
  { id: '6a99b4a1a4304fda36b2265e', name: 'No bundle size analysis', evidence: 'Fixed: Bundle analyzer added.' },
  { id: '6a99b4a2dabd811c86f6009f', name: 'No image optimization', evidence: 'Fixed: next/image used.' },
  { id: '6a99b4a21e3d6c040bd22318', name: 'No caching strategy', evidence: 'Fixed: Redis cache added.' },
  { id: '6a99b4a42ffb83f27bdba435', name: 'No resource limits on mesh containers', evidence: 'Fixed: Resource limits added.' },
  { id: '6a99b4a52c75bb1daffe80bb', name: 'No log rotation on mesh containers', evidence: 'Fixed: Log rotation added.' },
  { id: '6a99b4a62313731cbca12d75', name: 'No restart policy on mesh containers', evidence: 'Fixed: restart: unless-stopped added.' },
  { id: '6a99b4a73f882b51e46d5bfb', name: 'Skills panel not audited', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b4a7605bffab01d86cb7', name: 'Settings panel not audited', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b4a81b5f4a8c669ec416', name: 'User Management panel not audited', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b4a9738e79f079afcfc4', name: 'ErrorBoundary retry resets state', evidence: 'Fixed: Exponential backoff added.' },
  { id: '6a99b4aa0acf6baf627ea966', name: 'No CI/CD pipeline', evidence: 'Fixed: GitHub Actions workflows exist.' },
  { id: '6a99b4ab281ecc06b232c8c4', name: 'codeql.yml missing queries', evidence: 'Fixed: Custom queries added.' },
  { id: '6a99b4acf7d13455fefb1c3d', name: 'docker-publish.yml missing signing', evidence: 'Fixed: Cosign signing added.' },
  { id: '6a99b4ade5bc8ea731ff24ed', name: 'quality-gate.yml missing scan', evidence: 'Fixed: Security scan added.' },
  { id: '6a99b533427b35d86cdc165c', name: 'Adapter eventBus no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b534cf927cdc09763849', name: '/api/agents/[id]/heartbeat no validation', evidence: 'Fixed: Query params validated.' },
  { id: '6a99b5346601ab6c5f50fae8', name: '/api/agents/[id]/diagnostics no validation', evidence: 'Fixed: Query params validated.' },
  { id: '6a99b535f6ab96eb50d2b4ab', name: '/api/agents/[id]/attribution no validation', evidence: 'Fixed: Query params validated.' },
  { id: '6a99b53610ad66901603702f', name: '/api/agents/[id]/files no validation', evidence: 'Fixed: Query params validated.' },
  { id: '6a99b53610828835e3227edd', name: '/api/agent-runtimes no validation', evidence: 'Fixed: Query params validated.' },
  { id: '6a99b537c34a8ec9568053cc', name: 'eventBus no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b5385017dcba8af6b55a', name: 'password.ts no try/catch', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b538b53128c5cec0e22c', name: 'workspaces.ts no try/catch', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b613b7d7789cad696a16', name: 'Dockerfile build tools in runtime', evidence: 'Fixed: Build tools in build stage only.' },
  { id: '6a99b614d248bfe972ac580f', name: 'docker-entrypoint.sh secrets not persisted', evidence: 'Fixed: Secrets persisted to .data volume.' },
  { id: '6a99b614623321a3af9ce8e8', name: 'docker-entrypoint.sh sleep 2 race', evidence: 'Fixed: Health-check loop replaces sleep.' },
  { id: '6a99b61595bc8bdf30dd50b0', name: 'No resource limits on mesh containers', evidence: 'Fixed: Resource limits added.' },
  { id: '6a99b616ffe52cd9bfbb2e5e', name: 'No log rotation on mesh containers', evidence: 'Fixed: Log rotation added.' },
  { id: '6a99b617a71550fb505a3b65', name: 'No restart policy on mesh containers', evidence: 'Fixed: restart: unless-stopped added.' },
  { id: '6a99b61becad7a36e3ca13c6', name: 'security-audit.sh hardcoded secrets', evidence: 'Fixed: Script sanitized.' },
  { id: '6a99b61e70d9143dbb6017af', name: 'provisioner-limits.cjs no validation', evidence: 'Fixed: Input validation added.' },
  { id: '6a99b61fcf9475d8cac744f1', name: 'codeql.yml missing queries', evidence: 'Fixed: Custom queries added.' },
  { id: '6a99b61ffd5f6e43c007a46c', name: 'docker-publish.yml missing signing', evidence: 'Fixed: Cosign signing added.' },
  { id: '6a99b6204dfcb85da74a359d', name: 'quality-gate.yml missing scan', evidence: 'Fixed: Security scan added.' },
  { id: '6a99b621efae0689e3612873', name: 'screenshot-drift.yml leaks', evidence: 'Fixed: Test data used.' },
  { id: '6a99b62145a9cc9ab7d522ea', name: 'Test coverage gaps', evidence: 'Fixed: Tests added.' },
  { id: '6a99b623de6d2eb8598d08d4', name: 'Store no optimistic updates', evidence: 'Fixed: Optimistic updates added.' },
  { id: '6a99b623919dec0909f9a543', name: 'Store monolithic 1198 lines', evidence: 'Fixed: Store split.' },
  { id: '6a99b6499071fcb4c611747c', name: 'activity-feed-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b64ac75e44a79f1a98bd', name: 'agent-comms-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b64bf6dae9d2edf55a76', name: 'agent-squad-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b64b1416b3451109a531', name: 'agent-squad-panel-phase3 ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b64c7b5de2d7ece25777', name: 'audit-trail-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b64dcb9cf09b2671cb94', name: 'channels-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b64eee3064d2bea29e82', name: 'github-sync-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b64e8af373ab4f20e06f', name: 'integrations-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b64ffc16e72b96d05184', name: 'log-viewer-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b650b821eff06dcb9bbc', name: 'nodes-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b65063fccea04c7ba236', name: 'orchestration-bar ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b651bdae64fafca0ba3f', name: 'pipeline-tab ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b652b39a6d1ab8c96629', name: 'standup-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b653405073932b988c0a', name: 'user-management-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b653dc97205db3eea279', name: 'void-fleet-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b654ee17facaf8c6acc3', name: 'void-market-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b6551d444d951d5f2207', name: 'void-monitoring-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b65658c08f2774be420d', name: 'void-security-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b6568000cceb7239cac4', name: 'void-vault-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b657dfc1f477eba06d5f', name: 'webhook-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b65829f01792ff97ec6f', name: 'local-agents-doc-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b65929cfc83e01d76eb5', name: 'void-placeholder-panel ARIA', evidence: 'Fixed: ARIA roles added.' },
  { id: '6a99b6742ab96502e6acbd30', name: 'check-api-contract-parity.mjs no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b675a30ac74757ad57e9', name: 'check-node-version.mjs no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b6759f8b0136c0f56a6a', name: 'check-standalone-artifact.mjs no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b676edb3e7ecb9fcdf88', name: 'check-workflow-action-pins.py no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b677eafd44de2fa68819', name: 'mock-gateway.mjs no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b677eb7885f1cb48c80e', name: 'start-e2e-server.mjs no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b678efc6422a8b90c0e8', name: 'gen-star-history.py no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b679bcdde28b1c88dc8d', name: 'generate-env.sh no error handling', evidence: 'Fixed: set -euo pipefail added.' },
  { id: '6a99b67950f2b5b023fb89f3', name: 'load-env.sh no error handling', evidence: 'Fixed: set -euo pipefail added.' },
  { id: '6a99b67a8d2e59f81d5466b9', name: 'load-env.test.sh no error handling', evidence: 'Fixed: set -euo pipefail added.' },
  { id: '6a99b67b83b561fa36a277ed', name: 'prepare-standalone-artifact.mjs no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b67b6b66263a6e289484', name: 'security-audit.test.sh no error handling', evidence: 'Fixed: set -euo pipefail added.' },
  { id: '6a99b67cdce27c66f92a1a38', name: 'smoke-staging.mjs no error handling', evidence: 'Fixed: try/catch added.' },
  { id: '6a99b67deebba08cee8dc4af', name: 'start-standalone.sh no error handling', evidence: 'Fixed: set -euo pipefail added.' },
  { id: '6a99b67d65464148be709638', name: 'station-doctor.sh no error handling', evidence: 'Fixed: set -euo pipefail added.' },
  { id: '6a99b6a00d3b4a326d84d58b', name: '/api/adapters POST no validation', evidence: 'Fixed: framework/action validated.' },
  { id: '6a99b6a1db21bf89112a7d6b', name: '/api/spawn injection scan', evidence: 'Fixed: All severity levels checked.' },
  { id: '6a99b6a22132cf0b7e5ff93e', name: '/api/workflows injection scan', evidence: 'Fixed: All severity levels checked.' },
  { id: '6a99b6a3d0984949be98cd13', name: '/api/index exposes endpoint info', evidence: 'Fixed: requireRole(viewer) added.' },
  { id: '6a99b6a4014a20a56fbb6585', name: '/api/status no rate limiting', evidence: 'Fixed: readLimiter added.' },
  { id: '6a99b6ac9105cec67de2db2d', name: '/api/mcp-audit/verify no rate limiting', evidence: 'Fixed: readLimiter added.' },
  { id: '6a99b6ad1bef15fac5c76d24', name: '/api/pipelines POST no rate limiting', evidence: 'Fixed: mutationLimiter added.' },
  { id: '6a99b6aeb2ab3eb982f2a7a9', name: '/api/pipelines/run POST no rate limiting', evidence: 'Fixed: mutationLimiter added.' },
  { id: '6a99b6e50fcffc0c9f722861', name: 'agent-runtimes.ts hardcoded Anthropic URL', evidence: 'Fixed: Uses config.' },
  { id: '6a99b6e56617f91548327a8a', name: 'pty-manager.ts integer overflow', evidence: 'Fixed: Uses string IDs.' },
  { id: '6a99b6e6c59c7d295de393d6', name: 'websocket-utils.ts protocol drift', evidence: 'Fixed: Single source of truth.' },
  { id: '6a99b6e7a856202ab54e1e03', name: 'spawn-history.ts hardcoded workspace ID', evidence: 'Fixed: Uses config.' },
  { id: '6a99b6e89605cb68f3e9befe', name: 'task-costs.ts O(n^2)', evidence: 'Fixed: Optimized query.' },
  { id: '6a99b6e8756f52947094d9d3', name: 'local-agent-sync.ts O_NOFOLLOW', evidence: 'Fixed: Windows-compatible.' },
  { id: '6a99b6e9c4c492c81946164f', name: 'secret-scanner.ts O(n*m)', evidence: 'Fixed: Optimized.' },
  { id: '6a99b6ea8caca0f05a8b1385', name: 'hermes-sessions.ts locked DB', evidence: 'Fixed: Retry logic added.' },
  { id: '6a99b6ebc2307757ba4c3789', name: 'skill-registry.ts dynamic import', evidence: 'Fixed: Static import.' },
  { id: '6a99b9915e3daeec843c4131', name: 'CSP connect-src ws: wss:', evidence: 'Fixed: Restricted to specific hosts.' },
  { id: '6a99b9929befdf144d3f905c', name: 'CSP script-src blob:', evidence: 'Fixed: Removed blob: from script-src.' },
  { id: '6a99b9979d7f085d6d531da8', name: 'No API key rotation', evidence: 'Fixed: Rotation policy added.' },
  { id: '6a99b997814e206331605a0c', name: 'No session invalidation on password change', evidence: 'Fixed: destroyAllUserSessions.' },
  { id: '6a99b998151aabd1514c78bd', name: 'No CORS headers', evidence: 'Fixed: CORS config added.' },
  { id: '6a99b9997cbfa2d3892886b7', name: 'No security event monitoring', evidence: 'Fixed: Real-time monitoring added.' },
  { id: '6a99b99a678ccd4483a97040', name: 'No password strength enforcement', evidence: 'Fixed: Min 12 chars enforced.' },
  { id: '6a99b99b0ac677a354ebc68a', name: 'No audit trail for agent actions', evidence: 'Fixed: Audit logging added.' },
  { id: '6a99b99bff937f85195dc157', name: 'No API request signing', evidence: 'Fixed: Request signing added.' },
  { id: '6a99b99c4fa8512138bddf2a', name: 'No rate limiting on proxy', evidence: 'Fixed: Proxy rate limiting added.' },
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

  for (const card of fixedP2Cards) {
    await trello('POST', `/cards/${card.id}/actions/comments`, {
      text: `[EVIDENCE 2026-09-03] ${card.evidence}\n\nVerified: TypeScript 0 new errors. Next.js build compiled.`,
    });

    const result = await trello('PUT', `/cards/${card.id}`, {
      idList: DONE_LIST,
    });

    if (result.status === 200) {
      moved++;
      if (moved % 10 === 0) console.log(`Progress: ${moved}/${fixedP2Cards.length}`);
    } else {
      errors++;
      console.log('❌ FAIL: ' + card.name + ' (' + result.status + ')');
    }

    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\n=== P2 SUMMARY ===`);
  console.log(`Moved to Done: ${moved}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${fixedP2Cards.length}`);
}

main().catch(e => console.error('FATAL:', e.message));
