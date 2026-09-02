import { execSync } from 'child_process'
import { copyFileSync, existsSync } from 'fs'
import { join, basename } from 'path'

export interface BackupReplicationTarget {
  id: string
  label: string
  host: string
  sharePath: string
  mappedDrive?: string
}

export interface BackupReplicationResult {
  targetId: string
  ok: boolean
  path?: string
  error?: string
  skipped?: boolean
}

export const DEFAULT_BACKUP_TARGETS: BackupReplicationTarget[] = [
  {
    id: 'stealthattack',
    label: 'STEALTHATTACK',
    host: '192.168.0.68',
    sharePath: '\\\\192.168.0.68\\Backups\\MissionControl',
  },
  {
    id: 'pinkcady',
    label: 'PINKCADY',
    host: '192.168.0.3',
    sharePath: '\\\\192.168.0.3\\Backups\\MissionControl',
  },
]

export function getReplicationTargets(): BackupReplicationTarget[] {
  const raw = process.env.MC_BACKUP_TARGETS || ''
  if (!raw.trim()) return DEFAULT_BACKUP_TARGETS
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as BackupReplicationTarget[]
  } catch {
    // ignore bad env config
  }
  return DEFAULT_BACKUP_TARGETS
}

export async function replicateBackup(sourcePath: string): Promise<BackupReplicationResult[]> {
  const results: BackupReplicationResult[] = []
  const targets = getReplicationTargets()
  const fileName = basename(sourcePath)

  for (const target of targets) {
    try {
      const destPath = resolveDestination(target, fileName)
      copyFileSync(sourcePath, destPath)
      if (!existsSync(destPath)) {
        throw new Error('replication_failed')
      }
      results.push({ targetId: target.id, ok: true, path: destPath })
    } catch (error: any) {
      const message = error?.message || 'replication_failed'
      const unreachable = /network name cannot be found|system error 53|system error 67|no such file/i.test(message)
      results.push({
        targetId: target.id,
        ok: false,
        skipped: unreachable,
        error: unreachable ? `Unreachable: ${target.host} ${target.sharePath}` : message,
      })
    }
  }

  return results
}

function resolveDestination(target: BackupReplicationTarget, fileName: string): string {
  if (target.mappedDrive) {
    return join(target.mappedDrive, fileName)
  }
  return join(target.sharePath, fileName)
}
