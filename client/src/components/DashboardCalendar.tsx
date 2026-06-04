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

interface CaseWithDeadlines {
  mark_name?: string
  markName?: string
  jurisdiction?: string
  client_name?: string
  deadlines?: Array<{ id?: string; status?: string } & Record<string, unknown>>
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
        const response = await trademarkService.getCases()
        const cases = Array.isArray(response?.rows) ? response.rows : []
        const allDeadlines = (cases as CaseWithDeadlines[]).flatMap((c) =>
          (c.deadlines || []).filter((d) => d.status !== 'COMPLETED' && d.status !== 'SUPERSEDED').map((d) => ({
            ...d, mark: c.mark_name || c.markName, jurisdiction: c.jurisdiction, client: c.client_name
          }))
        )
        setDeadlines(allDeadlines)
      } catch (err) {
        console.error('Failed to fetch deadlines:', err)
      }
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
    <Card className="border-none shadow-sm hover:shadow-premium transition-all duration-500 bg-white h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          <CalendarIcon size={24} className="text-primary/60" weight="duotone" />
          Registry Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Typography.h4 className="text-primary font-bold text-xl">
              {currentMonth.toLocaleString('en-US', { month: 'long' })}
            </Typography.h4>
            <Select
              value={currentMonth.getFullYear().toString()}
              onValueChange={(val) => setYear(parseInt(val))}
            >
              <SelectTrigger className="h-9 w-[110px] border-none bg-muted/40 hover:bg-muted/60 text-sm font-semibold px-4 focus:ring-0 rounded-xl transition-colors">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-premium">
                {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map(y => (
                  <SelectItem key={y} value={y.toString()} className="rounded-lg">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 transition-colors" onClick={() => navigateMonth('prev')}>
              <CaretLeft size={20} weight="bold" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 transition-colors" onClick={() => navigateMonth('next')}>
              <CaretRight size={20} weight="bold" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm mb-4">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, idx) => (
            <div key={`header-${idx}`} className="font-bold text-muted-foreground/40 py-2 text-[10px] uppercase tracking-widest">{day}</div>
          ))}
          {Array.from({ length: startDayOfMonth(currentMonth) }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
            const hasDeadline = isDeadlineOnDate(day)
            return (
              <div
                key={day}
                onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                className={`aspect-square flex items-center justify-center rounded-2xl transition-all cursor-pointer relative text-sm font-bold
                  ${isSelected(day) ? "bg-primary text-primary-foreground shadow-lg scale-110 z-10" : hasDeadline ? "bg-orange-500 text-white shadow-md ring-1 ring-orange-600/30" : "hover:bg-primary/5 text-primary/80"}
                  ${isToday(day) && !isSelected(day) && !hasDeadline ? "border-2 border-primary/20 text-primary" : ""}`}
              >
                {day}
              </div>
            )
          })}
        </div>

        {selectedDate && (
          <div className="mt-8 pt-6 border-t border-muted/50">
            <div className="flex items-center justify-between mb-6">
              <Typography.small className="text-primary uppercase font-bold tracking-widest text-[10px]">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Typography.small>
              <Badge variant="secondary" className="bg-primary/5 text-primary border-none">
                {selectedDateDeadlines.length} {selectedDateDeadlines.length === 1 ? 'Deadline' : 'Deadlines'}
              </Badge>
            </div>
            <div className="space-y-3">
              {selectedDateDeadlines.length === 0 ? (
                <div className="py-10 text-center bg-muted/10 rounded-2xl border border-dashed border-muted-foreground/20">
                  <Typography.small className="text-muted-foreground font-medium italic">No events scheduled</Typography.small>
                </div>
              ) : (
                selectedDateDeadlines.slice(0, 4).map(d => (
                  <div 
                    key={d.id} 
                    className="p-4 bg-muted/30 rounded-2xl flex items-center justify-between border border-transparent hover:border-primary/20 hover:bg-white hover:shadow-sm transition-all cursor-pointer group/deadline"
                    onClick={() => navigate(`/deadlines/${d.id}`)}
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <Typography.small className="font-bold text-primary truncate block group-hover/deadline:text-accent transition-colors">{d.mark}</Typography.small>
                      <Typography.small className="text-muted-foreground truncate block mt-0.5 text-[10px] font-medium uppercase tracking-wide">{d.client}</Typography.small>
                    </div>
                    <Badge className={`${DEADLINE_TYPE_COLORS[d.type?.toUpperCase() || 'GENERIC']} text-white text-[10px] px-3 py-1 font-bold border-none`}>
                      {DEADLINE_TYPE_LABELS[d.type?.toUpperCase() || 'GENERIC']}
                    </Badge>
                  </div>
                ))
              )}
              {selectedDateDeadlines.length > 4 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs font-bold py-6 hover:bg-primary/5 text-primary tracking-widest uppercase mt-2 transition-all"
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
