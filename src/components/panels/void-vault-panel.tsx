'use client'

/**
 * VOID Vault panel — Obsidian_Vault git-sync + vault stats + OPSEC rollup.
 *
 * All data via /api/void-proxy → dashboard_server.py on the host (0.0.0.0:8080).
 * Field shapes verified against live collector endpoints 2026-08-31.
 */

import { useCallback, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface Repo {
  repo: string
  exists: boolean
  branch?: string
  dirty?: boolean
  changes?: number
  error?: string
}
interface GitSyncResp {
  repos: Repo[]
  timestamp?: string
}
interface VaultStats {
  mounted?: boolean
  git_clean?: boolean
  latest_commit?: string
  file_count?: number
  size_mb?: number
  uncommitted_files?: number
}
interface VaultResp {
  vault: VaultStats
  opsec: Record<string, unknown>
}
interface OpsecResp {
  opsec: {
    shared_with_pink_gitignored?: boolean
    real_secrets_tracked?: number
    chinese_content_files?: number
    all_clear?: boolean
    deployed_modules?: Record<string, unknown>
  }
}

function useCollector<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await apiFetch<T>(`/api/void-proxy/${path}`))
      setErr(null)
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.code} ${e.status}` : e instanceof Error ? e.message : 'error')
    } finally {
      setLoading(false)
    }
  }, [path])
  useEffect(() => { void load() }, [load])
  return { data, err, loading, reload: load }
}

function truncate(s?: string, n = 80) {
  if (!s) return '—'
  return s.length > n ? `${s.slice(0, n - 3)}...` : s
}

export function VoidVaultPanel() {
  const gitSync = useCollector<GitSyncResp>('git-sync')
  const vault = useCollector<VaultResp>('vault')
  const opsec = useCollector<OpsecResp>('opsec')

  const reloadAll = () => {
    gitSync.reload()
    vault.reload()
    opsec.reload()
  }

  const dirtyRepos = (gitSync.data?.repos || []).filter(r => r.dirty)
  const vaultClean = vault.data?.vault?.git_clean && (vault.data?.vault?.uncommitted_files || 0) === 0
  const opsecClear = opsec.data?.opsec?.all_clear && !(opsec.data?.opsec?.real_secrets_tracked as number | undefined)
  const opsecOk = Boolean(opsecClear)

  return (
    <div className="p-6 space-y-6 max-w-5xl" role="region" aria-label="Void Vault">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Vault (VOID)</h1>
          <p className="text-xs text-muted-foreground">
            {vault.data?.vault
              ? `${vault.data.vault.file_count ?? 0} files · ${vault.data.vault.size_mb ?? 0} MB`
              : 'via host collector'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reloadAll}>Refresh</Button>
      </div>

      {(gitSync.err || vault.err || opsec.err) && (
        <p className="text-xs text-red-500">collector: {gitSync.err || vault.err || opsec.err}</p>
      )}

      {/* OPSEC */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">OPSEC</h2>
          <span className={`rounded px-1.5 py-0.5 text-[11px] ${opsecOk ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'}`}>
            {opsecOk ? 'GREEN' : 'RED'}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div>Shared_With_Pink gitignored: {opsec.data?.opsec?.shared_with_pink_gitignored ? 'yes' : 'no'}</div>
          <div>Tracked secret matches: {opsec.data?.opsec?.real_secrets_tracked ?? '—'}</div>
          <div>Chinese content files: {opsec.data?.opsec?.chinese_content_files ?? '—'}</div>
        </div>
      </div>

      {/* Vault */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Obsidian_Vault</h2>
        {vault.data?.vault ? (
          <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div><span className="text-foreground">mounted</span> {vault.data.vault.mounted ? 'yes' : 'no'}</div>
            <div><span className="text-foreground">git</span> {vault.data.vault.git_clean ? 'clean' : `dirty (${vault.data.vault.uncommitted_files ?? 0} uncommitted)`}</div>
            <div><span className="text-foreground">files</span> {vault.data.vault.file_count ?? '—'}</div>
            <div><span className="text-foreground">size</span> {vault.data.vault.size_mb ?? '—'} MB</div>
            <div><span className="text-foreground">latest commit</span> {truncate(vault.data.vault.latest_commit, 80)}</div>
          </dl>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{vault.loading ? 'loading…' : vault.err || 'no data'}</p>
        )}
      </div>

      {/* Git sync */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <h2 className="text-sm font-medium text-foreground">Git sync</h2>
          <span className={`text-[11px] ${dirtyRepos.length ? 'text-red-500' : 'text-green-500'}`}>
            {dirtyRepos.length ? `${dirtyRepos.length} dirty` : 'clean'}
          </span>
        </div>
        {gitSync.data?.repos ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-3 py-2">repo</th>
                <th className="px-3 py-2">branch</th>
                <th className="px-3 py-2">dirty</th>
                <th className="px-3 py-2">changes</th>
              </tr>
            </thead>
            <tbody>
              {gitSync.data.repos.map(r => (
                <tr key={r.repo} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 text-foreground">{r.repo}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.branch || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs`}>
                      <span className={`inline-block h-2 w-2 rounded-full ${r.dirty ? 'bg-red-500' : 'bg-green-500'}`} />
                      {r.exists ? (r.dirty ? 'dirty' : 'clean') : 'missing'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.changes ?? '—'}</td>
                </tr>
              ))}
              {!gitSync.data.repos.length && !gitSync.loading && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground">no repos reported</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <p className="px-3 py-4 text-xs text-muted-foreground">{gitSync.loading ? 'loading…' : gitSync.err || 'no data'}</p>
        )}
      </div>
    </div>
  )
}
