'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useMissionControl } from '@/store'
import { createClientLogger } from '@/lib/client-logger'
import { apiFetch } from '@/lib/api-client'
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts'

const log = createClientLogger('CostTracker')

// ── Types ──────────────────────────────────────────

interface TokenStats {
  totalTokens: number; totalCost: number; requestCount: number
  avgTokensPerRequest: number; avgCostPerRequest: number
}

interface UsageStats {
  summary: TokenStats
  models: Record<string, { totalTokens: number; totalCost: number; requestCount: number }>
  sessions: Record<string, { totalTokens: number; totalCost: number; requestCount: number }>
  timeframe: string
  recordCount: number
}

interface TrendData {
  trends: Array<{ timestamp: string; tokens: number; cost: number; requests: number }>
  timeframe: string
}

interface ByAgentModelBreakdown {
  model: string; input_tokens: number; output_tokens: number; request_count: number; cost: number
}

interface ByAgentEntry {
  agent: string; total_input_tokens: number; total_output_tokens: number
  total_tokens: number; total_cost: number; session_count: number
  request_count: number; last_active: string; models: ByAgentModelBreakdown[]
}

interface ByAgentResponse {
  agents: ByAgentEntry[]
  summary: { total_cost: number; total_tokens: number; agent_count: number; days: number }
}

interface TaskCostEntry {
  taskId: number; title: string; status: string; priority: string
  assignedTo?: string | null
  project: { id?: number | null; name?: string | null; slug?: string | null; ticketRef?: string | null }
  stats: TokenStats
  models: Record<string, TokenStats>
}

interface TaskCostsResponse {
  summary: TokenStats
  tasks: TaskCostEntry[]
  agents: Record<string, { stats: TokenStats; taskCount: number; taskIds: number[] }>
  unattributed: TokenStats
  timeframe: string
}

interface SessionCostEntry {
  sessionId: string; sessionKey?: string; model: string
  totalTokens: number; inputTokens: number; outputTokens: number
  totalCost: number; requestCount: number; firstSeen: string; lastSeen: string
}

// ── Helpers ──────────────────────────────────────────

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff6b6b']

const isFreeModel = (model?: string) => {
  if (!model) return false
  const key = model.toLowerCase()
  return /ollama|kimi|codex-mini|openrouter|anthropic\/claude-sonnet-4|claude-haiku/.test(key) && !/opus/.test(key)
}

const formatNumber = (num: number) => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toString()
}

const formatCost = (cost: number) => '$' + cost.toFixed(4)

const getModelDisplayName = (name: string) => name.split('/').pop() || name

type View = 'overview' | 'agents' | 'sessions' | 'tasks'
type Timeframe = 'hour' | 'day' | 'week' | 'month'

// ── Main Component ──────────────────────────────────

export function CostTrackerPanel() {
  const t = useTranslations('costTracker')
  const { sessions } = useMissionControl()

  const [view, setView] = useState<View>('overview')
  const [timeframe, setTimeframe] = useState<Timeframe>('day')
  const [chartMode, setChartMode] = useState<'incremental' | 'cumulative'>('incremental')
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Data
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [byAgentData, setByAgentData] = useState<ByAgentResponse | null>(null)
  const [taskData, setTaskData] = useState<TaskCostsResponse | null>(null)
  const [sessionCosts, setSessionCosts] = useState<SessionCostEntry[]>([])
  const [sessionSort, setSessionSort] = useState<'cost' | 'tokens' | 'requests' | 'recent'>('cost')
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)

  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const timeframeToDays = (tf: Timeframe): number => {
    switch (tf) { case 'hour': case 'day': return 1; case 'week': return 7; case 'month': return 30 }
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsJson, trendJson, byAgentJson, taskJson] = await Promise.all([
        apiFetch<UsageStats>(`/api/tokens?action=stats&timeframe=${timeframe}`),
        apiFetch<TrendData>(`/api/tokens?action=trends&timeframe=${timeframe}`),
        apiFetch<ByAgentResponse>(`/api/tokens/by-agent?days=${timeframeToDays(timeframe)}`),
        apiFetch<TaskCostsResponse>(`/api/tokens?action=task-costs&timeframe=${timeframe}`),
      ])
      setUsageStats(statsJson)
      setTrendData(trendJson)
      setByAgentData(byAgentJson)
      setTaskData(taskJson)
    } catch (err) {
      log.error('Failed to load cost data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [timeframe])

  const loadSessionCosts = useCallback(async () => {
    try {
      const data = await apiFetch<{ sessions?: SessionCostEntry[] }>(`/api/tokens?action=session-costs&timeframe=${timeframe}`)
      if (Array.isArray(data?.sessions)) {
        setSessionCosts(data.sessions)
      } else if (usageStats?.sessions) {
        setSessionCosts(Object.entries(usageStats.sessions).map(([id, stats]) => ({
          sessionId: id, model: '', totalTokens: stats.totalTokens, inputTokens: 0,
          outputTokens: 0, totalCost: stats.totalCost, requestCount: stats.requestCount,
          firstSeen: '', lastSeen: '',
        })))
      }
    } catch {
      if (usageStats?.sessions) {
        setSessionCosts(Object.entries(usageStats.sessions).map(([id, stats]) => ({
          sessionId: id, model: '', totalTokens: stats.totalTokens, inputTokens: 0,
          outputTokens: 0, totalCost: stats.totalCost, requestCount: stats.requestCount,
          firstSeen: '', lastSeen: '',
        })))
      }
    }
  }, [timeframe, usageStats])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    refreshTimer.current = setInterval(loadData, 30_000)
    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current) }
  }, [loadData])
  useEffect(() => { if (view === 'sessions') loadSessionCosts() }, [view, loadSessionCosts])

  const exportData = async (format: 'json' | 'csv') => {
    setIsExporting(true)
    try {
      const res = await apiFetch<Response>(`/api/tokens?action=export&timeframe=${timeframe}&format=${format}`, { raw: true })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'; a.href = url
      a.download = `cost-tracker-${timeframe}-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
    } catch (err) {
      log.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  // Derived data
  const summary = usageStats?.summary
  const agentSummary = byAgentData?.summary
  const agentList = byAgentData?.agents || []
  const maxAgentCost = Math.max(...agentList.map(a => a.total_cost), 0.0001)

  const freeRouterSummary = useMemo(() => {
    if (!agentList.length) return null
    const freeModels = new Set<string>()
    const paidModels = new Set<string>()
    let totalCtx = 0
    let ctxCount = 0
    for (const agent of agentList) {
      for (const m of agent.models || []) {
        const key = (m.model || '').toLowerCase()
        if (!key) continue
        const ctx = typeof (m as any).context_window === 'number' ? (m as any).context_window : 0
        if (ctx > 0) { totalCtx += ctx; ctxCount++ }
        if (/(ollama|kimi|codex-mini|openrouter\/moonshot|openrouter\/anthropic)/.test(key)) freeModels.add(key)
        else paidModels.add(key)
      }
    }
    return {
      freeModelCount: freeModels.size,
      paidModelCount: paidModels.size,
      avgContextWindow: ctxCount ? Math.round(totalCtx / ctxCount) : 0,
      freeSample: Array.from(freeModels).slice(0, 5),
      paidSample: Array.from(paidModels).slice(0, 5),
    }
  }, [agentList])

  const ctxWarnings = useMemo(() => {
    if (!agentList.length) return [] as Array<{ agent: string; model: string; context_window?: number }>
    const out: Array<{ agent: string; model: string; context_window?: number }> = []
    for (const agent of agentList) {
      for (const m of agent.models || []) {
        const key = (m.model || '').toLowerCase()
        const ctx = typeof (m as any).context_window === 'number' ? (m as any).context_window : undefined
        if (ctx && ctx > 100_000) out.push({ agent: agent.agent || 'agent', model: m.model || 'unknown', context_window: ctx })
      }
    }
    return out.slice(0, 20)
  }, [agentList])

  const getAgentTasks = (agentName: string): TaskCostEntry[] => {
    if (!taskData) return []
    const entry = taskData.agents[agentName]
    if (!entry) return []
    return taskData.tasks.filter(t => entry.taskIds.includes(t.taskId))
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6" role="region" aria-label="Cost Tracker">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="bg-surface-1 border border-border rounded px-2 py-1 text-xs"
          >
            <option value="hour">{t('timeframes.hour')}</option>
            <option value="day">{t('timeframes.day')}</option>
            <option value="week">{t('timeframes.week')}</option>
            <option value="month">{t('timeframes.month')}</option>
          </select>
          <Button onClick={loadData} variant="secondary" size="xs" disabled={isLoading}>
            {isLoading ? t('loading') : t('refresh')}
          </Button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex rounded-md border border-border overflow-hidden">
        {(['overview', 'agents', 'sessions', 'tasks'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1.5 text-xs font-medium ${view === v ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
            {t(`views.${v}`)}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <OverviewView
          stats={summary ? { summary, models: usageStats!.models, sessions: usageStats!.sessions, timeframe: usageStats!.timeframe, recordCount: usageStats!.recordCount } : null}
          trendData={trendData}
          agentSummary={agentSummary}
          taskData={taskData}
          timeframe={timeframe}
          chartMode={chartMode}
          setChartMode={setChartMode}
          exportData={exportData}
          isExporting={isExporting}
          onRefresh={loadData}
          freeRouterSummary={freeRouterSummary}
          ctxWarnings={ctxWarnings}
        />
      )}
      {view === 'agents' && (
        <AgentsView
          agents={agentList}
          summary={agentSummary}
          maxCost={maxAgentCost}
          expandedAgent={expandedAgent}
          setExpandedAgent={setExpandedAgent}
          getAgentTasks={getAgentTasks}
          onRefresh={loadData}
        />
      )}
      {view === 'sessions' && (
        <SessionsView
          sessions={sessionCosts}
          sort={sessionSort}
          onSortChange={setSessionSort}
          onRefresh={loadSessionCosts}
        />
      )}
      {view === 'tasks' && (
        <TasksView taskData={taskData} getAgentTasks={getAgentTasks} />
      )}
    </div>
  )
}

// ── Overview View ──────────────────────────────────

function OverviewView({
  stats, trendData, agentSummary, taskData, timeframe, chartMode, setChartMode,
  exportData, isExporting, onRefresh, freeRouterSummary, ctxWarnings,
}: {
  stats: UsageStats | null
  trendData: TrendData | null
  agentSummary: ByAgentResponse['summary'] | undefined
  taskData: TaskCostsResponse | null
  timeframe: Timeframe
  chartMode: 'incremental' | 'cumulative'
  setChartMode: (m: 'incremental' | 'cumulative') => void
  exportData: (f: 'json' | 'csv') => void
  isExporting: boolean
  onRefresh: () => void
  freeRouterSummary: {
    freeModelCount: number
    paidModelCount: number
    avgContextWindow: number
    freeSample: string[]
    paidSample: string[]
  } | null
  ctxWarnings: Array<{ agent: string; model: string; context_window?: number }>
}) {
  const t = useTranslations('costTracker')
  if (!stats) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <div className="text-lg mb-2">{t('noUsageData')}</div>
        <div className="text-sm max-w-sm mx-auto">
          {t('noUsageDataDesc')}
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm" className="mt-4 text-xs">{t('refresh')}</Button>
      </div>
    )
  }

  const modelData = Object.entries(stats.models)
    .map(([model, s]) => ({ name: getModelDisplayName(model), fullName: model, tokens: s.totalTokens, cost: s.totalCost, requests: s.requestCount }))
    .sort((a, b) => b.cost - a.cost)

  const pieData = modelData.slice(0, 6).map(m => ({ name: m.name, value: m.cost }))

  const trendChartData = (() => {
    if (!trendData?.trends) return [] as Array<{ time: string; tokens: number; cost: number; requests: number }>
    const raw = trendData.trends.map(t => ({
      time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tokens: t.tokens, cost: t.cost, requests: t.requests,
    }))
    if (chartMode === 'cumulative') {
      let ct = 0, cc = 0, cr = 0
      return raw.map(d => { ct += d.tokens; cc += d.cost; cr += d.requests; return { ...d, tokens: ct, cost: cc, requests: cr } })
    }
    return raw
  })()

  // Performance metrics
  const models = Object.entries(stats.models)
  const mostEfficient = models.length > 0
    ? models.reduce((best, curr) => {
        const c = curr[1].totalCost / Math.max(1, curr[1].totalTokens)
        const b = best[1].totalCost / Math.max(1, best[1].totalTokens)
        return c < b ? curr : best
      })
    : null
  const efficientCostPerToken = mostEfficient ? mostEfficient[1].totalCost / Math.max(1, mostEfficient[1].totalTokens) : 0
  const potentialSavings = Math.max(0, stats.summary.totalCost - stats.summary.totalTokens * efficientCostPerToken)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{formatCost(stats.summary.totalCost)}</div>
          <div className="text-sm text-muted-foreground">{t('totalCost', { timeframe })}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{formatNumber(stats.summary.totalTokens)}</div>
          <div className="text-sm text-muted-foreground">{t('totalTokens')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{formatNumber(stats.summary.requestCount)}</div>
          <div className="text-sm text-muted-foreground">{t('apiRequests')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{agentSummary?.agent_count ?? '-'}</div>
          <div className="text-sm text-muted-foreground">{t('activeAgents')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">
            {taskData ? `${((1 - taskData.unattributed.totalCost / Math.max(stats.summary.totalCost, 0.0001)) * 100).toFixed(0)}%` : '-'}
          </div>
          <div className="text-sm text-muted-foreground">{t('taskAttributed')}</div>
        </div>
      </div>

      {/* Free-token router + context budget summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Free-token router</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Free models routed: <span className="text-foreground">{freeRouterSummary?.freeModelCount ?? 0}</span></div>
              <div>Paid models in use: <span className="text-foreground">{freeRouterSummary?.paidModelCount ?? 0}</span></div>
              <div>Avg context window: <span className="text-foreground">{freeRouterSummary?.avgContextWindow ? formatNumber(freeRouterSummary.avgContextWindow) : '-'}</span></div>
              <div>Free samples: <span className="text-foreground">{freeRouterSummary?.freeSample?.join(', ') || '-'}</span></div>
              <div>Paid samples: <span className="text-foreground">{freeRouterSummary?.paidSample?.join(', ') || '-'}</span></div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-2">Context window watch</h3>
            {ctxWarnings.length === 0 ? (
              <div className="text-xs text-muted-foreground">No context windows above 100K tokens detected.</div>
            ) : (
              <div className="space-y-2">
                {ctxWarnings.map((w, i) => (
                  <div key={`${w.agent}-${w.model}-${i}`} className="flex items-center justify-between text-xs bg-secondary rounded px-3 py-2">
                    <div className="text-muted-foreground">{w.agent}</div>
                    <div className="font-mono text-foreground">{w.model}</div>
                    <div className="text-orange-400">{formatNumber(w.context_window ?? 0)} ctx</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend chart */}
        <div className="bg-card border border-border rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t('usageTrends')}</h2>
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['incremental', 'cumulative'] as const).map(m => (
                <button key={m} onClick={() => setChartMode(m)}
                  className={`px-2 py-1 text-[10px] font-medium ${chartMode === m ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}>{m === 'incremental' ? t('perTurn') : t('cumulative')}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {trendChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{t('noTrendData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" /><YAxis />
                  <Tooltip /><Legend />
                  <Line type="monotone" dataKey="tokens" stroke="#8884d8" strokeWidth={2} name="Tokens" />
                  <Line type="monotone" dataKey="requests" stroke="#82ca9d" strokeWidth={2} name="Requests" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Model bar chart */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('tokenUsageByModel')}</h2>
          <div className="h-64">
            {modelData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{t('noModelData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                  <YAxis /><Tooltip formatter={(v, n) => [formatNumber(Number(v)), n]} />
                  <Bar dataKey="tokens" fill="#8884d8" name="Tokens" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Cost pie */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('costDistributionByModel')}</h2>
          <div className="h-64">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{t('noCostData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCost(Number(v))} /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Performance insights */}
      {models.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('performanceInsights')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">{t('mostEfficientModel')}</div>
              <div className="text-lg font-bold text-green-500">{mostEfficient ? getModelDisplayName(mostEfficient[0]) : '-'}</div>
              {mostEfficient && <div className="text-xs text-muted-foreground">${(efficientCostPerToken * 1000).toFixed(4)}/1K tokens</div>}
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">{t('avgTokensPerRequest')}</div>
              <div className="text-lg font-bold text-foreground">{formatNumber(stats.summary.avgTokensPerRequest)}</div>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">{t('optimizationPotential')}</div>
              <div className="text-lg font-bold text-orange-500">{formatCost(potentialSavings)}</div>
              <div className="text-xs text-muted-foreground">{stats.summary.totalCost > 0 ? ((potentialSavings / stats.summary.totalCost) * 100).toFixed(1) : '0'}% {t('savingsPossible')}</div>
            </div>
          </div>
          {/* Model efficiency bars */}
          <div className="space-y-2">
            {modelData.map(m => {
              const costPer1k = m.cost / Math.max(1, m.tokens) * 1000
              const maxCostPer1k = Math.max(...modelData.map(d => d.cost / Math.max(1, d.tokens) * 1000), 0.0001)
              return (
                <div key={m.fullName} className="flex items-center text-sm">
                  <div className="w-32 truncate text-muted-foreground">{m.name}</div>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(costPer1k / maxCostPer1k) * 100}%` }} />
                    </div>
                  </div>
                  <div className="w-20 text-right text-xs text-muted-foreground">${costPer1k.toFixed(4)}/1K</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('exportData')}</h2>
            <p className="text-sm text-muted-foreground">{t('exportDataDesc')}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => exportData('csv')} disabled={isExporting} size="sm" variant="secondary">{isExporting ? t('exporting') : 'CSV'}</Button>
            <Button onClick={() => exportData('json')} disabled={isExporting} size="sm" variant="secondary">{isExporting ? t('exporting') : 'JSON'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Agents View ──────────────────────────────────

function AgentsView({
  agents, summary, maxCost, expandedAgent, setExpandedAgent, getAgentTasks, onRefresh,
}: {
  agents: ByAgentEntry[]; summary: ByAgentResponse['summary'] | undefined
  maxCost: number; expandedAgent: string | null
  setExpandedAgent: (a: string | null) => void
  getAgentTasks: (name: string) => TaskCostEntry[]; onRefresh: () => void
}) {
  const t = useTranslations('costTracker')
  const [expandedSection, setExpandedSection] = useState<'models' | 'tasks'>('tasks')

  if (!summary || agents.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <div className="text-lg mb-2">{t('noAgentData')}</div>
        <div className="text-sm">{t('noAgentDataDesc')}</div>
        <Button onClick={onRefresh} className="mt-4">{t('refresh')}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{summary.agent_count}</div>
          <div className="text-sm text-muted-foreground">{t('agents')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{formatCost(summary.total_cost)}</div>
          <div className="text-sm text-muted-foreground">{t('totalCostDays', { days: summary.days })}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{formatNumber(summary.total_tokens)}</div>
          <div className="text-sm text-muted-foreground">{t('totalTokens')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">
            {summary.total_tokens > 0 ? `$${(summary.total_cost / summary.total_tokens * 1000).toFixed(4)}` : '-'}
          </div>
          <div className="text-sm text-muted-foreground">{t('avgPer1kTokens')}</div>
        </div>
      </div>

      {/* Agent rows */}
      <div className="space-y-4">
        {agents.map(agent => {
          const tasks = getAgentTasks(agent.agent)
          const isExpanded = expandedAgent === agent.agent
          return (
            <div key={agent.agent} className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedAgent(isExpanded ? null : agent.agent)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    {agent.agent.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-foreground">{agent.agent}</div>
                    <div className="text-xs text-muted-foreground">
                      {agent.session_count} sessions · {agent.request_count} requests · last active {new Date(agent.last_active).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">{formatNumber(agent.total_tokens)}</div>
                    <div className="text-xs text-muted-foreground">tokens</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-500">{formatCost(agent.total_cost)}</div>
                    <div className="text-xs text-muted-foreground">cost</div>
                  </div>
                  <div className="w-24">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${(agent.total_cost / maxCost) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 py-4 border-t border-border bg-surface-1/30">
                  <div className="flex gap-2 mb-4">
                    <button onClick={() => setExpandedSection('models')}
                      className={`px-3 py-1 text-xs rounded ${expandedSection === 'models' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {t('models')}
                    </button>
                    <button onClick={() => setExpandedSection('tasks')}
                      className={`px-3 py-1 text-xs rounded ${expandedSection === 'tasks' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {t('tasks')} ({tasks.length})
                    </button>
                  </div>

                  {expandedSection === 'models' && (
                    <div className="space-y-2">
                      {agent.models.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-secondary rounded px-3 py-2">
                          <div className="text-muted-foreground">{getModelDisplayName(m.model)}</div>
                          <div className={`text-xs px-1.5 py-0.5 rounded border ${isFreeModel(m.model) ? 'border-green-500/40 text-green-500 bg-green-500/10' : 'border-border text-muted-foreground bg-background'}`}>{isFreeModel(m.model) ? 'Free' : 'Paid'}</div>
                          <div className="text-foreground">{formatNumber(m.request_count)} requests</div>
                          <div className="text-foreground">{formatNumber(m.input_tokens + m.output_tokens)} tokens</div>
                          <div className="text-green-500">{formatCost(m.cost)}</div>
                        </div>
                      ))}
                      {agent.models.length === 0 && (
                        <div className="text-sm text-muted-foreground">{t('noModelData')}</div>
                      )}
                    </div>
                  )}

                  {expandedSection === 'tasks' && (
                    <div className="space-y-2">
                      {tasks.map(task => (
                        <div key={task.taskId} className="flex items-center justify-between text-sm bg-secondary rounded px-3 py-2">
                          <div className="text-foreground">#{task.taskId} {task.title}</div>
                          <div className="text-muted-foreground">{task.status}</div>
                          <div className="text-foreground">{formatNumber(task.stats.totalTokens)} tokens</div>
                          <div className="text-green-500">{formatCost(task.stats.totalCost)}</div>
                        </div>
                      ))}
                      {tasks.length === 0 && (
                        <div className="text-sm text-muted-foreground">{t('noTaskData')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sessions View ──────────────────────────────────

function SessionsView({
  sessions, sort, onSortChange, onRefresh,
}: {
  sessions: SessionCostEntry[]; sort: 'cost' | 'tokens' | 'requests' | 'recent'
  onSortChange: (s: 'cost' | 'tokens' | 'requests' | 'recent') => void; onRefresh: () => void
}) {
  const t = useTranslations('costTracker')

  const sorted = useMemo(() => {
    const arr = [...sessions]
    arr.sort((a, b) => {
      switch (sort) {
        case 'tokens': return b.totalTokens - a.totalTokens
        case 'requests': return b.requestCount - a.requestCount
        case 'recent': return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
        default: return b.totalCost - a.totalCost
      }
    })
    return arr
  }, [sessions, sort])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('sessions')}</h2>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => onSortChange(e.target.value as any)} className="bg-surface-1 border border-border rounded px-2 py-1 text-xs">
            <option value="cost">{t('sortByCost')}</option>
            <option value="tokens">{t('sortByTokens')}</option>
            <option value="requests">{t('sortByRequests')}</option>
            <option value="recent">{t('sortByRecent')}</option>
          </select>
          <Button onClick={onRefresh} variant="secondary" size="xs">{t('refresh')}</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Session</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Model</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Tokens</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Cost</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Requests</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Last Seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map(s => (
              <tr key={s.sessionId} className="hover:bg-secondary/50">
                <td className="px-4 py-3 font-mono text-xs">{s.sessionId}</td>
                <td className="px-4 py-3 text-xs">{s.model || '-'}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(s.totalTokens)}</td>
                <td className={`px-4 py-3 text-right ${isFreeModel(s.model) ? 'text-green-500' : 'text-amber-500'}`}>{formatCost(s.totalCost)}</td>
                <td className="px-4 py-3 text-right">{s.requestCount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{s.lastSeen ? new Date(s.lastSeen).toLocaleString() : '-'}</td>
                <td className="px-4 py-3 text-xs">{isFreeModel(s.model) ? '🟢 free' : '🔴 paid'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t('noSessionData')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tasks View ──────────────────────────────────

function TasksView({
  taskData, getAgentTasks,
}: {
  taskData: TaskCostsResponse | null
  getAgentTasks: (name: string) => TaskCostEntry[]
}) {
  const t = useTranslations('costTracker')

  if (!taskData) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <div className="text-lg mb-2">{t('noTaskData')}</div>
        <Button onClick={() => {}} variant="outline" size="sm" className="mt-4 text-xs">{t('refresh')}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{formatCost(taskData.summary.totalCost)}</div>
          <div className="text-sm text-muted-foreground">{t('totalCost')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{formatNumber(taskData.summary.totalTokens)}</div>
          <div className="text-sm text-muted-foreground">{t('totalTokens')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{taskData.tasks.length}</div>
          <div className="text-sm text-muted-foreground">{t('tasks')}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="text-3xl font-bold text-foreground">{Object.keys(taskData.agents).length}</div>
          <div className="text-sm text-muted-foreground">{t('agents')}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Task</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Priority</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Assigned</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Tokens</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {taskData.tasks.map(task => (
              <tr key={task.taskId} className="hover:bg-secondary/50">
                <td className="px-4 py-3">#{task.taskId} {task.title}</td>
                <td className="px-4 py-3 capitalize">{task.status}</td>
                <td className="px-4 py-3 capitalize">{task.priority}</td>
                <td className="px-4 py-3 text-xs">{task.assignedTo || '-'}</td>
                <td className="px-4 py-3 text-right font-mono">{formatNumber(task.stats.totalTokens)}</td>
                <td className="px-4 py-3 text-right text-green-500">{formatCost(task.stats.totalCost)}</td>
              </tr>
            ))}
            {taskData.tasks.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('noTaskData')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
