import { 
  WarningCircle, 
  Clock, 
  CheckCircle, 
  Gavel, 
  Globe, 
  ShieldCheck,
  ArrowSquareOut,
  CaretUp,
  ArrowsClockwise
} from '@phosphor-icons/react'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardService } from '../utils/api'
import { Button } from '@/components/ui/button'

const JURISDICTION_IMAGE_FLAGS: Record<string, string> = {
  ET: '/flags/ethiopia-flag.png',
  KE: '/flags/kenya-flag.png',
  ER: '/flags/eritrea-flag.png',
  DJ: '/flags/djibouti-flag.png',
  SO: '/flags/somalia-flag.png',
  SL: '/flags/somalia-flag.png',
  TZ: '/flags/tanzania-flag.webp',
  UG: '/flags/uganda-flag.png',
  RW: '/flags/rwanda-flag.png',
  BI: '/flags/burundi-flag.png',
}

const JurisdictionFlag = ({ code, className = "h-4 w-6" }: { code: string, className?: string }) => {
  const imgSrc = JURISDICTION_IMAGE_FLAGS[code];
  if (imgSrc) {
    return <img src={imgSrc} alt={code} className={`${className} object-cover rounded-sm shadow-sm`} />;
  }
  return <span className="text-[16px]">🌍</span>;
};

interface Deadline {
  id: string;
  type: string;
  due_date: string;
  mark_name: string;
  jurisdiction: string;
  days_remaining: number;
}

interface Activity {
  id: string;
  caseId: string;
  mark_name: string;
  action: string;
  createdAt: string;
}

interface DashboardStats {
  activeTrademarks?: number;
  pendingDeadlines?: number;
  renewalWindow?: number;
  recentActivity?: Activity[];
}

import Joyride, { Step } from 'react-joyride'
import { useSearchParams } from 'react-router-dom'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const startTour = searchParams.get('tour') === 'true'

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadDashboardData = useCallback(async (isAuto = false) => {
    try {
      if (!isAuto) setIsRefreshing(true)
      setError(null)
      
      const data = await dashboardService.getUnifiedDashboard()
      
      setStats({
        ...data.stats,
        recentActivity: data.recentActivity
      })
      
      setDeadlines(data.upcomingDeadlines.map((d: { due_date: string; }) => ({
        ...d,
        days_remaining: Math.ceil((new Date(d.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      })))
      
      setLastUpdated(new Date())
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      console.error('Failed to load dashboard', e)
      setError(err.response?.data?.message || 'Failed to sync dashboard data. Please check your connection.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      loadDashboardData(true)
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [loadDashboardData])

  const tourSteps: Step[] = [
    {
      target: '#dashboard-header',
      content: 'Welcome to your Trademark Practice Dashboard. Here you can see a high-level overview of your entire portfolio.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#stat-card-0',
      content: 'Track your Active Trademarks across all jurisdictions. Click here to view the full Docket.',
      placement: 'bottom',
    },
    {
      target: '#stat-card-1',
      content: 'Pending Actions shows tasks that require immediate attention from your legal team.',
      placement: 'bottom',
    },
    {
      target: '#recent-filings',
      content: 'This section logs the latest activity, including status changes and new applications.',
      placement: 'right',
    },
    {
      target: '#critical-deadlines',
      content: 'The Deadline Watchdog auto-calculates opposition and renewal dates to ensure you never miss a filing window.',
      placement: 'left',
    },
  ]

  const handleTourCallback = (data: { status: string }) => {
    const { status } = data
    if (['finished', 'skipped'].includes(status)) {
      // Remove tour param from URL
      searchParams.delete('tour')
      setSearchParams(searchParams)
    }
  }

  const statCards = [
    {
      label: 'Active Trademarks',
      value: stats?.activeTrademarks || 0,
      change: (stats?.activeTrademarks ?? 0) > 0 ? `+${stats?.activeTrademarks}` : '--',
      trend: (stats?.activeTrademarks ?? 0) > 0 ? 'up' : 'none',
      icon: ShieldCheck,
      color: 'var(--eai-primary)',
      path: '/trademarks'
    },
    {
      label: 'Pending Actions',
      value: stats?.pendingDeadlines || 0,
      change: 'Urgent',
      trend: 'none',
      icon: WarningCircle,
      color: 'var(--eai-critical)',
      path: '/deadlines'
    },
    {
      label: 'Renewal Window',
      value: stats?.renewalWindow || 0,
      change: 'Next 30d',
      trend: 'none',
      icon: Clock,
      color: 'var(--eai-warning)',
      path: '/deadlines'
    }
  ]

  if (loading) {
    return (
      <div className="w-full animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-40 bg-[var(--eai-border)]/50 rounded-lg" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-56 bg-[var(--eai-border)]/30 rounded" />
              <div className="h-1 w-1 rounded-full bg-[var(--eai-border)]/50" />
              <div className="h-4 w-32 bg-[var(--eai-border)]/30 rounded" />
            </div>
          </div>
          <div className="h-9 w-28 bg-[var(--eai-border)]/50 rounded-lg" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-3 mt-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="apple-card p-6">
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 bg-[var(--eai-border)]/40 rounded-xl" />
                <div className="h-5 w-16 bg-[var(--eai-border)]/30 rounded-full" />
              </div>
              <div className="mt-6 space-y-2">
                <div className="h-4 w-28 bg-[var(--eai-border)]/40 rounded" />
                <div className="h-10 w-16 bg-[var(--eai-border)]/50 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Two Column Section Skeleton */}
        <div className="grid gap-8 lg:grid-cols-2 mt-8">
          {/* Recent Filings Skeleton */}
          <div className="apple-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="h-7 w-32 bg-[var(--eai-border)]/50 rounded-lg" />
              <div className="h-5 w-20 bg-[var(--eai-border)]/30 rounded" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <div className="h-12 w-12 bg-[var(--eai-border)]/30 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-[var(--eai-border)]/40 rounded" />
                    <div className="h-4 w-1/2 bg-[var(--eai-border)]/30 rounded" />
                  </div>
                  <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Critical Deadlines Skeleton */}
          <div className="apple-card p-6 border-l-4 border-l-[var(--eai-border)]/30">
            <div className="mb-6 flex items-center justify-between">
              <div className="h-7 w-40 bg-[var(--eai-border)]/50 rounded-lg" />
              <div className="h-6 w-6 bg-[var(--eai-border)]/30 rounded" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl bg-[var(--eai-border)]/20 p-4">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 bg-[var(--eai-border)]/40 rounded" />
                      <div className="h-5 w-32 bg-[var(--eai-border)]/40 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-[var(--eai-border)]/30 rounded" />
                  </div>
                  <div className="h-4 w-48 bg-[var(--eai-border)]/30 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full print:p-0">
      <Joyride
        steps={tourSteps}
        run={startTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: 'var(--eai-primary)',
            textColor: '#1C1C1E',
            zIndex: 10000,
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltipContainer: {
            textAlign: 'left',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
          buttonNext: {
            borderRadius: '0px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonBack: {
            marginRight: '10px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonSkip: {
            fontSize: '13px',
            fontWeight: 'bold',
          }
        }}
      />
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="dashboard-header">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">Dashboard</h1>
          <div className="flex items-center gap-2">
            <p className="text-body text-[var(--eai-text-secondary)]">Overview of your trademark portfolio.</p>
            <span className="h-1 w-1 rounded-full bg-[var(--eai-border)]" />
            <p className="text-micro text-[var(--eai-text-secondary)] uppercase">Last synced: {lastUpdated.toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => loadDashboardData()}
            disabled={isRefreshing}
            className="apple-button-secondary gap-2"
          >
            <ArrowsClockwise size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <div className="mt-8 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WarningCircle size={20} className="text-red-600" weight="fill" />
            <p className="text-body font-semibold text-red-600">{error}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadDashboardData()}
            className="bg-white hover:bg-red-50 text-red-600 border-red-200"
          >
            Retry Connection
          </Button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3 mt-8" id="stats-grid">
        {statCards.map((stat, idx) => (
          <div 
            key={stat.label} 
            id={`stat-card-${idx}`}
            onClick={() => navigate(stat.path)}
            className="apple-card group p-6 cursor-pointer relative overflow-hidden"
          >
            {/* Cult-UI inspired background accent */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"
              style={{ backgroundColor: stat.color }}
            />
            
            <div className="flex items-start justify-between relative z-10">
              <div 
                className="flex h-12 w-12 items-center justify-center rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-sm"
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
              >
                <stat.icon size={28} weight="duotone" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={[
                  "text-micro px-2 py-0.5 rounded-full uppercase",
                  stat.change === 'Urgent' ? 'bg-[var(--eai-critical)]/10 text-[var(--eai-critical)]' : 'bg-[var(--eai-success)]/10 text-[var(--eai-success)]'
                ].join(' ')}>
                  {stat.change}
                </span>
                {stat.trend === 'up' && <CaretUp size={12} className="text-[var(--eai-success)]" weight="bold" />}
              </div>
            </div>
            <div className="mt-6 relative z-10">
              <div className="text-label mb-1">{stat.label}</div>
              <div className="text-h1 leading-none">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2 mt-8">
        {/* Recent Filings Section */}
        <div className="apple-card p-6" id="recent-filings">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-h2">Recent Filings</h2>
            <button 
              onClick={() => navigate('/trademarks')}
              className="text-label hover:text-[var(--eai-primary)] transition-colors flex items-center gap-1"
            >
              View all
              <ArrowSquareOut size={14} />
            </button>
          </div>
          <div className="space-y-4">
            {(stats?.recentActivity?.length ?? 0) > 0 ? (
              stats?.recentActivity?.map((activity: Activity) => (
                <div 
                  key={activity.id} 
                  onClick={() => navigate(`/trademarks/${activity.caseId}`)}
                  className="flex items-center gap-4 rounded-xl border border-transparent hover:border-[var(--eai-border)] hover:bg-[var(--eai-bg)]/50 p-3 transition-all cursor-pointer group"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--eai-bg)] text-[var(--eai-text-secondary)] group-hover:bg-white transition-colors shadow-sm">
                    <CheckCircle size={24} weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body font-bold text-[var(--eai-text)]">{activity.mark_name}</div>
                    <div className="text-micro text-[var(--eai-text-secondary)] uppercase">
                      {activity.action}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-micro text-[var(--eai-text-secondary)] font-medium">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="p-4 rounded-full bg-[var(--eai-bg)]">
                  <Globe size={32} className="text-[var(--eai-text-secondary)] opacity-20" />
                </div>
                <p className="text-body text-[var(--eai-text-secondary)]">No recent activity recorded.</p>
              </div>
            )}
          </div>
        </div>

        {/* Legal Alerts / Deadlines */}
        <div className="apple-card p-6 border-l-4 border-l-[var(--eai-warning)]" id="critical-deadlines">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-h2">Critical Deadlines</h2>
            <Gavel size={24} weight="duotone" className="text-[var(--eai-warning)]" />
          </div>
          <div className="space-y-4">
            {deadlines.length > 0 ? (
              deadlines.slice(0, 5).map((deadline) => {
                const isOverdue = deadline.days_remaining < 0;
                const isUrgent = deadline.days_remaining <= 7 && deadline.days_remaining >= 0;
                const bgColor = isOverdue ? 'bg-red-50/50 border-red-200' : isUrgent ? 'bg-orange-50/50 border-orange-200' : 'bg-[var(--eai-warning)]/5 border-[var(--eai-warning)]/10';
                const textColor = isOverdue ? 'text-red-700' : isUrgent ? 'text-orange-700' : 'text-[var(--eai-warning)]';
                
                return (
                  <div 
                    key={deadline.id}
                    onClick={() => navigate(`/trademarks`)}
                    className={`rounded-xl ${bgColor} p-4 cursor-pointer hover:opacity-80 transition-all border group`}
                  >
                    <div className={`flex justify-between font-bold text-body ${textColor}`}>
                      <span className="flex items-center gap-2">
                        <Clock size={18} />
                        {deadline.type === 'OPPOSITION_WINDOW' ? 'Opposition Window' : 
                         deadline.type === 'RENEWAL' ? 'Renewal Due' : 
                         deadline.type === 'RENEWAL_NOTICE' ? 'Renewal Notice' : 'Deadline'}
                      </span>
                      <span className="text-micro font-black uppercase">
                        {isOverdue ? `${Math.abs(deadline.days_remaining)}d overdue` : 
                         `${deadline.days_remaining}d left`}
                      </span>
                    </div>
                    <p className="mt-2 text-micro text-[var(--eai-text)]/80 flex items-center gap-2">
                      Mark: <span className="font-bold">{deadline.mark_name}</span> 
                      <JurisdictionFlag code={deadline.jurisdiction} className="h-3 w-4 ml-1" />
                      ({deadline.jurisdiction})
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="p-4 rounded-full bg-emerald-50 text-emerald-500">
                  <CheckCircle size={32} weight="duotone" />
                </div>
                <p className="text-body text-[var(--eai-text-secondary)]">No critical deadlines in the next 30 days</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
