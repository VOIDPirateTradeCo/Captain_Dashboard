/**
 * Agent Scoped Permissions Framework
 * 
 * Extends role-based access control (viewer/operator/admin) with
 * per-agent permission scopes that limit what each agent can access.
 * 
 * Permission model:
 * - Role determines base access level (viewer=0, operator=1, admin=2)
 * - Scope defines which resources an agent can access within their level
 * - Workspace isolation ensures agents only see their own workspace data
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getUserFromRequest, type User } from './auth'

// Permission scopes define what actions an agent can perform
export type PermissionScope =
  | 'tasks:read'
  | 'tasks:write'
  | 'tasks:delete'
  | 'agents:read'
  | 'agents:write'
  | 'agents:delete'
  | 'skills:read'
  | 'skills:write'
  | 'skills:install'
  | 'settings:read'
  | 'settings:write'
  | 'terminal:execute'
  | 'browser:control'
  | 'filesystem:read'
  | 'filesystem:write'

// Role-to-permission mapping (base permissions per role)
const ROLE_PERMISSIONS: Record<string, PermissionScope[]> = {
  viewer: [
    'tasks:read',
    'agents:read',
    'skills:read',
    'settings:read',
    'filesystem:read',
  ],
  operator: [
    'tasks:read',
    'tasks:write',
    'agents:read',
    'agents:write',
    'skills:read',
    'skills:write',
    'settings:read',
    'terminal:execute',
    'browser:control',
    'filesystem:read',
    'filesystem:write',
  ],
  admin: [
    'tasks:read',
    'tasks:write',
    'tasks:delete',
    'agents:read',
    'agents:write',
    'agents:delete',
    'skills:read',
    'skills:write',
    'skills:install',
    'settings:read',
    'settings:write',
    'terminal:execute',
    'browser:control',
    'filesystem:read',
    'filesystem:write',
  ],
}

// Agent-specific overrides (optional per-agent restrictions)
// Stored in database, loaded at runtime
// { agent_id, workspace_id, grants: PermissionScope[], revokes: PermissionScope[] }

/**
 * Check if a user has a specific permission scope
 */
export function hasPermission(user: User, scope: PermissionScope): boolean {
  const basePermissions = ROLE_PERMISSIONS[user.role] || []
  return basePermissions.includes(scope)
}

/**
 * Get all permissions for a user
 */
export function getUserPermissions(user: User): PermissionScope[] {
  return ROLE_PERMISSIONS[user.role] || []
}

/**
 * Middleware-style permission check for API routes
 * Usage: const auth = requirePermission(request, 'tasks:write')
 *        if ('error' in auth) return auth.error
 *        // auth.user is the authenticated user
 */
export function requirePermission(
  request: NextRequest,
  scope: PermissionScope
): { user: User; error?: never } | { user?: never; error: NextResponse } {
  const user = getUserFromRequest(request)
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }
  if (!hasPermission(user, scope)) {
    return {
      error: NextResponse.json(
        { error: `Permission denied: ${scope} required` },
        { status: 403 }
      ),
    }
  }
  return { user }
}

/**
 * Require multiple permissions (all must be present)
 */
export function requireAllPermissions(
  request: NextRequest,
  scopes: PermissionScope[]
): { user: User; error?: never } | { user?: never; error: NextResponse } {
  const user = getUserFromRequest(request)
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }
  const missing = scopes.filter(s => !hasPermission(user, s))
  if (missing.length > 0) {
    return {
      error: NextResponse.json(
        { error: `Permission denied: ${missing.join(', ')} required` },
        { status: 403 }
      ),
    }
  }
  return { user }
}

/**
 * Require at least one of the specified permissions
 */
export function requireAnyPermission(
  request: NextRequest,
  scopes: PermissionScope[]
): { user: User; error?: never } | { user?: never; error: NextResponse } {
  const user = getUserFromRequest(request)
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }
  const has = scopes.some(s => hasPermission(user, s))
  if (!has) {
    return {
      error: NextResponse.json(
        { error: `Permission denied: one of ${scopes.join(', ')} required` },
        { status: 403 }
      ),
    }
  }
  return { user }
}

/**
 * Get permission matrix as a readable object (for documentation/API)
 */
export function getPermissionMatrix(): Record<string, PermissionScope[]> {
  return { ...ROLE_PERMISSIONS }
}
