'use client'

/**
 * Hive Memory panel — fleet shared memory browser.
 * Read/write the hive-mind directly from MC.
 */

import { useCallback, useEffect, useState } from 'react'
import { apiFetch, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface MemoryEntry {
  id: number
  agent_name: string
  memory_type: string
  content: string
  importance: number
  created_at: number
  updated_at: number
}

function timeAgo(seconds?: number) {
  if (!seconds) return ''
  const now = Math.floor(Date.now() / 1000)
  const diff = now - seconds
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function HiveMemoryPanel() {
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [agentFilter, setAgentFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [content, setContent] = useState('')
  const [importance, setImportance] = useState(0)
  const [agentName, setAgentName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (agentFilter) params.set('agent_name', agentFilter)
      if (typeFilter) params.set('memory_type', typeFilter)
      params.set('limit', '100')
      const resp = await apiFetch<{ entries: MemoryEntry[]; total: number }>(`/api/hive/memory?${params}`)
      setEntries(resp.entries)
      setTotal(resp.total)
      setErr(null)
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.code} ${e.status}` : e instanceof Error ? e.message : 'error')
    } finally {
      setLoading(false)
    }
  }, [agentFilter, typeFilter])

  useEffect(() => { void load() }, [load])

  async function submitMemory(e: React.FormEvent) {
    e.preventDefault()
    try {
      await apiFetch('/api/hive/memory', {
        method: 'POST',
        body: JSON.stringify({ agent_name: agentName, content, importance, memory_type: typeFilter || 'general' }),
        headers: { 'Content-Type': 'application/json' },
      })
      setContent('')
      setAgentName('')
      setImportance(0)
      void load()
    } catch (e) {
      setErr(e instanceof ApiError ? `${e.code} ${e.status}` : 'Failed to write memory')
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Hive Memory</h1>
          <p className="text-xs text-muted-foreground">Fleet shared memory · {total} entries</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>Refresh</Button>
      </div>

      {err && <p className="text-xs text-red-500">{err}</p>}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          placeholder="Agent name..."
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="rounded border border-border bg-card px-2 py-1 text-xs"
        />
        <input
          placeholder="Memory type..."
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-border bg-card px-2 py-1 text-xs"
        />
        <Button variant="outline" size="sm" onClick={() => void load()}>Filter</Button>
      </div>

      {/* Write */}
      <form onSubmit={submitMemory} className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex gap-2">
          <input
            placeholder="Agent name (e.g. SirGreen)"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            required
            className="flex-1 rounded border border-border bg-card px-2 py-1 text-xs"
          />
          <input
            placeholder="Type (general/plan/finding)"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-32 rounded border border-border bg-card px-2 py-1 text-xs"
          />
          <input
            placeholder="Importance 0-10"
            type="number"
            min="0"
            max="10"
            value={importance}
            onChange={(e) => setImportance(parseInt(e.target.value) || 0)}
            className="w-20 rounded border border-border bg-card px-2 py-1 text-xs"
          />
        </div>
        <div className="flex gap-2">
          <textarea
            placeholder="Memory content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={2}
            className="flex-1 rounded border border-border bg-card px-2 py-1 text-xs resize-none"
          />
          <Button type="submit" size="sm">Write</Button>
        </div>
      </form>

      {/* Memory list */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Content</th>
              <th className="px-3 py-2">Imp</th>
              <th className="px-3 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-2 font-medium text-foreground text-xs">{e.agent_name}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{e.memory_type}</td>
                <td className="px-3 py-2 text-xs text-foreground max-w-xs truncate">{e.content}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{e.importance}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{timeAgo(e.created_at)}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">no memory entries</td></tr>
            )}
            {loading && (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-xs text-muted-foreground">loading...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
