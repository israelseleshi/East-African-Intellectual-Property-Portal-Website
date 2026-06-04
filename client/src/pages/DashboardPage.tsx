import { useMemo, useCallback } from "react"
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
import { useDashboardData } from "@/hooks/useSwr"
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

// Static card configuration - outside component for stable reference
const CARD_CONFIG = [
  {
    title: "Total Cases",
    description: "All trademark files",
    icon: Briefcase,
    trend: "Real-time",
    trendType: "neutral" as const,
    link: "/trademarks",
    getValue: (stats: DashboardStats) => formatNumber(stats?.totalCases || 0),
  },
  {
    title: "Active Trademarks",
    description: "Currently in-force",
    icon: FileText,
    trend: "Syncing",
    trendType: "positive" as const,
    link: "/trademarks",
    getValue: (stats: DashboardStats) => formatNumber(stats?.activeTrademarks || 0),
  },
  {
    title: "Pending Deadlines",
    description: "Requires action",
    icon: Clock,
    trend: "Stable",
    trendType: "neutral" as const,
    link: "/deadlines",
    getValue: (stats: DashboardStats) => {
      const value = stats?.pendingDeadlines || 0;
      return { value: formatNumber(value), trend: value > 10 ? "High" : "Stable", trendType: value > 10 ? "negative" as const : "neutral" as const };
    },
  },
] as const;

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const canViewFinance = user?.role === 'SUPER_ADMIN'
  
  const { data, error, isLoading, mutate } = useDashboardData()

  const stats = data?.stats;
  const recentActivity = data?.recentActivity || [];

  // Memoize dashboard cards
  const DASHBOARD_CARDS = useMemo(() => {
    return CARD_CONFIG.map((config) => {
      const valueOrObj = config.getValue(stats as DashboardStats);
      if (typeof valueOrObj === 'object') {
        return {
          ...config,
          value: formatNumber((stats?.pendingDeadlines || 0)),
          trend: valueOrObj.trend,
          trendType: valueOrObj.trendType,
        };
      }
      return {
        ...config,
        value: valueOrObj,
      };
    });
  }, [stats]);

  // Memoize navigation handler
  const handleCardClick = useCallback((link: string) => {
    navigate(link);
  }, [navigate]);

  // Memoize activity click handler
  const handleActivityClick = useCallback((caseId: string) => {
    navigate(`/trademarks/${caseId}`);
  }, [navigate]);

  // Memoize retry handler
  const handleRetry = useCallback(() => {
    mutate();
  }, [mutate]);

  if (isLoading) {
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
            <Typography.p className="text-muted-foreground mb-4">
              Failed to load real-time dashboard data. Please try again.
            </Typography.p>
            <Button 
              onClick={handleRetry}
              className="w-full"
            >
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-10 min-h-screen bg-[#F8F9FA]">
      <div className="flex flex-col gap-2">
        <Typography.h1 className="tracking-tight">Dashboard Overview</Typography.h1>
        <Typography.p className="text-muted-foreground text-lg">Real-time insights from the East African Intellectual Property Registry.</Typography.p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Button onClick={() => navigate('/eipa-forms/application-form')} className="gap-2 text-base px-6 py-6 shadow-sm hover:shadow-md transition-all">
          <FileText className="size-5" />
          New Application
        </Button>
        <Button variant="outline" onClick={() => navigate('/eipa-forms/renewal-form')} className="gap-2 text-base px-6 py-6 hover:bg-white transition-all shadow-sm">
          <CheckCircle2 className="size-5" />
          New Renewal
        </Button>
        <Button variant="outline" onClick={() => navigate('/trademarks')} className="gap-2 text-base px-6 py-6 hover:bg-white transition-all shadow-sm">
          <Briefcase className="size-5" />
          View Trademarks
        </Button>
        <Button variant="outline" onClick={() => navigate('/deadlines')} className="gap-2 text-base px-6 py-6 hover:bg-white transition-all shadow-sm">
          <Clock className="size-5" />
          View Deadlines
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DASHBOARD_CARDS.map((card) => (
          <Card 
            key={card.title} 
            className="overflow-hidden cursor-pointer border-none shadow-sm hover:shadow-premium transition-all duration-500 group p-8 bg-white"
            onClick={() => handleCardClick(card.link)}
          >
            <div className="flex items-center justify-between">
              <Typography.h4 className="truncate pr-2 text-muted-foreground font-medium">{card.title}</Typography.h4>
              <div className="flex items-center gap-2">
                <card.icon className="size-6 text-primary/40 group-hover:text-primary transition-colors shrink-0" />
                <ChevronRight className="size-4 text-primary/40 shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            <div className="mt-4">
              <Typography.h2 className="text-4xl font-bold text-primary tracking-tight">{card.value}</Typography.h2>
              <div className="flex items-center gap-3 mt-4 overflow-hidden">
                <Badge 
                  variant={card.trendType === 'positive' ? 'success' : card.trendType === 'negative' ? 'destructive' : 'info'}
                  className="px-2.5 py-1"
                >
                  {card.trend}
                </Badge>
                <Typography.small className="text-muted-foreground truncate font-medium">{card.description}</Typography.small>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bento Grid Layout - Calendar larger, Recent Activity smaller */}
      <div className="grid grid-cols-12 gap-6 mt-2">
        {/* Calendar - Large (8 cols) */}
        <div className="col-span-12 lg:col-span-8">
          <DashboardCalendar />
        </div>

        {/* Right side - Recent Activity and Financial (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Recent Activity - Smaller card */}
          <Card className="border-none shadow-sm hover:shadow-premium transition-all duration-500 bg-white">
            <CardHeader className="pb-2">
              <Typography.h4 className="font-semibold tracking-tight">Recent Activity</Typography.h4>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {recentActivity.length > 0 ? (
                  <>
                    {recentActivity.slice(0, 5).map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all cursor-pointer group/item"
                        onClick={() => handleActivityClick(activity.caseId)}
                      >
                        <div className="size-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/10 transition-colors">
                          <Briefcase className="size-5 text-primary/60 group-hover/item:text-primary transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Typography.small className="font-semibold leading-none truncate block text-primary">
                            {activity.mark_name}
                          </Typography.small>
                          <Typography.small className="text-muted-foreground mt-1 block text-[10px] uppercase tracking-wider font-bold">
                            {activity.action.replace(/_/g, ' ')} • {formatDate(activity.createdAt)}
                          </Typography.small>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length > 5 && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-xs py-4 mt-2 hover:bg-primary/5 text-primary font-semibold"
                        onClick={() => navigate('/trademarks')}
                      >
                        View all activity
                      </Button>
                    )}
                  </>
                ) : (
                  <Typography.small className="text-muted-foreground py-8 text-center italic">No recent activity detected</Typography.small>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Standing - Only for Super Admin */}
          {canViewFinance && (
            <Card className="border-none shadow-sm hover:shadow-premium transition-all duration-500 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold tracking-tight text-primary">Financial Status</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/5"
                    onClick={() => navigate('/billing')}
                  >
                    Details
                  </Button>
                </div>
                <CardDescription className="text-xs">Summary by currency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Currency Breakdown */}
                {data?.currencyBreakdown && data.currencyBreakdown.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {data.currencyBreakdown.map((curr) => (
                      <div key={curr.currency} className="bg-muted/20 p-5 rounded-2xl border border-muted/50 hover:border-primary/20 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{curr.currency === 'USD' ? '🇺🇸' : curr.currency === 'ETB' ? '🇪🇹' : curr.currency === 'KES' ? '🇰🇪' : '💱'}</span>
                            <Typography.small className="uppercase font-bold tracking-widest text-muted-foreground text-[10px]">
                              {curr.currency} Account
                            </Typography.small>
                          </div>
                          <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-muted-foreground/10">Active</Badge>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Invoiced</span>
                            <Typography.h4 className="text-primary font-bold">{curr.currency === 'USD' ? '$' : curr.currency === 'ETB' ? 'ETB ' : curr.currency === 'KES' ? 'KES ' : ''}{formatNumber(curr.totalInvoiced || 0)}</Typography.h4>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-muted/30">
                            <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
                            <span className="text-sm text-orange-600 font-bold">{curr.currency === 'USD' ? '$' : curr.currency === 'ETB' ? 'ETB ' : curr.currency === 'KES' ? 'KES ' : ''}{formatNumber(curr.totalOutstanding || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Overdue</span>
                            <span className="text-sm text-red-600 font-bold">{curr.currency === 'USD' ? '$' : curr.currency === 'ETB' ? 'ETB ' : curr.currency === 'KES' ? 'KES ' : ''}{formatNumber(curr.totalOverdue || 0)}</span>
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
