'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-client'

interface AgentSummary {
  agent: string
  runtime: string
  host: string
  files: number
  totalBytes: number
  totalEntries: number
}

interface ConversationHit {
  agent: string
  sessionId: string
  sessionTitle: string | null
  role: string
  snippet: string
  timestamp: number
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function fmtTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString()
}

export default function FleetMemoryPage() {
  const [summary, setSummary] = useState<AgentSummary[] | null>(null)
  const [loadingSum, setLoadingSum] = useState(true)

  const [query, setQuery] = useState('')
  const [days, setDays] = useState('30')
  const [hits, setHits] = useState<ConversationHit[] | null>(null)
  const [hitCount, setHitCount] = useState(0)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoadingSum(true)
    try {
      const data = await apiFetch<{ agents?: AgentSummary[] }>('/api/fleet-memory?summary=1')
      setSummary(data.agents || [])
    } catch {
      setSummary([])
    } finally {
      setLoadingSum(false)
    }
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setHits(null)
    try {
      const data = await apiFetch<{ matches?: number; results?: ConversationHit[] }>(
        `/api/conversations?q=${encodeURIComponent(query)}&days=${days}`
      )
      setHits(data.results || [])
      setHitCount(data.matches || 0)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const byAgent = new Map<string, number>()
  if (hits) {
    for (const h of hits) byAgent.set(h.agent, (byAgent.get(h.agent) || 0) + 1)
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-2">Fleet Memory</h1>
      <p className="text-sm opacity-70 mb-6">
        All agent memory across the fleet — SQUIDSTATION, PINKCADY, STEALTHATTACK.
        Pushers run every 6h on remote PCs.
      </p>

      {/* Agent summary */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Indexed Agents</h2>
        {loadingSum ? (
          <p className="opacity-60">Loading…</p>
        ) : summary && summary.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {summary.map((a) => (
              <div key={a.agent} className="border rounded p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{a.agent}</span>
                  <span className="text-xs uppercase opacity-60 bg-black/10 dark:bg-white/10 rounded px-2 py-0.5">
                    {a.runtime}
                  </span>
                </div>
                <div className="text-xs opacity-70 mt-1">host: {a.host}</div>
                <div className="text-sm mt-2">
                  {a.files} files · {fmtBytes(a.totalBytes)} · {a.totalEntries} entries
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="opacity-60">No agents indexed yet.</p>
        )}
      </section>

      {/* Conversation search */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Conversation Search</h2>
        <p className="text-sm opacity-70 mb-3">
          Search chat history across all fleet agents — &quot;what did the Captain say about X&quot;.
        </p>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4 flex-wrap">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all agent conversations…"
            className="flex-1 min-w-64 border rounded px-3 py-2 bg-transparent"
          />
          <select value={days} onChange={(e) => setDays(e.target.value)} className="border rounded px-2 py-2 bg-transparent">
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="border rounded px-4 py-2 disabled:opacity-50"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchError && <p className="text-red-500 text-sm mb-3">{searchError}</p>}

        {hits && (
          <>
            <div className="text-sm opacity-70 mb-3">
              {hitCount} matches
              {byAgent.size > 0 && (
                <span className="ml-2">
                  ({Array.from(byAgent.entries()).map(([a, c]) => `${a}: ${c}`).join(' · ')})
                </span>
              )}
            </div>
            <div className="space-y-2">
              {hits.slice(0, 50).map((h, i) => (
                <div key={`${h.agent}-${h.timestamp}-${i}`} className="border rounded p-3 text-sm">
                  <div className="flex items-center gap-2 text-xs opacity-70 mb-1 flex-wrap">
                    <span className="font-mono font-semibold">{h.agent}</span>
                    <span className="uppercase">{h.role}</span>
                    <span>{fmtTime(h.timestamp)}</span>
                    {h.sessionTitle && <span className="truncate">— {h.sessionTitle}</span>}
                  </div>
                  <p className="whitespace-pre-wrap break-words opacity-90">{h.snippet}</p>
                </div>
              ))}
              {hits.length === 0 && <p className="opacity-60">No matches.</p>}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
