import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { api } from '@/utils/api'
import { Activity, Briefcase, Users, Receipt, Clock } from 'lucide-react'

interface ActivityDay {
  date: string
  count: number
  actions: string
  cases: number
  clients: number
  invoices: number
}

interface ActivityDetail {
  id: string
  type: string
  name: string
  details: string
  timestamp: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ActivityHeatmap({ className }: { className?: string }) {
  const [loading, setLoading] = useState(true)
  const [activityData, setActivityData] = useState<Record<string, ActivityDay>>({})
  const [selectedDay, setSelectedDay] = useState<{ date: string; details: ActivityDetail[] } | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    async function fetchActivity() {
      setLoading(true)
      try {
        const response = await api.get('/system/activity-stats')
        const data = response.data || []
        const map: Record<string, ActivityDay> = {}
        data.forEach((item: ActivityDay) => {
          map[item.date] = item
        })
        setActivityData(map)
      } catch (error) {
        console.error('Failed to fetch activity stats:', error)
        setActivityData({})
      } finally {
        setLoading(false)
      }
    }
    fetchActivity()
  }, [])

  const handleDayClick = async (date: string, count: number) => {
    if (count === 0) return
    
    setSelectedDay({ date, details: [] })
    setLoadingDetails(true)
    
    try {
      const response = await api.get('/system/activity-details', {
        params: { date }
      })
      setSelectedDay({ date, details: response.data || [] })
    } catch (error) {
      console.error('Failed to fetch activity details:', error)
      setSelectedDay({ date, details: [] })
    } finally {
      setLoadingDetails(false)
    }
  }

  const { weeks, monthLabels, totalContributions, maxCount, stats, yearLabel } = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const yearLabel = `${currentYear}`
    
    const startDate = new Date(currentYear, 0, 1)
    const endDate = new Date(currentYear, 11, 31)
    
    const allDays: ActivityDay[] = []
    const cursor = new Date(startDate)
    
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().split('T')[0]
      const existing = activityData[dateStr]
      allDays.push(existing || { date: dateStr, count: 0, actions: '', cases: 0, clients: 0, invoices: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    const result: ActivityDay[][] = []
    let currentWeek: ActivityDay[] = []
    
    const firstDay = new Date(allDays[0].date)
    const padding = firstDay.getDay()
    for (let i = 0; i < padding; i++) {
      currentWeek.push({ date: '', count: -1, actions: '', cases: 0, clients: 0, invoices: 0 })
    }

    allDays.forEach((day) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: -1, actions: '', cases: 0, clients: 0, invoices: 0 })
      }
      result.push(currentWeek)
    }

    const months: { label: string; col: number }[] = []
    let lastMonth = -1
    result.forEach((week, weekIndex) => {
      const validDay = week.find(d => d.date)
      if (validDay) {
        const month = new Date(validDay.date).getMonth()
        if (month !== lastMonth) {
          months.push({ label: MONTHS[month], col: weekIndex })
          lastMonth = month
        }
      }
    })

    const totalCount = allDays.reduce((sum, d) => sum + d.count, 0)
    const totalCases = allDays.reduce((sum, d) => sum + d.cases, 0)
    const totalClients = allDays.reduce((sum, d) => sum + d.clients, 0)
    const totalInvoices = allDays.reduce((sum, d) => sum + d.invoices, 0)
    const activeDays = allDays.filter(d => d.count > 0).length
    const avgPerDay = activeDays > 0 ? (totalCount / activeDays).toFixed(1) : '0'
    const max = Math.max(...allDays.map(d => d.count), 1)

    return {
      weeks: result,
      monthLabels: months,
      totalContributions: totalCount,
      maxCount: max,
      stats: {
        cases: totalCases,
        clients: totalClients,
        invoices: totalInvoices,
        activeDays,
        avgPerDay
      },
      yearLabel
    }
  }, [activityData])

  const getIntensityClass = (count: number, max: number) => {
    if (count < 0) return 'bg-transparent'
    if (count === 0) return 'bg-muted/30'
    const ratio = count / max
    if (ratio < 0.25) return 'bg-emerald-200 dark:bg-emerald-900'
    if (ratio < 0.5) return 'bg-emerald-300 dark:bg-emerald-800'
    if (ratio < 0.75) return 'bg-emerald-400 dark:bg-emerald-700'
    return 'bg-emerald-500 dark:bg-emerald-600'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trademark': return <Briefcase size={14} />
      case 'client': return <Users size={14} />
      case 'invoice': return <Receipt size={14} />
      default: return <Activity size={14} />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trademark': return 'bg-blue-100 dark:bg-blue-900 text-blue-600'
      case 'client': return 'bg-purple-100 dark:bg-purple-900 text-purple-600'
      case 'invoice': return 'bg-green-100 dark:bg-green-900 text-green-600'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 animate-pulse" />
            Activity Overview
          </CardTitle>
          <CardDescription>Loading activity data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="size-5" />
              Activity Overview - {yearLabel}
            </CardTitle>
            <CardDescription className="text-xs">
              Click any day with activity to see details
            </CardDescription>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="text-center">
              <p className="font-bold text-lg">{totalContributions}</p>
              <p className="text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{stats.activeDays}</p>
              <p className="text-muted-foreground">Active</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg">{stats.avgPerDay}</p>
              <p className="text-muted-foreground">Avg/Day</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-3 mb-3 text-xs">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Briefcase size={10} className="text-blue-500" />
            TM: {stats.cases}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Users size={10} className="text-purple-500" />
            Clients: {stats.clients}
          </Badge>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Receipt size={10} className="text-green-500" />
            Invoices: {stats.invoices}
          </Badge>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="flex text-[10px] text-muted-foreground mb-1 pl-[52px]">
              {monthLabels.map((month, i) => (
                <div
                  key={i}
                  className="text-center"
                  style={{ 
                    marginLeft: i === 0 ? month.col * 12 : (month.col - monthLabels[i - 1].col - 1) * 12,
                    minWidth: '40px'
                  }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            <div className="flex">
              <div className="flex flex-col justify-between text-[10px] text-muted-foreground pr-1 w-[44px] shrink-0">
                <span className="h-[12px] leading-[12px]"></span>
                <span className="h-[12px] leading-[12px]">Mon</span>
                <span className="h-[12px] leading-[12px]"></span>
                <span className="h-[12px] leading-[12px]">Wed</span>
                <span className="h-[12px] leading-[12px]"></span>
                <span className="h-[12px] leading-[12px]">Fri</span>
                <span className="h-[12px] leading-[12px]"></span>
              </div>

              <div className="flex gap-[2px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[2px]">
                    {week.map((day, dayIndex) => {
                      const isClickable = day.date && day.count > 0
                      return (
                        <TooltipProvider key={dayIndex} delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                onClick={() => isClickable && handleDayClick(day.date, day.count)}
                                className={cn(
                                  'w-[10px] h-[10px] rounded-sm transition-all cursor-default',
                                  getIntensityClass(day.count, maxCount),
                                  isClickable && 'cursor-pointer hover:ring-1 hover:ring-primary/50'
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs whitespace-nowrap">
                              {day.date ? (
                                <div className="space-y-0.5">
                                  <div className="font-medium">
                                    {new Date(day.date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {day.count} activities
                                  </div>
                                  {day.count > 0 && (
                                    <div className="text-[10px] text-muted-foreground space-x-1">
                                      {day.cases > 0 && <span>{day.cases} TM</span>}
                                      {day.clients > 0 && <span>{day.clients} Client</span>}
                                      {day.invoices > 0 && <span>{day.invoices} Invoice</span>}
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-[2px]">
            <div className="w-[10px] h-[10px] rounded-sm bg-muted/30"></div>
            <div className="w-[10px] h-[10px] rounded-sm bg-emerald-200 dark:bg-emerald-900"></div>
            <div className="w-[10px] h-[10px] rounded-sm bg-emerald-300 dark:bg-emerald-800"></div>
            <div className="w-[10px] h-[10px] rounded-sm bg-emerald-400 dark:bg-emerald-700"></div>
            <div className="w-[10px] h-[10px] rounded-sm bg-emerald-500 dark:bg-emerald-600"></div>
          </div>
          <span>More</span>
        </div>
      </CardContent>

      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="size-4" />
              {selectedDay && new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : selectedDay && selectedDay.details.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="mx-auto size-8 mb-2 opacity-50" />
              <p>No activities recorded on this day.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-2">
                {selectedDay?.details.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className={cn('shrink-0 p-1.5 rounded-full', getTypeColor(item.type))}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{item.type}</span>
                        {item.details && (
                          <>
                            <span>•</span>
                            <span className="truncate">{item.details}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                      <Clock size={10} />
                      {new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
