import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { requireRole } from '@/lib/auth'
import { readLimiter } from '@/lib/rate-limit'

let cachedSpec: string | null = null

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  if (!cachedSpec) {
    const specPath = join(process.cwd(), 'openapi.json')
    cachedSpec = readFileSync(specPath, 'utf-8')
  }

  return new NextResponse(cachedSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
