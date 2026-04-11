"use client"

import { motion, type Variants } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Clock,
  AlertCircle,
  CreditCard,
  PauseCircle,
  ChartPie,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Users,
  FileText,
  Search,
  Plus,
  Zap,
  TrendingUp,
  Building,
  Globe,
  Archive,
  MoreHorizontal,
  ChevronRight,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  GitBranch,
  Columns,
  BarChart3,
  Rocket,
  Sparkles
} from 'lucide-react'
import { useAuthStore, canAccessFinance } from '@/store/authStore'

interface DashboardDesignsProps {
  stats: {
    dueIn7Days: number
    overdueActions: number
    invoiceQueue: number
    stalledCases: number
    activeTrademarks: number
    pendingDeadlines: number
    renewalWindow: number
  }
  recentCases: Array<{
    id: string
    mark_name: string
    status: string
    updated_at: string
    jurisdiction: string
  }>
  upcomingDeadlines: Array<{
    id: string
    type: string
    due_date: string
    mark_name: string
    days_remaining: number
  }>
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
  }
}

export function CommandCenterDashboard({ stats, recentCases, upcomingDeadlines }: DashboardDesignsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Mission Control Active</AlertTitle>
          <AlertDescription>
            Real-time monitoring of {stats.activeTrademarks} active trademarks
          </AlertDescription>
        </Alert>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due in 7 Days</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dueIn7Days}</div>
              <p className="text-xs text-muted-foreground">Action required</p>
              <Progress value={(stats.dueIn7Days / 10) * 100} className="mt-2 h-1" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Actions</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overdueActions}</div>
              <p className="text-xs text-muted-foreground">Requires immediate attention</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.invoiceQueue}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stalled Cases</CardTitle>
              <PauseCircle className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.stalledCases}</div>
              <p className="text-xs text-muted-foreground">No activity &gt;14 days</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Critical Actions Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {upcomingDeadlines.slice(0, 5).map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{deadline.mark_name}</p>
                      <p className="text-xs text-muted-foreground">{deadline.type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant={deadline.days_remaining < 0 ? 'destructive' : 'secondary'}>
                      {deadline.days_remaining}d
                    </Badge>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {recentCases.slice(0, 5).map((caseItem) => (
                  <div key={caseItem.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>{caseItem.mark_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{caseItem.mark_name}</p>
                        <p className="text-xs text-muted-foreground">{caseItem.status}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function TimelineDashboard({ stats, recentCases, upcomingDeadlines }: DashboardDesignsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Trademark Lifecycle Timeline
            </CardTitle>
            <CardDescription>Track your trademarks through each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute top-8 left-0 right-0 h-1 bg-border" />
              <div className="flex justify-between relative">
                {['Intake', 'Filed', 'Exam', 'Published', 'Registered', 'Renewal'].map((stage, index) => (
                  <div key={stage} className="flex flex-col items-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1, type: 'spring' }}
                      className={`z-10 flex size-10 items-center justify-center rounded-full ${
                        index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {index < 3 ? <CheckCircle2 className="size-5" /> : <span>{index + 1}</span>}
                    </motion.div>
                    <span className="mt-2 text-xs font-medium">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mark Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCases.slice(0, 5).map((caseItem) => (
                    <TableRow key={caseItem.id}>
                      <TableCell className="font-medium">{caseItem.mark_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{caseItem.status}</Badge>
                      </TableCell>
                      <TableCell>{caseItem.jurisdiction}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(caseItem.updated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Trademarks</span>
                <span className="font-bold">{stats.activeTrademarks}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Deadlines</span>
                <span className="font-bold">{stats.pendingDeadlines}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Renewal Window</span>
                <span className="font-bold">{stats.renewalWindow}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function KanbanDashboard({ stats, recentCases }: DashboardDesignsProps) {
  const columns = [
    { id: 'intake', title: 'Intake', count: 3, color: 'bg-blue-500' },
    { id: 'filed', title: 'Filed', count: 5, color: 'bg-amber-500' },
    { id: 'exam', title: 'Under Exam', count: 2, color: 'bg-purple-500' },
    { id: 'registered', title: 'Registered', count: stats.activeTrademarks, color: 'bg-green-500' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Columns className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Case Kanban Board</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <motion.div
              key={column.id}
              variants={itemVariants}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className={`size-3 rounded-full ${column.color}`} />
                <span className="font-medium">{column.title}</span>
                <Badge variant="secondary" className="ml-auto">{column.count}</Badge>
              </div>
              <Card>
                <CardContent className="p-3 space-y-2">
                  {recentCases.slice(0, 3).map((caseItem) => (
                    <div key={caseItem.id} className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                      <p className="text-sm font-medium truncate">{caseItem.mark_name}</p>
                      <p className="text-xs text-muted-foreground">{caseItem.jurisdiction}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function CalendarDashboard({ stats, upcomingDeadlines }: DashboardDesignsProps) {
  const currentDate = new Date()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <CardDescription>Deadline calendar view</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const hasDeadline = upcomingDeadlines.some((d) => 
                  new Date(d.due_date).getDate() === day
                )
                return (
                  <motion.div
                    key={day}
                    whileHover={{ scale: 1.05 }}
                    className={`aspect-square flex items-center justify-center rounded-md text-sm ${
                      hasDeadline 
                        ? 'bg-primary text-primary-foreground font-medium' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    {day}
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {upcomingDeadlines.slice(0, 5).map((deadline) => (
                  <div key={deadline.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{deadline.mark_name}</p>
                      <p className="text-xs text-muted-foreground">{deadline.type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant="secondary">{deadline.days_remaining}d</Badge>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Active Trademarks</span>
                  <span className="font-bold">{stats.activeTrademarks}</span>
                </div>
                <Progress value={(stats.activeTrademarks / 50) * 100} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Pending Deadlines</span>
                  <span className="font-bold">{stats.pendingDeadlines}</span>
                </div>
                <Progress value={(stats.pendingDeadlines / 20) * 100} className="[&>div]:bg-amber-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Renewal Window</span>
                  <span className="font-bold">{stats.renewalWindow}</span>
                </div>
                <Progress value={(stats.renewalWindow / 10) * 100} className="[&>div]:bg-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function AnalyticsDashboard({ stats, recentCases }: DashboardDesignsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Marks</p>
                <p className="text-2xl font-bold">{stats.activeTrademarks}</p>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <ArrowUpRight className="size-3" /> +12%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pendingDeadlines}</p>
                <p className="text-xs text-amber-500 flex items-center gap-1">
                  <ArrowDownRight className="size-3" /> -5%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Renewals Due</p>
                <p className="text-2xl font-bold">{stats.renewalWindow}</p>
                <p className="text-xs text-muted-foreground">This quarter</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className="text-2xl font-bold">98%</p>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <ArrowUpRight className="size-3" /> +2%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'Registered', value: 45, color: 'bg-green-500' },
                  { label: 'Pending', value: 30, color: 'bg-amber-500' },
                  { label: 'Under Exam', value: 15, color: 'bg-blue-500' },
                  { label: 'Other', value: 10, color: 'bg-muted-foreground' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.label}</span>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className={`h-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {recentCases.slice(0, 5).map((caseItem) => (
                  <div key={caseItem.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <TrendingUp className="size-4 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{caseItem.mark_name}</p>
                      <p className="text-xs text-muted-foreground">{caseItem.status}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(caseItem.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function ActionDashboard({ stats, upcomingDeadlines }: DashboardDesignsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Action Required Today
            </CardTitle>
            <CardDescription>
              {upcomingDeadlines.filter((d) => d.days_remaining <= 3).length} items need attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingDeadlines.slice(0, 3).map((deadline) => (
              <motion.div
                key={deadline.id}
                whileHover={{ scale: 1.01 }}
                className="flex items-center justify-between p-3 rounded-lg bg-background border"
              >
                <div className="space-y-1">
                  <p className="font-medium">{deadline.mark_name}</p>
                  <p className="text-sm text-muted-foreground">{deadline.type.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={deadline.days_remaining <= 0 ? 'destructive' : 'secondary'}>
                    {deadline.days_remaining <= 0 ? 'Overdue' : `${deadline.days_remaining}d left`}
                  </Badge>
                  <Button size="sm">
                    Take Action
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Due This Week</CardTitle>
              <Clock className="size-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.dueIn7Days}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Overdue</CardTitle>
              <AlertCircle className="size-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.overdueActions}</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Stalled</CardTitle>
              <PauseCircle className="size-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.stalledCases}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function ClientDashboard({ stats, recentCases }: DashboardDesignsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Client Overview</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ y: -4 }}
            >
              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="size-12">
                    <AvatarFallback>
                      <Building className="size-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">Client {i}</CardTitle>
                    <CardDescription>3 trademarks</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active</span>
                      <Badge variant="secondary">2</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pending</span>
                      <Badge variant="secondary">1</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Mark</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCases.slice(0, 5).map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarFallback>{caseItem.mark_name[0]}</AvatarFallback>
                        </Avatar>
                        <span>Client Name</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{caseItem.mark_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{caseItem.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(caseItem.updated_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export function RegistryDashboard({ stats, recentCases }: DashboardDesignsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Trademark Registry</CardTitle>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search trademarks..."
                  className="pl-9 pr-4 h-10 rounded-md border bg-background text-sm w-[250px]"
                />
              </div>
              <Button size="sm">
                <Plus className="mr-2 size-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Mark</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Filing Date</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.mark_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{caseItem.status}</Badge>
                    </TableCell>
                    <TableCell>{caseItem.jurisdiction}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(caseItem.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(caseItem.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export function LaunchDashboard({ stats }: DashboardDesignsProps) {
  const quickActions = [
    { icon: Plus, label: 'New Filing', color: 'bg-blue-500' },
    { icon: Search, label: 'Search Marks', color: 'bg-purple-500' },
    { icon: Clock, label: 'Deadlines', color: 'bg-amber-500' },
    { icon: FileText, label: 'Reports', color: 'bg-green-500' },
    { icon: Users, label: 'Clients', color: 'bg-pink-500' },
    { icon: Archive, label: 'Portfolio', color: 'bg-indigo-500' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
    >
      <motion.div variants={itemVariants} className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Quick Launch</h1>
        <p className="text-muted-foreground">Jump to any action with one click</p>
      </motion.div>

      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"
      >
        {quickActions.map((action, index) => (
          <motion.div
            key={action.label}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className={`size-12 rounded-xl ${action.color} flex items-center justify-center mb-3`}>
                  <action.icon className="size-6 text-white" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="text-center space-y-1">
        <p className="text-4xl font-bold">{stats.activeTrademarks}</p>
        <p className="text-muted-foreground">Active Trademarks</p>
      </motion.div>
    </motion.div>
  )
}

export function HybridDashboard({ stats, recentCases, upcomingDeadlines }: DashboardDesignsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Alert className="bg-primary/5 border-primary/20">
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Smart Dashboard</AlertTitle>
          <AlertDescription>
            Showing personalized insights based on your activity
          </AlertDescription>
        </Alert>
      </motion.div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="cases">Cases</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Marks</CardTitle>
                <Archive className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeTrademarks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
                <Clock className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.dueIn7Days}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertCircle className="size-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.overdueActions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Renewals</CardTitle>
                <TrendingUp className="size-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.renewalWindow}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="deadlines" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{deadline.mark_name}</p>
                      <p className="text-xs text-muted-foreground">{deadline.type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant={deadline.days_remaining <= 0 ? 'destructive' : 'secondary'}>
                      {deadline.days_remaining}d
                    </Badge>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mark Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCases.map((caseItem) => (
                    <TableRow key={caseItem.id}>
                      <TableCell className="font-medium">{caseItem.mark_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{caseItem.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(caseItem.updated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

export function ComingSoonDashboard() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <h1 className="text-h1 font-black tracking-tight text-[var(--eai-text)] mb-2">
          Dashboard
        </h1>
        <p className="text-body font-medium text-[var(--eai-text-secondary)]">
          Coming soon
        </p>
      </motion.div>
    </div>
  )
}
