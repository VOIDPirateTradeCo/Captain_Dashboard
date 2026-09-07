import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter } from '@/lib/rate-limit'
import { getDatabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  const db = getDatabase()
  const rows = db.prepare(`
    SELECT ship, report_at, cpu_percent, memory_percent, disk_percent, gpu_percent, extra
    FROM fleet_resources
    ORDER BY report_at DESC
    LIMIT 200
  `).all() as any[]

  const byShip: Record<string, any> = {}
  for (const row of rows) {
    if (!byShip[row.ship]) byShip[row.ship] = []
    byShip[row.ship].push(row)
  }

  return NextResponse.json({ status: 'ok', generated_at: Date.now(), ships: byShip })
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ship = String(body.ship || '').trim().toUpperCase()
  if (!ship) {
    return NextResponse.json({ error: 'ship is required' }, { status: 400 })
  }

  const reportAt = Number(body.report_at || Math.floor(Date.now() / 1000))
  const cpuPercent = typeof body.cpu_percent === 'number' ? body.cpu_percent : null
  const memoryPercent = typeof body.memory_percent === 'number' ? body.memory_percent : null
  const diskPercent = typeof body.disk_percent === 'number' ? body.disk_percent : null
  const gpuPercent = typeof body.gpu_percent === 'number' ? body.gpu_percent : null
  const extra = typeof body.extra === 'string' ? body.extra : JSON.stringify(body.extra || {})

  const db = getDatabase()
  db.prepare(`
    INSERT INTO fleet_resources (ship, report_at, cpu_percent, memory_percent, disk_percent, gpu_percent, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(ship, reportAt, cpuPercent, memoryPercent, diskPercent, gpuPercent, extra)

  return NextResponse.json({ status: 'ok', ship, report_at: reportAt })
}
