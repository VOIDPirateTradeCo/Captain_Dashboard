import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateBody } from '@/lib/validation'

const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimits.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key)
  }
}, 60000)

export async function GET(_request: Request) {
  return NextResponse.json({
    status: 'ok',
    modes: ['search', 'extract', 'research'],
    rate_limit: { max_per_minute: 10, window_ms: 60000 },
  })
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const result = await validateBody(request, z.object({
    mode: z.enum(['search', 'extract', 'research']),
    query: z.string().min(1).max(500),
    urls: z.array(z.string().url()).optional(),
    depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
  }))
  if ('error' in result) return result.error

  const { mode, query, urls, depth } = result.data

  if (!checkRateLimit(token, 10, 60000)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const { runParallelCli } = await import('@/lib/parallel-cli')
    const output = await runParallelCli({ mode, query, urls, depth })
    return NextResponse.json({ mode, output })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
