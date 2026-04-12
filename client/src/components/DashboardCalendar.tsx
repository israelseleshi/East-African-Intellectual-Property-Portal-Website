import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar as CalendarIcon, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { trademarkService } from '@/utils/api'
import { Typography } from '@/components/ui/typography'

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  OPPOSITION: 'Opposition', RENEWAL: 'Renewal', RESPONSE: 'Response', AMENDMENT: 'Amendment',
  APPEAL: 'Appeal', RESTORATION: 'Restoration', REVOCATION: 'Revocation', ASSIGNMENT: 'Assignment',
  LICENSE: 'License', CHANGE: 'Change', DIVISION: 'Division', MERGER: 'Merger',
  TRANSFER: 'Transfer', GENERIC: 'Other'
}

const DEADLINE_TYPE_COLORS: Record<string, string> = {
  OPPOSITION: 'bg-red-500', RENEWAL: 'bg-blue-500', RESPONSE: 'bg-orange-500', AMENDMENT: 'bg-purple-500',
  APPEAL: 'bg-yellow-500', RESTORATION: 'bg-pink-500', REVOCATION: 'bg-gray-500', ASSIGNMENT: 'bg-indigo-500',
  LICENSE: 'bg-teal-500', CHANGE: 'bg-cyan-500', DIVISION: 'bg-violet-500', MERGER: 'bg-amber-500',
  TRANSFER: 'bg-emerald-500', GENERIC: 'bg-slate-500'
}

interface Deadline {
  id?: string
  due_date?: string
  type?: string
  priority?: string
  case_id?: string
  mark?: string
  jurisdiction?: string
  client?: string
  status?: string
}

export default function DashboardCalendar() {
  const navigate = useNavigate()
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    direction === 'prev' ? newMonth.setMonth(newMonth.getMonth() - 1) : newMonth.setMonth(newMonth.getMonth() + 1)
    setCurrentMonth(newMonth)
  }

  const setYear = (year: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setFullYear(year)
    setCurrentMonth(newMonth)
  }

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const startDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const isDeadlineOnDate = (day: number) => {
    const year = currentMonth.getFullYear()
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    return deadlines.some(d => d.due_date && d.due_date.startsWith(`${year}-${month}-${dayStr}`))
  }

  const isSelected = (day: number) => selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === selectedDate.getFullYear()
  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()
  }

  useEffect(() => {
    async function fetchDeadlines() {
      try {
        const cases = await trademarkService.getCases()
        const allDeadlines = cases.flatMap((c: any) =>
          (c.deadlines || []).filter((d: any) => d.status !== 'COMPLETED' && d.status !== 'SUPERSEDED').map((d: any) => ({
            ...d, mark: c.mark_name || c.markName, jurisdiction: c.jurisdiction, client: c.client_name
          }))
        )
        setDeadlines(allDeadlines)
      } catch (err) { console.error('Failed to fetch deadlines:', err) }
    }
    fetchDeadlines()
  }, [])

  const getSelectedDateDeadlines = () => {
    if (!selectedDate) return []
    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    return deadlines.filter(d => d.due_date && d.due_date.startsWith(selectedDateStr))
  }

  const selectedDateDeadlines = getSelectedDateDeadlines()

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarIcon size={22} className="text-primary" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Typography.h4 className="text-foreground">
              {currentMonth.toLocaleString('en-US', { month: 'long' })}
            </Typography.h4>
            <Select
              value={currentMonth.getFullYear().toString()}
              onValueChange={(val) => setYear(parseInt(val))}
            >
              <SelectTrigger className="h-8 w-[100px] border bg-transparent hover:bg-muted text-sm px-3 focus:ring-0">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth('prev')}>
              <CaretLeft size={16} />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateMonth('next')}>
              <CaretRight size={16} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={`header-${idx}`} className="font-bold text-muted-foreground py-2 text-sm">{day}</div>
          ))}
          {Array.from({ length: startDayOfMonth(currentMonth) }).map((_, i) => (
            <div key={`empty-${i}`} className="py-3" />
          ))}
          {Array.from({ length: daysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
            const hasDeadline = isDeadlineOnDate(day)
            return (
              <div
                key={day}
                onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                className={`py-3 rounded-lg transition-all cursor-pointer relative text-center text-base font-medium
                  ${isSelected(day) ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/50"} 
                  ${isToday(day) && !isSelected(day) ? "ring-2 ring-primary" : ""} 
                  ${hasDeadline && !isSelected(day) ? "bg-orange-100 text-orange-700 font-semibold" : ""}`}
              >
                {day}
              </div>
            )
          })}
        </div>

        {selectedDate && (
          <div className="mt-5 pt-4 border-t">
            <Typography.small className="text-muted-foreground uppercase font-semibold mb-3 block">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </Typography.small>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {selectedDateDeadlines.length === 0 ? (
                <Typography.small className="text-muted-foreground py-2 block">No deadlines</Typography.small>
              ) : (
                selectedDateDeadlines.slice(0, 3).map(d => (
                  <div 
                    key={d.id} 
                    className="p-3 bg-muted/50 rounded-lg flex items-center justify-between border border-border/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/deadlines/${d.id}`)}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <Typography.small className="font-semibold truncate block">{d.mark}</Typography.small>
                      <Typography.small className="text-muted-foreground truncate block">{d.client}</Typography.small>
                    </div>
                    <Badge className={`${DEADLINE_TYPE_COLORS[d.type?.toUpperCase() || 'GENERIC']} text-xs px-2 py-0.5`}>
                      {DEADLINE_TYPE_LABELS[d.type?.toUpperCase() || 'GENERIC']}
                    </Badge>
                  </div>
                ))
              )}
              {selectedDateDeadlines.length > 3 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-sm py-5"
                  onClick={() => navigate('/deadlines')}
                >
                  View all {selectedDateDeadlines.length} deadlines
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
