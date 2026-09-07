import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, getUserById, updateUser, requireRole } from '@/lib/auth'
import { logAuditEvent } from '@/lib/db'
import { identitySecurityMutationLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/**
 * POST /api/auth/users/password
 * Body: { currentPassword?, newPassword, userId? }
 *
 * - If userId is provided and caller is admin: admin-reset for that user.
 * - If userId is omitted: self-service password change using currentPassword.
 */
export async function POST(request: NextRequest) {
  const currentUser = getUserFromRequest(request)
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { currentPassword, newPassword, userId } = body as {
    currentPassword?: string
    newPassword?: string
    userId?: number
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 12) {
    return NextResponse.json({ error: 'New password must be at least 12 characters' }, { status: 400 })
  }

  const isAdmin = currentUser.role === 'admin'
  const targetId = typeof userId === 'number' ? userId : currentUser.id

  if (targetId !== currentUser.id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate-limit per-actor to slow brute-force password changes
  const rateKey = `${currentUser.tenant_id ?? 1}:${currentUser.workspace_id ?? 1}:${currentUser.id}:password`
  const rateCheck = identitySecurityMutationLimiter(rateKey)
  if (rateCheck) return rateCheck

  const target = getUserById(targetId)
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Self-service requires current password verification
  if (targetId === currentUser.id) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }
    const auth = requireRole(request, 'viewer')
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    // Reuse local auth verifier via auth module
    const { authenticateUser } = await import('@/lib/auth')
    const verified = authenticateUser(currentUser.username, currentPassword)
    if (!verified) {
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      logAuditEvent({
        action: 'password_change_failed',
        actor: currentUser.username,
        actor_id: currentUser.id,
        target_type: 'user',
        target_id: targetId,
        detail: { reason: 'invalid_current_password' },
        ip_address: ip,
      })
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }
  }

  const updated = updateUser(targetId, { password: newPassword })
  if (!updated) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  logAuditEvent({
    action: targetId === currentUser.id ? 'password_change_self' : 'password_admin_reset',
    actor: currentUser.username,
    actor_id: currentUser.id,
    target_type: 'user',
    target_id: targetId,
    detail: {
      target_username: target.username,
      mode: targetId === currentUser.id ? 'self' : 'admin_reset',
    },
    ip_address: ip,
  })

  return NextResponse.json({
    success: true,
    user: {
      id: updated.id,
      username: updated.username,
      display_name: updated.display_name,
    },
  })
}
