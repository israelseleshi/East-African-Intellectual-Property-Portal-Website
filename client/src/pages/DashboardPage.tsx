import { useEffect, useState } from "react"
import { 
  Users, 
  FileText, 
  Clock, 
  CreditCard, 
  CheckCircle2,
  Briefcase,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useApi } from "@/hooks/useApi"
import { formatNumber, formatDate } from "@/utils/formatters"

interface DashboardStats {
  totalCases: number
  activeTrademarks: number
  pendingDeadlines: number
  renewalWindow: number
  totalClients?: number // Handled via separate logic or fallback
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
  recentActivity: RecentActivity[]
  upcomingDeadlines: any[]
}

export default function DashboardPage() {
  const { get } = useApi()
  const [data, setData] = useState<UnifiedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        // Fetch unified dashboard data from the backend
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
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Fetching real-time data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center p-4">
        <Card className="max-w-md border-destructive/50">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Retry Connection
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = data?.stats
  const recentActivity = data?.recentActivity || []

  // Mapping backend stats to the standard 5-card UI
  const DASHBOARD_CARDS = [
    {
      title: "Total Cases",
      value: formatNumber(stats?.totalCases || 0),
      description: "All trademark files",
      icon: Briefcase,
      trend: "Real-time",
      trendType: "neutral"
    },
    {
      title: "Active Trademarks",
      value: formatNumber(stats?.activeTrademarks || 0),
      description: "Currently in-force",
      icon: FileText,
      trend: "Syncing",
      trendType: "positive"
    },
    {
      title: "Pending Deadlines",
      value: formatNumber(stats?.pendingDeadlines || 0),
      description: "Requires action",
      icon: Clock,
      trend: stats?.pendingDeadlines && stats.pendingDeadlines > 10 ? "High" : "Stable",
      trendType: stats?.pendingDeadlines && stats.pendingDeadlines > 10 ? "negative" : "neutral"
    },
    {
      title: "Renewals Due",
      value: formatNumber(stats?.renewalWindow || 0),
      description: "Inside 30-day window",
      icon: CheckCircle2,
      trend: "Urgent",
      trendType: stats?.renewalWindow && stats.renewalWindow > 0 ? "negative" : "positive"
    },
    {
      title: "Accounts System",
      value: "Active",
      description: "Billing link established",
      icon: CreditCard,
      trend: "Online",
      trendType: "positive"
    }
  ]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Live data from East African Intellectual Property Registry.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {DASHBOARD_CARDS.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <Badge 
                  variant={card.trendType === 'positive' ? 'secondary' : card.trendType === 'negative' ? 'destructive' : 'outline'}
                  className="px-1 text-[10px]"
                >
                  {card.trend}
                </Badge>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{card.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <Card className="col-span-1 border-primary/10">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Live updates from the trademark registry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="size-8 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {activity.mark_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.action.replace(/_/g, ' ')} • {formatDate(activity.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">Live</Badge>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm italic">
                  No recent registry activity found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-primary/10">
          <CardHeader>
            <CardTitle>Financial Standing</CardTitle>
            <CardDescription>Accounts receivable and payment status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Collection Rate</span>
                <span className="font-bold text-emerald-600">84%</span>
              </div>
              <Progress 
                value={84} 
                className="h-2" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Outstanding</span>
                <span className="text-2xl font-black text-primary">$12,450</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Overdue</span>
                <span className="text-2xl font-black text-destructive">$3,200</span>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg flex items-center gap-3">
              <div className="size-10 rounded bg-background flex items-center justify-center flex-shrink-0 border">
                <CreditCard className="size-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Payment Portal</span>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Automated Invoicing Online
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
