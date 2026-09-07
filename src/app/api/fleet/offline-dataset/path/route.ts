import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import path from 'node:path'
import fs from 'node:fs'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const defaultPath = '/app/.data/offline-dataset'
  let exists = false
  let resolved = defaultPath
  try {
    exists = fs.existsSync(defaultPath)
  } catch {
    exists = false
  }
  return NextResponse.json({ status: 'ok', path: resolved, exists, ts: Date.now() })
}
