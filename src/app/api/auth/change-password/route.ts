import { NextResponse } from 'next/server';
import { getUserFromRequest, updateUser, createSession, authenticateUser, destroyAllUserSessions } from '@/lib/auth';
import { getMcSessionCookieName, getMcSessionCookieOptions, isRequestSecure } from '@/lib/session-cookie';
import { logAuditEvent } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/change-password
 * Body: { old_password: string, new_password: string }
 * Requires authenticated session cookie.
 */
export async function POST(request: Request) {
  try {
    // Get user from session
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { old_password, new_password } = await request.json();
    if (!old_password || !new_password) {
      return NextResponse.json({ error: 'Old password and new password are required' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    // Verify old password
    const verified = authenticateUser(user.username, old_password);
    if (!verified) {
      logAuditEvent({
        action: 'password_change_failed',
        actor: user.username,
        actor_id: user.id,
        detail: 'Old password incorrect',
      });
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    // Update password using existing hashPassword path
    const updated = updateUser(user.id, { password: new_password });
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    // Destroy all existing sessions before creating new one
    destroyAllUserSessions(user.id);

    // Rotate session token (security best practice — invalidate old sessions)
    const { token, expiresAt } = createSession(
      user.id,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || undefined,
      user.workspace_id
    );

    logAuditEvent({
      action: 'password_changed',
      actor: user.username,
      actor_id: user.id,
    });

    const response = NextResponse.json({ success: true, message: 'Password updated successfully' });

    const isSecureRequest = isRequestSecure(request);
    const cookieName = getMcSessionCookieName(isSecureRequest);
    response.cookies.set(cookieName, token, {
      ...getMcSessionCookieOptions({ maxAgeSeconds: expiresAt - Math.floor(Date.now() / 1000), isSecureRequest }),
    });

    return response;
  } catch (error) {
    logger.error({ err: error }, 'Change password error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
