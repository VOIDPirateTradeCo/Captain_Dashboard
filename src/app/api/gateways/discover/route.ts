import { NextRequest, NextResponse } from 'next/server'
import { execFileSync } from 'node:child_process'
import { requireRole } from '@/lib/auth'
import { config } from '@/lib/config'

interface DiscoveredGateway {
  host: string
  port: number
  active: boolean
  description: string
  source: 'config' | 'scan' | 'systemd'
}

/**
 * GET /api/gateways/discover
 * Discovers OpenClaw gateways via:
 * - Local config (always works, cross-platform)
 * - systemd service scanning (Linux)
 * - Port scanning localhost (fallback)
 */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, 'viewer')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const discovered: DiscoveredGateway[] = []
  const seenPorts = new Set<number>()

  // 1. Always add the locally configured gateway first
  if (config.gatewayHost && config.gatewayPort) {
    let active = false
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)
      const res = await fetch(`http://${config.gatewayHost}:${config.gatewayPort}/health`, {
        signal: controller.signal,
      })
      active = res.ok
      clearTimeout(timeout)
    } catch {
      // not reachable
    }

    discovered.push({
      host: config.gatewayHost,
      port: config.gatewayPort,
      active,
      description: 'Configured gateway (local)',
      source: 'config',
    })
    seenPorts.add(config.gatewayPort)
  }

  // 2. Linux: scan systemd services
  if (process.platform === 'linux') {
    try {
      const output = execFileSync('systemctl', [
        'list-units', '--type=service', '--plain', '--no-legend', '--no-pager',
      ], { encoding: 'utf-8', timeout: 3000 })

      const gwLines = output.split('\n').filter(l => l.includes('openclaw') && l.includes('gateway'))

      for (const line of gwLines) {
        const parts = line.trim().split(/\s+/)
        const serviceName = parts[0] || ''
        const state = parts[2] || ''
        const description = parts.slice(4).join(' ').replace(/[()]/g, '').trim()

        let port = 0
        try {
          const pidOutput = execFileSync('systemctl', [
            'show', serviceName, '--property=ExecMainPID', '--value',
          ], { encoding: 'utf-8', timeout: 2000 }).trim()
          const pid = parseInt(pidOutput, 10)
          if (pid > 0) {
            const ssOutput = execFileSync('ss', ['-ltnp'], {
              encoding: 'utf-8', timeout: 2000,
            })
            const pidPattern = `pid=${pid},`
            for (const ssLine of ssOutput.split('\n')) {
              if (ssLine.includes(pidPattern)) {
                const portMatch = ssLine.match(/:(\d+)\s/)
                if (portMatch) { port = parseInt(portMatch[1], 10); break }
              }
            }
          }
        } catch { /* ignore */ }

        if (port && !seenPorts.has(port)) {
          discovered.push({
            host: '127.0.0.1',
            port,
            active: state === 'active',
            description: description || 'OpenClaw Gateway (systemd)',
            source: 'systemd',
          })
          seenPorts.add(port)
        }
      }
    } catch {
      // systemctl not available — skip
    }
  }

  // 3. Windows: check common OpenClaw ports via netstat
  if (process.platform === 'win32') {
    const commonPorts = [18789, 8080, 3000, 3100, 11434]
    try {
      const netstat = execFileSync('netstat', ['-ano'], { encoding: 'utf-8', timeout: 3000 })
      for (const port of commonPorts) {
        if (seenPorts.has(port)) continue
        const listening = netstat.includes(`:${port}`) && netstat.includes('LISTENING')
        if (listening) {
          // Verify it's actually an OpenClaw gateway
          let isActive = false
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 2000)
            const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: controller.signal })
            isActive = res.ok
            clearTimeout(timeout)
          } catch { /* not reachable */ }

          discovered.push({
            host: '127.0.0.1',
            port,
            active: isActive,
            description: `Gateway on port ${port} (detected)`,
            source: 'scan',
          })
          seenPorts.add(port)
        }
      }
    } catch {
      // netstat failed — skip
    }
  }

  return NextResponse.json({ gateways: discovered })
}
