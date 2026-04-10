import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowsClockwise,
  WarningCircle,
  ClockCountdown,
  CreditCard,
  PauseCircle,
  ArrowSquareOut,
  Path,
  Wallet,
  ChartPieSlice,
  TrendUp,
  Files,
  CalendarCheck
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dashboardService, invoiceService, trademarkService } from '@/utils/api'
import { cn } from '@/lib/utils'
import { useAuthStore, canAccessFinance } from '@/store/authStore'

type QueueDeadline = {
  id: string
  case_id: string
  type: string
  due_date: string
  status?: string
  mark_name: string
  jurisdiction: string
  days_remaining: number
}

type QueueInvoice = {
  id: string
  invoice_number: string
  client_name: string
  total_amount: number
  currency: string
  status: string
  due_date?: string
}

type QueueCase = {
  id: string
  mark_name?: string
  markName?: string
  status?: string
  flow_stage?: string
  updated_at?: string
  created_at?: string
  deadlines?: Array<{
    id: string
    type: string
    status?: string
    due_date: string
  }>
  jurisdiction?: string
}

type DashboardResponse = {
  stats?: {
    activeTrademarks?: number
    pendingDeadlines?: number
    renewalWindow?: number
  }
}

const DAY_MS = 1000 * 60 * 60 * 24

const formatMoney = (value: number, currency: string) =>
  `${currency || 'ETB'} ${Number(value || 0).toLocaleString()}`

export default function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
   searchParams.get('tour') === 'true'

  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const [stats, setStats] = useState<DashboardResponse['stats']>({})
  const [dueIn7Days, setDueIn7Days] = useState<QueueDeadline[]>([])
  const [overdueActions, setOverdueActions] = useState<QueueDeadline[]>([])
  const [invoiceQueue, setInvoiceQueue] = useState<QueueInvoice[]>([])
  const [stalledCases, setStalledCases] = useState<QueueCase[]>([])
  const user = useAuthStore((state) => state.user)
  const financeEnabled = canAccessFinance(user)

  const loadDashboardData = useCallback(async (isAuto = false) => {
    try {
      if (!isAuto) setIsRefreshing(true)
      setError(null)

      const [dashboardDataRaw, invoicesRaw, casesRaw] = await Promise.all([
        dashboardService.getUnifiedDashboard().catch(async () => {
          const fallback = await dashboardService.getStats()
          return { stats: fallback }
        }),
        invoiceService.getAll().catch(() => []),
        trademarkService.getCases().catch(() => [])
      ])

      const dashboardData = (dashboardDataRaw || {}) as DashboardResponse
      const allInvoices = Array.isArray(invoicesRaw) ? invoicesRaw : []
      const allCases = Array.isArray(casesRaw) ? casesRaw : []

      setStats(dashboardData.stats || {})

      const now = Date.now()
      const extractedDeadlines: QueueDeadline[] = allCases.flatMap((c: QueueCase) =>
        (c.deadlines || []).map((d) => {
          const dueTime = new Date(d.due_date).getTime()
          const daysRemaining = Number.isFinite(dueTime)
            ? Math.ceil((dueTime - now) / DAY_MS)
            : 9999
          return {
            id: d.id,
            case_id: c.id,
            type: d.type,
            due_date: d.due_date,
            status: d.status,
            mark_name: c.mark_name || c.markName || 'Trademark',
            jurisdiction: c.jurisdiction || 'ET',
            days_remaining: daysRemaining
          }
        })
      )

      const pendingDeadlines = extractedDeadlines
        .filter((d) => (d.status || 'PENDING') === 'PENDING')
        .sort((a, b) => a.days_remaining - b.days_remaining)

      setDueIn7Days(pendingDeadlines.filter((d) => d.days_remaining >= 0 && d.days_remaining <= 7))
      setOverdueActions(pendingDeadlines.filter((d) => d.days_remaining < 0))

      setInvoiceQueue(
        allInvoices
          .filter((inv: QueueInvoice) => (inv.status || '').toUpperCase() !== 'PAID')
          .sort((a: QueueInvoice, b: QueueInvoice) => Number(b.total_amount || 0) - Number(a.total_amount || 0))
      )

      const stalled = allCases
        .filter((c: QueueCase) => {
          const ts = new Date(c.updated_at || c.created_at || '').getTime()
          if (!Number.isFinite(ts)) return false
          const ageDays = Math.floor((now - ts) / DAY_MS)
          const status = (c.status || '').toUpperCase()
          return ageDays > 14 && !['REGISTERED', 'WITHDRAWN', 'DEAD'].includes(status)
        })
        .sort((a: QueueCase, b: QueueCase) =>
          new Date(a.updated_at || a.created_at || 0).getTime() - new Date(b.updated_at || b.created_at || 0).getTime()
        )

      setStalledCases(stalled)
      setLastUpdated(new Date())
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: string } } }
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load dashboard queues.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(() => loadDashboardData(true), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadDashboardData])

  const summary = useMemo(
    () => [
      { id: 'due7', label: 'Due in 7 days', value: dueIn7Days.length, icon: ClockCountdown, color: 'text-amber-500' },
      { id: 'overdue', label: 'Overdue actions', value: overdueActions.length, icon: WarningCircle, color: 'text-red-500' },
      { id: 'invoiceQueue', label: 'Invoices awaiting payment', value: invoiceQueue.length, icon: CreditCard, color: 'text-blue-500' },
      { id: 'stalled', label: 'Cases stalled > 14 days', value: stalledCases.length, icon: PauseCircle, color: 'text-fuchsia-500' }
    ],
    [dueIn7Days.length, overdueActions.length, invoiceQueue.length, stalledCases.length]
  )

  

  const handleTourCallback = (data: { status: string }) => {
    if (['finished', 'skipped'].includes(data.status)) {
      searchParams.delete('tour')
      setSearchParams(searchParams)
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 font-black tracking-tight text-[var(--eai-text)]">Dashboard</h1>
          <p className="text-body font-medium text-[var(--eai-text-secondary)] flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            little text
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end text-right mr-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-[var(--eai-text-secondary)] opacity-50">Last Synchronized</span>
             <span className="text-micro font-bold">{lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 backdrop-blur-sm p-4 text-red-700 flex items-center gap-3 animate-in slide-in-from-top duration-500">
          <WarningCircle size={20} weight="fill" />
          <span className="text-micro font-bold">{error}</span>
        </div>
      )}

      {/* High-Impact Analytics Section */}
      <section id="ops-summary" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { id: 'due7', label: 'Due in 7 Days', value: dueIn7Days.length, icon: ClockCountdown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { id: 'overdue', label: 'Overdue Actions', value: overdueActions.length, icon: WarningCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
          ...(financeEnabled
            ? [{ id: 'invoices', label: 'Pending Payments', value: invoiceQueue.length, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' }]
            : []),
          { id: 'portfolio', label: 'Active Portfolio', value: stats?.activeTrademarks || 0, icon: ChartPieSlice, color: 'text-[var(--eai-primary)]', bg: 'bg-[var(--eai-primary)]/10' }
        ].map((card) => (
          <div key={card.id} className="apple-card group relative overflow-hidden p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 cursor-default">
            <div className={cn("absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500", card.color)}>
              <card.icon size={80} weight="duotone" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner", card.bg, card.color)}>
                <card.icon size={24} weight="bold" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-h1 font-black leading-none">{card.value}</span>
                <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 mt-1">
                  <TrendUp size={12} weight="bold" />
                  <span>Real-time</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[14px] font-black uppercase tracking-widest text-[var(--eai-text-secondary)] opacity-80">{card.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Main Command Queues */}
      <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <QueueCard
          id="queue-due7"
          title="Deadline Queue (7D)"
          icon={CalendarCheck}
          emptyText="Operational clean: No legal deadlines due this week."
          items={dueIn7Days}
          renderItem={(item) => (
            <QueueRow
              key={item.id}
              title={item.mark_name}
              meta={`${item.type.replaceAll('_', ' ')}`}
              badge={`${Math.max(item.days_remaining, 0)}d remaining`}
              badgeColor="bg-amber-500/10 text-amber-600 border-amber-500/20"
              actions={[
                { label: 'Matter', onClick: () => navigate(`/trademarks/${item.case_id}/detail`), icon: ArrowSquareOut },
                { label: 'Action', onClick: () => navigate(`/case-flow/${item.case_id}`), icon: Path }
              ]}
            />
          )}
        />

        <QueueCard
          id="queue-overdue"
          title="Critical: Overdue Actions"
          icon={WarningCircle}
          emptyText="Compliance green: No overdue legal actions."
          items={overdueActions}
          renderItem={(item) => (
            <QueueRow
              key={item.id}
              title={item.mark_name}
              meta={`${item.type.replaceAll('_', ' ')}`}
              badge={`${Math.abs(item.days_remaining)}d overdue`}
              badgeColor="bg-red-500/10 text-red-600 border-red-500/20"
              actions={[
                { label: 'Matter', onClick: () => navigate(`/trademarks/${item.case_id}/detail`), icon: ArrowSquareOut },
                { label: 'Resolve', onClick: () => navigate(`/case-flow/${item.case_id}`), icon: Path }
              ]}
            />
          )}
        />

        {financeEnabled && (
          <QueueCard
            id="queue-invoices"
            title="Financial Recovery Queue"
            icon={CreditCard}
            emptyText="Treasury clear: All invoices are fully paid."
            items={invoiceQueue}
            renderItem={(item) => (
              <QueueRow
                key={item.id}
                title={`${item.invoice_number || item.id} | ${item.client_name}`}
                meta={`${formatMoney(item.total_amount, item.currency)}`}
                badge={item.status}
                badgeColor="bg-blue-500/10 text-blue-600 border-blue-500/20"
                actions={[
                  { label: 'Ledger', onClick: () => navigate('/invoicing'), icon: ArrowSquareOut },
                  { label: 'Payment', onClick: () => navigate('/invoicing'), icon: Wallet }
                ]}
              />
            )}
          />
        )}

        <QueueCard
          id="queue-stalled"
          title="Audit: Stalled Matters"
          icon={PauseCircle}
          emptyText="Workflow active: No stalled cases right now."
          items={stalledCases}
          renderItem={(item) => (
            <QueueRow
              key={item.id}
              title={item.mark_name || item.markName || 'Trademark'}
              meta={`${item.flow_stage || item.status || 'Unknown Stage'}`}
              badge={`Idle ${Math.floor((Date.now() - new Date(item.updated_at || item.created_at || '').getTime()) / DAY_MS)}d`}
              badgeColor="bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20"
              actions={[
                { label: 'Matter', onClick: () => navigate(`/trademarks/${item.id}/detail`), icon: ArrowSquareOut },
                { label: 'Lifecycle', onClick: () => navigate(`/case-flow/${item.id}`), icon: Path }
              ]}
            />
          )}
        />
      </section>

      <footer className="apple-card p-6 bg-[var(--eai-bg)]/30 border-dashed">
        <div className="flex flex-wrap items-center justify-center gap-8 text-micro font-black uppercase tracking-widest text-[var(--eai-text-secondary)] opacity-50">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--eai-primary)]" />
            Active Marks: {stats?.activeTrademarks || 0}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Pending Deadlines: {stats?.pendingDeadlines || 0}
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Renewal Window: {stats?.renewalWindow || 0}
          </div>
        </div>
      </footer>
    </div>
  )
}

function QueueCard<T>({
  id,
  title,
  icon: Icon,
  items,
  emptyText,
  renderItem
}: {
  id: string
  title: string
  icon: any
  items: T[]
  emptyText: string
  renderItem: (item: T) => ReactNode
}) {
  return (
    <Card id={id} className="apple-card border-none shadow-xl overflow-hidden group">
      <CardHeader className="bg-[var(--eai-bg)]/30 border-b border-[var(--eai-border)] px-6 py-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-h3 flex items-center gap-2">
          <Icon size={20} className="text-[var(--eai-primary)]" weight="duotone" />
          {title}
        </CardTitle>
        <div className="text-micro font-black px-2 py-0.5 bg-[var(--eai-bg)] border border-[var(--eai-border)] rounded-md opacity-50 group-hover:opacity-100 transition-opacity">
          {items.length} total
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[var(--eai-border)]">
          {items.length === 0 ? (
            <div className="p-12 text-center">
               <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 mb-3">
                 <CalendarCheck size={24} weight="bold" />
               </div>
               <div className="text-body font-bold text-[var(--eai-text)]">{emptyText}</div>
               <div className="text-micro text-[var(--eai-text-secondary)] mt-1">Operational status normal.</div>
            </div>
          ) : (
            items.slice(0, 5).map((item) => renderItem(item))
          )}
        </div>
        {items.length > 5 && (
          <div className="p-3 bg-[var(--eai-bg)]/30 text-center border-t border-[var(--eai-border)]">
            <button className="text-micro font-black text-[var(--eai-primary)] hover:underline uppercase tracking-widest">
              View all {items.length} records
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QueueRow({
  title,
  meta,
  badge,
  badgeColor,
  actions
}: {
  title: string
  meta: string
  badge: string
  badgeColor: string
  actions: Array<{ label: string; onClick: () => void; icon: ComponentType<any> }>
}) {
  return (
    <div className="p-4 hover:bg-[var(--eai-bg)]/20 transition-colors group/row">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-body font-black text-[var(--eai-text)] truncate">{title}</div>
          <div className="text-micro font-bold text-[var(--eai-text-secondary)] mt-0.5 uppercase tracking-tight">{meta}</div>
        </div>
        <div className={cn("shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-md border", badgeColor)}>
          {badge}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--eai-border)] bg-white px-3 py-1.5 text-[11px] font-black text-[var(--eai-text)] hover:bg-[var(--eai-bg)] shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <action.icon size={14} weight="bold" className="text-[var(--eai-primary)]" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}


