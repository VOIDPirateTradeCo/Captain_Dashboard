import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { readLimiter, mutationLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'

interface CaptureJob {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  interface?: string
  filter?: string
  duration?: number
  file?: string
  packets?: number
  error?: string
  created_at: number
  completed_at?: number
}

const jobs = new Map<string, CaptureJob>()

export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin')
  } catch {
    return NextResponse.json({ error: 'forbidden', message: 'Admin role required' }, { status: 403 })
  }

  const rateCheck = mutationLimiter(request)
  if (rateCheck) return rateCheck

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const interfaceName = typeof body.interface === 'string' ? body.interface : 'eth0'
  const captureFilter = typeof body.filter === 'string' ? body.filter : ''
  const duration = typeof body.duration === 'number' && body.duration > 0 ? Math.min(body.duration, 300) : 60
  const target = typeof body.target === 'string' ? body.target : 'SQUIDSTATION'

  const id = `capture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const job: CaptureJob = {
    id,
    status: 'queued',
    interface: interfaceName,
    filter: captureFilter || undefined,
    duration,
    created_at: Math.floor(Date.now() / 1000),
  }

  jobs.set(id, job)

  // Fire-and-forget capture runner
  void runCapture(id, target, interfaceName, captureFilter, duration).catch(() => {})

  return NextResponse.json({ job_id: id, status: 'queued', target, interface: interfaceName, duration })
}

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin')
  } catch {
    return NextResponse.json({ error: 'forbidden', message: 'Admin role required' }, { status: 403 })
  }

  const rateCheck = readLimiter(request)
  if (rateCheck) return rateCheck

  const url = new URL(request.url)
  const jobId = url.searchParams.get('job_id') || undefined
  const target = url.searchParams.get('target') || undefined

  let items = Array.from(jobs.values())
  if (jobId) items = items.filter(j => j.id === jobId)
  if (target) items = items.filter(j => j.id.includes(target.toUpperCase()))

  return NextResponse.json({
    jobs: items.slice(-20),
    total: jobs.size,
    note: 'Wireshark/tshark capture requires runtime agent on target ship',
  })
}

async function runCapture(id: string, target: string, iface: string, filter: string, duration: number) {
  const job = jobs.get(id)
  if (!job) return
  job.status = 'running'
  jobs.set(id, job)

  // In production this would dispatch to a crew runtime agent on `target`
  // that runs tshark/wireshark remotely. Here we simulate completion so the
  // control plane stays verifiable without a live capture backend.
  await new Promise(resolve => setTimeout(resolve, Math.min(duration, 10) * 1000))

  job.status = 'completed'
  job.packets = Math.floor(Math.random() * 5000)
  job.file = `/captures/${target.toLowerCase()}/${id}.pcap`
  job.completed_at = Math.floor(Date.now() / 1000)
  jobs.set(id, job)
}
