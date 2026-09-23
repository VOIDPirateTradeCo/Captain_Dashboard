'use client'

import React, { useState } from 'react'

interface ResearchResult {
  mode: string
  status: string
  output?: string
  reason?: string
}

export default function ResearchPage() {
  const [mode, setMode] = useState<'search' | 'extract' | 'research'>('search')
  const [query, setQuery] = useState('')
  const [urls, setUrls] = useState('')
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard')
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const token = localStorage.getItem('mc_api_token') || ''
      const body: Record<string, unknown> = { mode, query, depth }
      if (urls.trim()) {
        body.urls = urls.split('\n').map(u => u.trim()).filter(Boolean)
      }

      const resp = await fetch('/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || `HTTP ${resp.status}`)
      } else {
        setResult(data)
      }
    } catch (_err: unknown) {
      setError(_err instanceof Error ? _err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Research</h1>
      <p className="text-muted-foreground mb-6">
        Dispatch search, extract, and research tasks through the Parallel CLI adapter.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mode</label>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as typeof mode)}
            className="w-full px-3 py-2 border rounded bg-background"
          >
            <option value="search">Search</option>
            <option value="extract">Extract</option>
            <option value="research">Research</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Query</label>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter search query or URL..."
            className="w-full px-3 py-2 border rounded bg-background"
            required
          />
        </div>

        {mode === 'extract' && (
          <div>
            <label className="block text-sm font-medium mb-1">URLs (one per line)</label>
            <textarea
              value={urls}
              onChange={e => setUrls(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 border rounded bg-background h-24"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Depth</label>
          <select
            value={depth}
            onChange={e => setDepth(e.target.value as typeof depth)}
            className="w-full px-3 py-2 border rounded bg-background"
          >
            <option value="quick">Quick</option>
            <option value="standard">Standard</option>
            <option value="deep">Deep</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Result</h2>
          <pre className="p-3 bg-muted rounded overflow-auto max-h-96 text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
