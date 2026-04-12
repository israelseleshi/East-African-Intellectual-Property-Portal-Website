import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { 
  FileText, 
  Clock, 
  CheckCircle2,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  DollarSign,
  CreditCard
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useApi } from "@/hooks/useApi"
import { formatNumber, formatDate } from "@/utils/formatters"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/authStore"
import { Typography } from "@/components/ui/typography"
import DashboardCalendar from "@/components/DashboardCalendar"

interface DashboardStats {
  totalCases: number
  activeTrademarks: number
  pendingDeadlines: number
  renewalWindow: number
  totalInvoiced?: number
  totalOutstanding?: number
  totalOverdue?: number
  collectionRate?: number
}

interface CurrencyStats {
  currency: string
  totalInvoiced: number
  totalOutstanding: number
  totalOverdue: number
}

interface RecentActivity {
  id: number
  caseId: string
  action: string
  mark_name: string
  createdAt: string
}

interface UnifiedData {
  stats: DashboardStats
  currencyBreakdown?: CurrencyStats[]
  recentActivity: RecentActivity[]
  upcomingDeadlines: any[]
}

export default function DashboardPage() {
  const { get } = useApi()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const canViewFinance = user?.role === 'SUPER_ADMIN'
  const [data, setData] = useState<UnifiedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const result = await get('/dashboard/dashboard-unified')
        setData(result)
        setError(null)
      } catch (err: any) {
        console.error("Dashboard fetch error:", err)
        setError("Failed to load real-time dashboard data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [get])

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <div className="space-y-2">
          <Skeleton className="h-12 w-80" />
          <Skeleton className="h-5 w-96" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-5" />
              </div>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-5 w-40" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-4 mt-2">
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-40 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 rounded-lg" />
              </CardContent>
            </Card>
            {canViewFinance && (
              <Card className="border-primary/10">
                <CardHeader className="pb-3">
                  <Skeleton className="h-6 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-20 rounded-lg" />
                  <Skeleton className="h-20 rounded-lg" />
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="col-span-12 lg:col-span-8 border-primary/10">
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4 p-3">
                  <Skeleton className="size-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-6 w-14 rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center p-4">
        <Card className="max-w-md border-destructive/50">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle>Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Typography.pb className="text-muted-foreground mb-4">{error}</Typography.pb>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = data?.stats
  const recentActivity = data?.recentActivity || []

  const DASHBOARD_CARDS = [
    {
      title: "Total Cases",
      value: formatNumber(stats?.totalCases || 0),
      description: "All trademark files",
      icon: Briefcase,
      trend: "Real-time",
      trendType: "neutral",
      link: "/trademarks"
    },
    {
      title: "Active Trademarks",
      value: formatNumber(stats?.activeTrademarks || 0),
      description: "Currently in-force",
      icon: FileText,
      trend: "Syncing",
      trendType: "positive",
      link: "/trademarks"
    },
    {
      title: "Pending Deadlines",
      value: formatNumber(stats?.pendingDeadlines || 0),
      description: "Requires action",
      icon: Clock,
      trend: stats?.pendingDeadlines && stats.pendingDeadlines > 10 ? "High" : "Stable",
      trendType: stats?.pendingDeadlines && stats.pendingDeadlines > 10 ? "negative" : "neutral",
      link: "/deadlines"
    }
  ]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <Typography.h1a>Dashboard Overview</Typography.h1a>
        <Typography.pa className="text-muted-foreground">Live data from East African Intellectual Property Registry.</Typography.pa>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/eipa-forms/application-form')} className="gap-2 text-base px-5 py-5">
          <FileText className="size-5" />
          New Application
        </Button>
        <Button variant="outline" onClick={() => navigate('/eipa-forms/renewal-form')} className="gap-2 text-base px-5 py-5">
          <CheckCircle2 className="size-5" />
          New Renewal
        </Button>
        <Button variant="outline" onClick={() => navigate('/trademarks')} className="gap-2 text-base px-5 py-5">
          <Briefcase className="size-5" />
          View Trademarks
        </Button>
        <Button variant="outline" onClick={() => navigate('/deadlines')} className="gap-2 text-base px-5 py-5">
          <Clock className="size-5" />
          View Deadlines
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DASHBOARD_CARDS.map((card) => (
          <Card 
            key={card.title} 
            className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group p-5"
            onClick={() => navigate(card.link)}
          >
            <div className="flex items-center justify-between">
              <Typography.h4a className="truncate pr-2">{card.title}</Typography.h4a>
              <div className="flex items-center gap-2">
                <card.icon className="size-5 text-muted-foreground shrink-0" />
                <ChevronRight className="size-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="mt-3">
              <Typography.h2a className="text-primary">{card.value}</Typography.h2a>
              <div className="flex items-center gap-2 mt-2 overflow-hidden">
                <Badge 
                  variant={card.trendType === 'positive' ? 'secondary' : card.trendType === 'negative' ? 'destructive' : 'outline'}
                  className="text-xs px-2 py-0.5 shrink-0"
                >
                  {card.trend}
                </Badge>
                <Typography.small className="text-muted-foreground truncate">{card.description}</Typography.small>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bento Grid Layout - Calendar larger, Recent Activity smaller */}
      <div className="grid grid-cols-12 gap-4 mt-2">
        {/* Calendar - Large (8 cols) */}
        <div className="col-span-12 lg:col-span-8">
          <DashboardCalendar />
        </div>

        {/* Right side - Recent Activity and Financial (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* Recent Activity - Smaller card */}
          <Card className="border-primary/10">
            <CardHeader>
              <Typography.h4>Recent Activity</Typography.h4>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {recentActivity.length > 0 ? (
                  <>
                    {recentActivity.slice(0, 4).map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/trademarks/${activity.caseId}`)}
                      >
                        <div className="size-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="size-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Typography.small className="font-semibold leading-none truncate block">
                            {activity.mark_name}
                          </Typography.small>
                          <Typography.small className="text-muted-foreground mt-0.5 block text-xs">
                            {activity.action.replace(/_/g, ' ')} • {formatDate(activity.createdAt)}
                          </Typography.small>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length > 4 && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-sm py-5"
                        onClick={() => navigate('/trademarks')}
                      >
                        View all
                      </Button>
                    )}
                  </>
                ) : (
                  <Typography.small className="text-muted-foreground py-4 text-center italic">No recent activity</Typography.small>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Standing - Only for Super Admin */}
          {canViewFinance && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Financial Standing</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-sm"
                    onClick={() => navigate('/billing')}
                  >
                    View all
                  </Button>
                </div>
                <CardDescription>Accounts status by currency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Currency Breakdown */}
                {data?.currencyBreakdown && data.currencyBreakdown.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {data.currencyBreakdown.map((curr) => (
                      <div key={curr.currency} className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Typography.small className="uppercase font-semibold text-muted-foreground">
                            {curr.currency === 'USD' ? '🇺🇸' : curr.currency === 'ETB' ? '🇪🇹' : curr.currency === 'KES' ? '🇰🇪' : '💱'} {curr.currency}
                          </Typography.small>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Invoiced</span>
                            <Typography.h4 className="text-primary">{curr.currency === 'USD' ? '$' : curr.currency === 'ETB' ? 'ETB ' : curr.currency === 'KES' ? 'KES ' : ''}{formatNumber(curr.totalInvoiced || 0)}</Typography.h4>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Outstanding</span>
                            <Typography.small className="text-orange-600 font-semibold">{curr.currency === 'USD' ? '$' : curr.currency === 'ETB' ? 'ETB ' : curr.currency === 'KES' ? 'KES ' : ''}{formatNumber(curr.totalOutstanding || 0)}</Typography.small>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Overdue</span>
                            <Typography.small className="text-red-600 font-semibold">{curr.currency === 'USD' ? '$' : curr.currency === 'ETB' ? 'ETB ' : curr.currency === 'KES' ? 'KES ' : ''}{formatNumber(curr.totalOverdue || 0)}</Typography.small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 p-4 rounded-lg flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="size-4 text-muted-foreground" />
                          <Typography.small className="text-muted-foreground uppercase font-semibold">Outstanding</Typography.small>
                        </div>
                        <Typography.h3 className="text-primary">${formatNumber(stats?.totalOutstanding || 0)}</Typography.h3>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="size-4 text-red-500" />
                          <Typography.small className="text-red-600 uppercase font-semibold">Overdue</Typography.small>
                        </div>
                        <Typography.h3 className="text-red-600">${formatNumber(stats?.totalOverdue || 0)}</Typography.h3>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg flex items-center gap-4">
                      <div className="size-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="size-6 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <Typography.small className="text-muted-foreground font-medium">Total Invoiced</Typography.small>
                        <Typography.h3 className="text-primary">${formatNumber(stats?.totalInvoiced || 0)}</Typography.h3>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
