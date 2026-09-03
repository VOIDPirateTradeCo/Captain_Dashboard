import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null })
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      provider: user.provider,
      email: user.email,
      avatar_url: user.avatar_url,
      is_approved: user.is_approved,
    }
  })
}
