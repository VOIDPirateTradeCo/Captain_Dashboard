import type { User } from './auth'

/**
 * Endpoint-level scope matrix for Mission Control.
 *
 * Each key is a route path prefix/pattern.
 * Each entry defines the minimum role and required scopes.
 *
 * Rule semantics:
 * - `minRole` is checked against the user's role first.
 * - `requireScopes` is checked against the user's agent scopes next.
 *   * For local/human sessions, scopes are inferred from role when absent.
 *   * For agent API keys, scopes come from DB-backed `agent_api_keys.scopes`.
 */

export interface ScopeRule {
  minRole: User['role']
  requireScopes?: string[]
  denyAgentAccess?: boolean
}

export const ROUTE_SCOPE_MATRIX: Record<string, ScopeRule> = {
  // Admin/bootstrap
  '/api/setup': { minRole: 'admin' },
  '/api/super': { minRole: 'admin' },
  '/api/super/': { minRole: 'admin' },

  // Agent management
  '/api/agents': { minRole: 'operator', requireScopes: ['agent:research'] },
  '/api/agents/': { minRole: 'operator', requireScopes: ['agent:research'] },
  '/api/agents/[id]/keys': { minRole: 'admin' },
  '/api/agents/[id]/heartbeat': { minRole: 'viewer', requireScopes: ['agent:heartbeat'] },
  '/api/agents/[id]/wake': { minRole: 'operator', requireScopes: ['agent:research'] },
  '/api/agents/[id]/hide': { minRole: 'operator', requireScopes: ['agent:research'] },
  '/api/agents/[id]/diagnostics': { minRole: 'viewer', requireScopes: ['agent:diagnostics'] },
  '/api/agents/[id]/memory': { minRole: 'viewer', requireScopes: ['agent:self'] },
  '/api/agents/[id]/attribution': { minRole: 'viewer', requireScopes: ['agent:attribution'] },
  '/api/agents/[id]/soul': { minRole: 'viewer', requireScopes: ['agent:self'] },
  '/api/agents/[id]/files': { minRole: 'viewer', requireScopes: ['agent:self'] },

  // Communications & messaging
  '/api/agents/comms': { minRole: 'viewer', requireScopes: ['agent:messages'] },
  '/api/agents/message': { minRole: 'viewer', requireScopes: ['agent:messages'] },
  '/api/chat': { minRole: 'viewer', requireScopes: ['agent:messages'] },
  '/api/chat/': { minRole: 'viewer', requireScopes: ['agent:messages'] },
  '/api/comms': { minRole: 'viewer', requireScopes: ['agent:messages'] },
  '/api/inbox': { minRole: 'viewer', requireScopes: ['agent:messages'] },
  '/api/notifications': { minRole: 'viewer', requireScopes: ['agent:messages'] },
  '/api/notifications/deliver': { minRole: 'operator', requireScopes: ['agent:messages'] },

  // Fleet/ops
  '/api/fleet': { minRole: 'viewer', requireScopes: ['agent:research'] },
  '/api/fleet/': { minRole: 'viewer', requireScopes: ['agent:research'] },
  '/api/nodes': { minRole: 'viewer', requireScopes: ['agent:research'] },
  '/api/status': { minRole: 'viewer' },
  '/api/diagnostics': { minRole: 'viewer', requireScopes: ['agent:diagnostics'] },

  // Skills/memory/tools
  '/api/skills': { minRole: 'viewer', requireScopes: ['agent:research'] },
  '/api/skills/': { minRole: 'viewer', requireScopes: ['agent:research'] },
  '/api/memory': { minRole: 'viewer', requireScopes: ['agent:research'] },
  '/api/memory/': { minRole: 'viewer', requireScopes: ['agent:research'] },

  // Task execution
  '/api/tasks': { minRole: 'viewer', requireScopes: ['agent:self'] },
  '/api/tasks/': { minRole: 'viewer', requireScopes: ['agent:self'] },
  '/api/spawn': { minRole: 'operator' },
  '/api/sessions': { minRole: 'viewer', requireScopes: ['agent:self'] },
  '/api/sessions/': { minRole: 'viewer', requireScopes: ['agent:self'] },

  // Security-sensitive operations
  '/api/tokens': { minRole: 'admin' },
  '/api/tokens/': { minRole: 'admin' },
  '/api/security-scan': { minRole: 'operator' },
  '/api/security-scan/': { minRole: 'operator' },
  '/api/opsec': { minRole: 'operator' },
  '/api/crowdsec': { minRole: 'operator' },
  '/api/vault': { minRole: 'admin' },

  // Docker/containers/system
  '/api/containers': { minRole: 'operator' },
  '/api/docker': { minRole: 'operator' },
  '/api/system-monitor': { minRole: 'operator' },
  '/api/super/os-users': { minRole: 'admin' },
  '/api/settings': { minRole: 'admin' },
}

export function matchScopeRule(pathname: string): ScopeRule | null {
  // Exact match first
  if (ROUTE_SCOPE_MATRIX[pathname]) return ROUTE_SCOPE_MATRIX[pathname]

  // Prefix match from longest to shortest
  const segments = pathname.split('/').reverse()
  let candidate = ''
  for (const segment of segments) {
    candidate = `/${segment}${candidate}`
    const rule = ROUTE_SCOPE_MATRIX[candidate]
    if (rule) return rule
    if (!candidate.includes('[')) {
      const prefix = `${candidate}/`
      const prefixRule = ROUTE_SCOPE_MATRIX[prefix]
      if (prefixRule) return prefixRule
    }
  }

  return null
}
