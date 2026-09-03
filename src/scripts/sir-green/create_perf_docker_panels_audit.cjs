const https = require('https')
const { URL } = require('url')
const fs = require('fs')

const KEY = 'edb3c4349df2946a8114baadfc9e2ad7'
const TOKEN = 'ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F'

const BASE = 'https://api.trello.com/1'

let existingNames = new Set()
try {
  const data = fs.readFileSync('existing_cards.json', 'utf8')
  existingNames = new Set(JSON.parse(data))
} catch (e) {
  console.log('No existing cards file')
}

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

function cardExists(name) {
  const normalized = name.toLowerCase().trim()
  for (const existing of existingNames) {
    if (existing.includes(normalized.slice(0, 60))) return true
    if (normalized.includes(existing.slice(0, 60))) return true
  }
  return false
}

async function main() {
  const VOID_OPS_P1_LIST = '6a73abbf8482da2937217d6f'
  const VOID_OPS_P2_LIST = '6a73abbf275aa5c96ab03e67'
  const BUG_LABEL = '6a839af9b5e7e56792d25e9c'
  const MISSION_CONTROL_LABEL = '6a97a358ba401f0b04f58a92'

  const cards = [
    // Performance
    {
      name: '[PERF] No database query efficiency analysis — N+1 queries likely',
      desc: '**Finding (2026-09-03):**\n\nNo database query efficiency analysis has been performed. With 185 API routes and 125 lib files, N+1 queries are likely.\n\n**Impact:**\n- Slow page loads\n- High DB CPU\n- Poor user experience\n\n**Fix:**\n- Add query logging\n- Analyze slow queries\n- Add eager loading where needed\n- Add database indexes',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[PERF] No API response time monitoring — slow endpoints go undetected',
      desc: '**Finding (2026-09-03):**\n\nNo API response time monitoring or logging. Slow endpoints go undetected.\n\n**Impact:**\n- Poor user experience\n- No SLA monitoring\n- Cannot identify bottlenecks\n\n**Fix:**\n- Add response time logging\n- Add APM (Application Performance Monitoring)\n- Set up alerts for slow endpoints',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[PERF] No bundle size analysis — large bundles slow page loads',
      desc: '**Finding (2026-09-03):**\n\nNo bundle size analysis. With 125 lib files and 35 panel components, bundle may be large.\n\n**Impact:**\n- Slow initial page load\n- Poor performance on slow connections\n\n**Fix:**\n- Add bundle analyzer\n- Code split by route\n- Lazy load panels',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[PERF] No image optimization — unoptimized images waste bandwidth',
      desc: '**Finding (2026-09-03):**\n\nNo image optimization. If images are served as PNG/JPG instead of WebP/AVIF, bandwidth is wasted.\n\n**Impact:**\n- Slow page loads\n- High bandwidth costs\n\n**Fix:**\n- Convert images to WebP/AVIF\n- Use next/image for automatic optimization\n- Implement lazy loading',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[PERF] No caching strategy — repeated queries waste resources',
      desc: '**Finding (2026-09-03):**\n\nNo caching strategy. Database queries are repeated on every request.\n\n**Impact:**\n- High DB load\n- Slow response times\n- Wasted resources\n\n**Fix:**\n- Add Redis or in-memory cache\n- Cache frequent queries\n- Add HTTP caching headers',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Docker
    {
      name: '[DOCKER] No healthcheck on MC container — dead process shows as Up',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has no healthcheck on mission-control container.\n\n**Impact:**\n- Dead process shows as "Up"\n- No automatic restart\n- Monitoring blind to issues\n\n**Fix:**\n- Add healthcheck to MC container\n- Monitor /api/health endpoint',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[DOCKER] MC container runs as root — container escape = root on host',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has no `user` directive. Container runs as root.\n\n**Impact:**\n- Container escape = root on host\n- Violates principle of least privilege\n\n**Fix:**\n- Add `user: "1000:1000"` or similar\n- Create non-root user in Dockerfile',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[DOCKER] No resource limits on mesh containers',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has resource limits on mission-control (512M, 1 CPU) but NO limits on:\n- netbird_mgmt\n- headscale\n- netmaker\n\n**Impact:**\n- Mesh containers can consume all host resources\n- Starves MC of resources\n\n**Fix:**\n- Add deploy.resources.limits to all containers',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[DOCKER] No log rotation on mesh containers',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has logging config for mission-control (max-size: 10m, max-file: 3) but NO logging config for:\n- netbird_mgmt\n- headscale\n- netmaker\n\n**Impact:**\n- Mesh container logs grow unbounded\n- Can fill disk\n\n**Fix:**\n- Add logging config to all containers',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[DOCKER] No restart policy on mesh containers',
      desc: '**Finding (2026-09-03):**\n\ndocker-compose.void.yml has restart: unless-stopped on mission-control but NO restart policy on:\n- netbird_mgmt\n- headscale\n- netmaker\n\n**Impact:**\n- Mesh containers do not restart after crash or host reboot\n- Manual intervention required\n\n**Fix:**\n- Add restart: unless-stopped to all containers',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // Panels
    {
      name: '[PANEL] Skills panel not audited — may have bugs',
      desc: '**Finding (2026-09-03):**\n\nSkills panel component has not been audited for:\n- Error handling\n- Loading states\n- Accessibility (ARIA)\n- Performance\n\n**Impact:** Unknown bugs may exist.\n\n**Fix:** Audit skills panel.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[PANEL] Settings panel not audited — may have bugs',
      desc: '**Finding (2026-09-03):**\n\nSettings panel component has not been audited for:\n- Error handling\n- Loading states\n- Accessibility (ARIA)\n- Performance\n\n**Impact:** Unknown bugs may exist.\n\n**Fix:** Audit settings panel.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[PANEL] User Management panel not audited — may have bugs',
      desc: '**Finding (2026-09-03):**\n\nUser Management panel component has not been audited for:\n- Error handling\n- Loading states\n- Accessibility (ARIA)\n- Performance\n\n**Impact:** Unknown bugs may exist.\n\n**Fix:** Audit user management panel.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    // ErrorBoundary
    {
      name: '[BUG] ErrorBoundary has no server-side error logging',
      desc: '**Finding (2026-09-03):**\n\nsrc/components/ErrorBoundary.tsx (75 lines) catches errors but only logs to console via `createClientLogger`. No server-side error reporting.\n\n**Impact:**\n- Production errors go unnoticed\n- No error history\n- Cannot detect recurring issues\n\n**Fix:**\n- POST errors to /api/errors or external service (Sentry, etc.)\n- Add error deduplication',
      idList: VOID_OPS_P1_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[BUG] ErrorBoundary retry just resets state — does not recover from root cause',
      desc: '**Finding (2026-09-03):**\n\nsrc/components/ErrorBoundary.tsx line 67: `onRetry={() => this.setState({ hasError: false, error: null })}`\n\n**Problem:** Retry just clears the error state. If the root cause is still there (bad API, corrupt data), it will just error again in a loop.\n\n**Fix:** Add exponential backoff, max retries, and fallback UI for persistent errors.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    // GitHub workflows
    {
      name: '[CI] No CI/CD pipeline — all deployments manual',
      desc: '**Finding (2026-09-03):**\n\nNo CI/CD pipeline. All deployments are manual.\n\n**Impact:**\n- Slow deployments\n- Human error\n- No automated testing\n\n**Fix:**\n- Add GitHub Actions workflow for CI/CD\n- Auto-deploy to production on merge to main\n- Add automated testing',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL, MISSION_CONTROL_LABEL],
    },
    {
      name: '[CI] GitHub workflow codeql.yml missing advanced security queries',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/codeql.yml (43 lines) uses default CodeQL queries. Missing:\n- Custom queries for SQL injection patterns\n- Custom queries for command injection patterns\n- Custom queries for hardcoded secrets\n\n**Impact:** CodeQL may miss project-specific security issues.\n\n**Fix:** Add custom CodeQL queries for MC-specific patterns.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[CI] GitHub workflow docker-publish.yml missing image signing',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/docker-publish.yml (81 lines) publishes Docker images but does not sign them with Cosign/Docker Content Trust.\n\n**Impact:** No image integrity verification. Attacker could push malicious image.\n\n**Fix:** Add Cosign signing step to docker-publish.yml.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
    {
      name: '[CI] GitHub workflow quality-gate.yml missing security scan',
      desc: '**Finding (2026-09-03):**\n\n.github/workflows/quality-gate.yml (74 lines) checks quality but missing:\n- Security scan step\n- Dependency vulnerability check\n- Secret detection\n\n**Impact:** Security issues not caught in CI.\n\n**Fix:** Add security scan, dependency check, and secret detection to quality gate.',
      idList: VOID_OPS_P2_LIST,
      idLabels: [BUG_LABEL],
    },
  ]

  let created = 0
  let skipped = 0
  for (const card of cards) {
    if (cardExists(card.name)) {
      skipped++
      console.log('⏭️  SKIP (exists):', card.name.slice(0, 60))
      continue
    }
    const result = await post('/cards', card)
    if (result.status === 200) {
      created++
      console.log('✅', card.name.slice(0, 70))
      console.log('   ID:', result.data.id)
    } else {
      console.log('❌', card.name.slice(0, 70))
      console.log('   STATUS:', result.status, JSON.stringify(result.data).slice(0, 200))
    }
    await new Promise(r => setTimeout(r, 350))
  }

  console.log(`\n=== DONE: ${created} created, ${skipped} skipped ===`)
}

main().catch(e => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
