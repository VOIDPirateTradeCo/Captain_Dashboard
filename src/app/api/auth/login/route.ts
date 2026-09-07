import { NextResponse } from 'next/server'
import { authenticateUser, createSession, getUserById } from '@/lib/auth'
import { logAuditEvent, needsFirstTimeSetup, getDatabase } from '@/lib/db'
import { getMcSessionCookieName, getMcSessionCookieOptions, isRequestSecure } from '@/lib/session-cookie'
import { loginLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const MAX_FAILED_LOGINS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000

export async function POST(request: Request) {
  try {
    const rateCheck = loginLimiter(request)
    if (rateCheck) return rateCheck

    let { username, password }: { username?: string; password?: string } = {}
    const contentType = a.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await a.json().catch(() => ({}))
      username = body.username
      password = body.password
    } else {
      const form = await a.formData().catch(() => null)
      if (form) {
        username = form.get('username')
        password = form.get('password')
      }
    }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Check for account lockout
    const db = getDatabase()
    const failedRecord = db.prepare('SELECT * FROM failed_logins WHERE username = ?').get(username) as any
    if (failedRecord && failedRecord.failed_count >= MAX_FAILED_LOGINS) {
      const lastFailed = failedRecord.last_failed_at
      const now = Date.now()
      if (now - lastFailed < LOCKOUT_DURATION_MS) {
        const remainingMinutes = Math.ceil((LOCKOUT_DURATION_MS - (now - lastFailed)) / 60000)
        return NextResponse.json({ error: `Account locked. Try again in ${remainingMinutes} minutes.` }, { status: 429 })
      } else {
        // Lockout expired, reset
        db.prepare('DELETE FROM failed_logins WHERE username = ?').run(username)
      }
    }

    const user = authenticateUser(username, password)
    if (!user) {
      // Record failed login
      if (failedRecord) {
        db.prepare('UPDATE failed_logins SET failed_count = failed_count + 1, last_failed_at = ? WHERE username = ?').run(Date.now(), username)
      } else {
        db.prepare('INSERT INTO failed_logins (username, failed_count, last_failed_at) VALUES (?, 1, ?)').run(username, Date.now())
      }
      logAuditEvent({ action: 'login_failed', actor: username, ip_address: ipAddress, user_agent: userAgent })

      // When no users exist at all, give actionable feedback instead of "Invalid credentials"
      if (needsFirstTimeSetup()) {
        return NextResponse.json(
          {
            error: 'No admin account has been created yet',
            code: 'NO_USERS',
            hint: 'Visit /setup to create your admin account',
          },
          { status: 401 }
        )
      }

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Reset failed logins on success
    db.prepare('DELETE FROM failed_logins WHERE username = ?').run(username)

    const { token, expiresAt } = createSession(user.id, ipAddress, userAgent, user.workspace_id)

    // Update agent status on login
    try {
      const agentName = username.toLowerCase().replace(/[^a-z0-9]/g, '-')
      db.prepare('UPDATE agents SET status = ?, last_seen = ? WHERE name = ?').run('online', Math.floor(Date.now() / 1000), agentName)
    } catch { /* agent may not exist */ }

    logAuditEvent({ action: 'login', actor: user.username, actor_id: user.id, ip_address: ipAddress, user_agent: userAgent })

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        role: user.role,
        provider: user.provider || 'local',
        email: user.email || null,
        avatar_url: user.avatar_url || null,
        workspace_id: user.workspace_id ?? 1,
        tenant_id: user.tenant_id ?? 1,
      },
    })

    const isSecureRequest = isRequestSecure(request)
    const cookieName = getMcSessionCookieName(isSecureRequest)

    response.cookies.set(cookieName, token, {
      ...getMcSessionCookieOptions({ maxAgeSeconds: expiresAt - Math.floor(Date.now() / 1000), isSecureRequest }),
    })

    return response
  } catch (error) {
    logger.error({ err: error }, 'Login error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
