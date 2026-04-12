import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ActivityDay {
  date: string
  count: number
  type?: 'cases' | 'clients' | 'invoices' | 'deadlines'
}

interface ActivityHeatmapProps {
  days?: number
  className?: string
}

function generateMockData(days: number): ActivityDay[] {
  const data: ActivityDay[] = []
  const today = new Date()
  
  const activityTypes: Array<'cases' | 'clients' | 'invoices' | 'deadlines'> = ['cases', 'clients', 'invoices', 'deadlines']
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const isHoliday = Math.random() < 0.05
    
    let count = 0
    if (!isWeekend && !isHoliday) {
      const rand = Math.random()
      if (rand < 0.15) count = 0
      else if (rand < 0.35) count = Math.floor(Math.random() * 3) + 1
      else if (rand < 0.65) count = Math.floor(Math.random() * 5) + 3
      else if (rand < 0.85) count = Math.floor(Math.random() * 8) + 6
      else count = Math.floor(Math.random() * 12) + 10
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      count,
      type: activityTypes[Math.floor(Math.random() * activityTypes.length)]
    })
  }
  
  return data
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ActivityHeatmap({ days = 365, className }: ActivityHeatmapProps) {
  const mockData = useMemo(() => generateMockData(days), [days])
  
  const { weeks, monthLabels, totalContributions, maxCount } = useMemo(() => {
    const result: ActivityDay[][] = []
    let currentWeek: ActivityDay[] = []
    
    const firstDay = new Date(mockData[0].date)
    const padding = firstDay.getDay()
    for (let i = 0; i < padding; i++) {
      currentWeek.push({ date: '', count: -1 })
    }
    
    mockData.forEach((day, i) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    })
    
    if (currentWeek.length > 0) {
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
    
    const total = mockData.reduce((sum, d) => sum + d.count, 0)
    const max = Math.max(...mockData.map(d => d.count), 1)
    
    return { weeks: result, monthLabels: months, totalContributions: total, maxCount: max }
  }, [mockData])
  
  const getIntensityClass = (count: number, max: number) => {
    if (count < 0) return 'bg-transparent'
    if (count === 0) return 'bg-muted'
    const ratio = count / max
    if (ratio < 0.25) return 'bg-green-200 dark:bg-green-900'
    if (ratio < 0.5) return 'bg-green-300 dark:bg-green-800'
    if (ratio < 0.75) return 'bg-green-400 dark:bg-green-700'
    return 'bg-green-500 dark:bg-green-600'
  }
  
  const stats = useMemo(() => {
    const casesCount = mockData.filter(d => d.type === 'cases').reduce((s, d) => s + d.count, 0)
    const clientsCount = mockData.filter(d => d.type === 'clients').reduce((s, d) => s + d.count, 0)
    const invoicesCount = mockData.filter(d => d.type === 'invoices').reduce((s, d) => s + d.count, 0)
    const deadlinesCount = mockData.filter(d => d.type === 'deadlines').reduce((s, d) => s + d.count, 0)
    
    const activeDays = mockData.filter(d => d.count > 0).length
    const avgPerDay = (totalContributions / Math.max(activeDays, 1)).toFixed(1)
    
    return { casesCount, clientsCount, invoicesCount, deadlinesCount, activeDays, avgPerDay }
  }, [mockData, totalContributions])
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Activity Overview
        </CardTitle>
        <CardDescription>
          Your system activity over the last {days} days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Total Activities</p>
            <p className="text-2xl font-bold">{totalContributions.toLocaleString()}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Avg/Day</p>
            <p className="text-2xl font-bold">{stats.avgPerDay}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Active Days</p>
            <p className="text-2xl font-bold">{stats.activeDays}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Best Day</p>
            <p className="text-2xl font-bold">{Math.max(...mockData.map(d => d.count))}</p>
          </div>
        </div>
        
        {/* Activity Type Breakdown */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-2 rounded-full bg-blue-500"></span>
            Trademarks: {stats.casesCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <span className="size-2 rounded-full bg-purple-500"></span>
            Clients: {stats.clientsCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <span className="size-2 rounded-full bg-green-500"></span>
            Invoices: {stats.invoicesCount}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <span className="size-2 rounded-full bg-amber-500"></span>
            Deadlines: {stats.deadlinesCount}
          </Badge>
        </div>
        
        {/* Heatmap */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Month labels */}
            <div className="flex mb-1 text-xs text-muted-foreground">
              <div className="w-10 shrink-0"></div>
              {monthLabels.map((month, i) => (
                <div
                  key={i}
                  className="text-center"
                  style={{ marginLeft: i === 0 ? month.col * 14 : (month.col - monthLabels[i - 1].col - 1) * 14 }}
                >
                  {month.label}
                </div>
              ))}
            </div>
            
            {/* Grid with day labels */}
            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col justify-between mr-1 text-xs text-muted-foreground py-0.5 h-[102px]">
                <span></span>
                <span>Mon</span>
                <span></span>
                <span>Wed</span>
                <span></span>
                <span>Fri</span>
                <span></span>
              </div>
              
              {/* Weeks grid */}
              <div className="flex gap-[3px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIndex) => (
                      <TooltipProvider key={dayIndex}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'size-3 rounded-sm transition-colors cursor-default',
                                getIntensityClass(day.count, maxCount)
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {day.count < 0 ? (
                              <span className="text-muted-foreground">No data</span>
                            ) : (
                              <span>
                                <strong>{day.count} activities</strong>
                                <br />
                                <span className="text-muted-foreground">
                                  {new Date(day.date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </span>
                              </span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="size-3 rounded-sm bg-muted"></div>
            <div className="size-3 rounded-sm bg-green-200 dark:bg-green-900"></div>
            <div className="size-3 rounded-sm bg-green-300 dark:bg-green-800"></div>
            <div className="size-3 rounded-sm bg-green-400 dark:bg-green-700"></div>
            <div className="size-3 rounded-sm bg-green-500 dark:bg-green-600"></div>
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  )
}
