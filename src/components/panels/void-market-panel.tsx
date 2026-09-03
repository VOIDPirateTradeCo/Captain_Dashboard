'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { apiFetch, ApiError } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

interface TwelveDataQuote {
  symbol?: string
  name?: string
  exchange?: string
  datetime?: string
  open?: string
  high?: string
  low?: string
  close?: string
  volume?: string
  previous_close?: string
  change?: string
  percent_change?: string
  [key: string]: string | undefined
}

export function VoidMarketPanel() {
  const t = useTranslations('panels.voidMarket')
  const [symbol, setSymbol] = useState('BTC/USD')
  const [type, setType] = useState('quote')
  const [interval, setInterval] = useState('1min')
  const [exchange, setExchange] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TwelveDataQuote | null>(null)

  const fetchMarket = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('symbol', symbol)
      params.set('type', type)
      params.set('interval', interval)
      if (exchange.trim()) params.set('exchange', exchange.trim())
      const result = await apiFetch<TwelveDataQuote>(`/api/void-market?${params.toString()}`)
      setData(result)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load market data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarket()
  }, [])

  const numericField = (value?: string) => {
    if (!value || Number.isNaN(Number(value))) return '—'
    return Number(value).toLocaleString()
  }

  const changeColor = (value?: string) => {
    if (!value || Number.isNaN(Number(value))) return 'text-muted-foreground'
    return Number(value) >= 0 ? 'text-emerald-400' : 'text-red-400'
  }

  return (
    <div className="rounded-lg border border-border/30 bg-surface-1/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">Market</h3>
          <p className="text-xs text-muted-foreground">Twelve Data — symbols, quotes, and intervals</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchMarket} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
        <div className="col-span-2 md:col-span-1">
          <label className="text-2xs text-muted-foreground">Symbol</label>
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="mt-1 w-full rounded border border-border/40 bg-black/20 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="text-2xs text-muted-foreground">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="mt-1 w-full rounded border border-border/40 bg-black/20 px-2 py-1 text-xs"
          >
            <option value="quote">Quote</option>
            <option value="price">Price</option>
            <option value="time_series">Time series</option>
          </select>
        </div>
        <div>
          <label className="text-2xs text-muted-foreground">Interval</label>
          <input
            value={interval}
            onChange={e => setInterval(e.target.value)}
            className="mt-1 w-full rounded border border-border/40 bg-black/20 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="text-2xs text-muted-foreground">Exchange</label>
          <input
            value={exchange}
            onChange={e => setExchange(e.target.value)}
            className="mt-1 w-full rounded border border-border/40 bg-black/20 px-2 py-1 text-xs"
          />
        </div>
      </div>

      {error && <p className="text-2xs text-red-400 mb-2">{error}</p>}

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded border border-border/30 bg-black/10 p-2">
            <p className="text-2xs text-muted-foreground">Symbol</p>
            <p className="text-xs font-medium">{data.symbol || data['1. symbol'] || '—'}</p>
            <p className="text-2xs text-muted-foreground">{data.name || '—'}</p>
            <p className="text-2xs text-muted-foreground">{data.exchange || '—'}</p>
          </div>
          <div className="rounded border border-border/30 bg-black/10 p-2">
            <p className="text-2xs text-muted-foreground">Close</p>
            <p className="text-xs font-medium">{numericField(data.close || data['4. close'])}</p>
          </div>
          <div className="rounded border border-border/30 bg-black/10 p-2">
            <p className="text-2xs text-muted-foreground">Change</p>
            <p className={`text-xs font-medium ${changeColor(data.change)}`}>{numericField(data.change)}</p>
            <p className={`text-2xs ${changeColor(data.percent_change)}`}>{numericField(data.percent_change)}%</p>
          </div>
          <div className="rounded border border-border/30 bg-black/10 p-2">
            <p className="text-2xs text-muted-foreground">Volume</p>
            <p className="text-xs font-medium">{numericField(data.volume || data['5. volume'])}</p>
            <p className="text-2xs text-muted-foreground">{data.datetime || '—'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
