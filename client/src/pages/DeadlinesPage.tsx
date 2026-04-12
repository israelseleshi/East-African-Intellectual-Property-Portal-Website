import {
  Calendar as CalendarIcon,
  Funnel,
  CaretDown,
  CaretLeft,
  CaretRight as ChevronsRight,
  Clock,
  WarningCircle,
  CheckCircle,
  List,
} from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { trademarkService } from '../utils/api'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Typography } from '@/components/ui/typography'

const JURISDICTION_FLAGS: Record<string, string> = {
  ALL: '🌍',
  KE: '/flags/kenya-flag.png', 
  TZ: '/flags/tanzania-flag.webp', 
  UG: '/flags/uganda-flag.png', 
  RW: '/flags/rwanda-flag.png', 
  BI: '/flags/burundi-flag.png', 
  SO: '/flags/somalia-flag.png', 
  SD: '/flags/sudan-image.png',
  DJ: '/flags/djibouti-flag.png',
  ER: '/flags/eritrea-flag.png',
  ET: '/flags/ethiopia-flag.png'
}

const JURISDICTION_NAMES: Record<string, string> = {
  ALL: 'All Regions', ET: 'Ethiopia', KE: 'Kenya', ER: 'Eritrea', DJ: 'Djibouti',
  SO: 'Somalia', TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', BI: 'Burundi', SD: 'Sudan'
}

const JurisdictionFlag = ({ code, className = "h-4 w-6" }: { code: string, className?: string }) => {
  const flag = JURISDICTION_FLAGS[code];
  if (!flag) return <span className={className}>??</span>;
  if (flag.startsWith('/')) {
    return <img src={flag} alt={code} className={`${className} object-cover rounded-sm`} />;
  }
  return <span className={className}>{flag}</span>;
};

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  OPPOSITION: 'Opposition', RENEWAL: 'Renewal', RESPONSE: 'Response', AMENDMENT: 'Amendment',
  APPEAL: 'Appeal', RESTORATION: 'Restoration', REVOCATION: 'Revocation', ASSIGNMENT: 'Assignment',
  LICENSE: 'License', CHANGE: 'Change of Details', DIVISION: 'Division', MERGER: 'Merger',
  TRANSFER: 'Transfer', GENERIC: 'Other'
};

const DEADLINE_TYPE_COLORS: Record<string, string> = {
  OPPOSITION: 'bg-red-500', RENEWAL: 'bg-blue-500', RESPONSE: 'bg-orange-500', AMENDMENT: 'bg-purple-500',
  APPEAL: 'bg-yellow-500', RESTORATION: 'bg-pink-500', REVOCATION: 'bg-gray-500', ASSIGNMENT: 'bg-indigo-500',
  LICENSE: 'bg-teal-500', CHANGE: 'bg-cyan-500', DIVISION: 'bg-violet-500', MERGER: 'bg-amber-500',
  TRANSFER: 'bg-emerald-500', GENERIC: 'bg-slate-500'
};

export default function DeadlinesPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('ALL')
  const [trademarkFilter, setTrademarkFilter] = useState('ALL')
  const [clientFilter, setClientFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'upcoming' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deadlines, setDeadlines] = useState<Array<{ id?: string; due_date?: string; type?: string; priority?: string; case_id?: string; mark?: string; jurisdiction?: string; client?: string; status?: string }>>([])
  const [loading, setLoading] = useState(true)
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
    return filteredDeadlines.some(d => d.due_date && d.due_date.startsWith(`${year}-${month}-${dayStr}`))
  }

  const isSelected = (day: number) => selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth.getMonth() && selectedDate.getFullYear() === currentMonth.getFullYear()
  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()
  }

  const uniqueTrademarks = Array.from(new Set(deadlines.map(d => d.mark).filter(Boolean))).sort()
  const uniqueClients = Array.from(new Set(deadlines.map(d => d.client).filter(Boolean))).sort()

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
      } catch (error) { console.error('Failed to fetch deadlines:', error) }
      finally { setLoading(false) }
    }
    fetchDeadlines()
  }, [])

  const getDaysRemaining = (dueDate?: string) => dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  const filteredDeadlines = deadlines.filter(d => {
    const matchesJurisdiction = filter === 'ALL' || d.jurisdiction === filter
    const matchesTrademark = trademarkFilter === 'ALL' || d.mark === trademarkFilter
    const matchesClient = clientFilter === 'ALL' || d.client === clientFilter
    const matchesSearch = !searchQuery || d.mark?.toLowerCase().includes(searchQuery.toLowerCase()) || d.type?.toLowerCase().includes(searchQuery.toLowerCase()) || d.client?.toLowerCase().includes(searchQuery.toLowerCase())
    const daysLeft = getDaysRemaining(d.due_date)
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'overdue' && daysLeft < 0) || (statusFilter === 'upcoming' && daysLeft >= 0 && daysLeft <= 30) || (statusFilter === 'completed' && d.status === 'COMPLETED')
    return matchesJurisdiction && matchesTrademark && matchesClient && matchesSearch && matchesStatus
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stats = { total: filteredDeadlines.length, overdue: filteredDeadlines.filter(d => getDaysRemaining(d.due_date) < 0).length, upcoming: filteredDeadlines.filter(d => { const days = getDaysRemaining(d.due_date); return days >= 0 && days <= 30; }).length, today: filteredDeadlines.filter(d => { const today = new Date().toISOString().split('T')[0]; return d.due_date === today; }).length }

  if (loading) {
    return (
      <div className="w-full p-4 md:p-8 space-y-8 bg-[#E8E8ED] text-foreground min-h-screen">
        <header className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </header>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 bg-[#E8E8ED] text-foreground min-h-screen">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-8 pt-4 md:pt-8">
        <div className="space-y-2">
          <Typography.h1a>Statutory Deadlines</Typography.h1a>
          <Typography.muted>Critical tracking for oppositions, renewals, and responses.</Typography.muted>
        </div>
      </header>

      <div className="mx-4 md:mx-8 pb-8">
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-[200px]">
                  <Funnel className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input placeholder="Search deadlines..." className="pl-9 bg-[#E8E8ED]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                  <SelectTrigger className="w-[140px] bg-[#E8E8ED]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-between">
                      <JurisdictionFlag code={filter} className="h-4 w-5 mr-2" />
                      {JURISDICTION_NAMES[filter]}
                      <CaretDown size={14} className="ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {Object.entries(JURISDICTION_NAMES).map(([code, name]) => (
                      <DropdownMenuItem key={code} onClick={() => setFilter(code)}>
                        <JurisdictionFlag code={code} className="h-4 w-5 mr-2" />
                        {name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Select value={trademarkFilter} onValueChange={setTrademarkFilter}>
                  <SelectTrigger className="w-[180px] bg-[#E8E8ED]"><SelectValue placeholder="All Trademarks" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Trademarks</SelectItem>
                    {uniqueTrademarks.map(t => (<SelectItem key={t} value={t || ''}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-[180px] bg-[#E8E8ED]"><SelectValue placeholder="All Clients" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Clients</SelectItem>
                    {uniqueClients.map(c => (<SelectItem key={c} value={c || ''}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="border-r border-border">
                <div className="p-4 border-b bg-muted/30">
                    <Typography.h4a className="text-muted-foreground flex items-center gap-2">
                      <List size={16} /> Detailed List
                    </Typography.h4a>
                </div>
                {filteredDeadlines.length > 0 ? (
                  <ScrollArea className="h-[600px]">
                    <div className="divide-y divide-border">
                      {filteredDeadlines.map((d) => {
                        const daysLeft = getDaysRemaining(d.due_date)
                        const isOverdue = daysLeft < 0
                        const isUrgent = daysLeft >= 0 && daysLeft <= 7
                        return (
                          <div key={d.id} onClick={() => navigate(`/deadlines/${d.id}`)} className="group flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-lg border">
                              <span className="text-[10px] font-bold uppercase">{d.due_date ? new Date(d.due_date).toLocaleDateString('en-US', { month: 'short' }) : '?'}</span>
                              <span className="text-lg font-bold leading-none">{d.due_date ? new Date(d.due_date).getDate() : '?'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Typography.h4a className="truncate">{d.mark || 'Unnamed Mark'}</Typography.h4a>
                                <Badge variant="outline" className="text-xs"><JurisdictionFlag code={d.jurisdiction || ''} className="h-3 w-4 mr-1" />{d.jurisdiction}</Badge>
                                <Badge className="text-xs">{DEADLINE_TYPE_LABELS[d.type?.toUpperCase() || 'GENERIC'] || d.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{d.client}</p>
                            </div>
                            <ChevronsRight size={20} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <CalendarIcon size={48} className="mx-auto text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground">No deadlines found for your filters.</p>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Typography.h3a className="flex items-center gap-2">
                      <CalendarIcon size={20} className="text-primary" />
                      {currentMonth.toLocaleString('en-US', { month: 'long' })}
                    </Typography.h3a>
                    <Select
                      value={currentMonth.getFullYear().toString()}
                      onValueChange={(val) => setYear(parseInt(val))}
                    >
                      <SelectTrigger className="h-8 w-[100px] border border-black bg-transparent hover:bg-muted font-semibold text-lg px-2 focus:ring-0">
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
                    <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}><CaretLeft size={16} /></Button>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}><ChevronsRight size={16} /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (<div key={`header-${day}-${idx}`} className="font-bold text-muted-foreground py-2">{day}</div>))}
                  {Array.from({ length: startDayOfMonth(currentMonth) }).map((_, i) => (<div key={`empty-${i}`} className="py-2" />))}
                  {Array.from({ length: daysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                    const hasDeadline = isDeadlineOnDate(day)
                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                        className={`py-3 rounded-lg transition-all cursor-pointer relative text-center 
                          ${isSelected(day) ? "bg-primary text-primary-foreground shadow-md font-bold" : "hover:bg-muted/50"} 
                          ${isToday(day) ? "ring-2 ring-primary ring-offset-2" : ""} 
                          ${hasDeadline && !isSelected(day) ? "bg-orange-100 text-orange-600 font-bold" : ""}`}
                      >
                        {day}
                        {hasDeadline && isToday(day) && !isSelected(day) && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedDate && (
                  <div className="mt-6 pt-4 border-t animate-in fade-in slide-in-from-top-2">
                    <div className="text-xs font-bold uppercase text-muted-foreground mb-3">{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
                    <div className="space-y-2">
                      {(() => {
                        const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                        const selectedDeadlines = filteredDeadlines.filter(d => d.due_date && d.due_date.startsWith(selectedDateStr))
                        if (selectedDeadlines.length === 0) return <p className="text-sm text-muted-foreground">No deadlines</p>
                        return selectedDeadlines.map(d => (
                          <div key={d.id} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between border border-border/50 hover:bg-muted transition-colors cursor-pointer" onClick={() => navigate(`/deadlines/${d.id}`)}>
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-bold truncate text-foreground">{d.mark}</div>
                                <Badge variant="outline" className="text-[10px] h-4 py-0">{d.jurisdiction}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {d.client}
                              </div>
                            </div>
                            <Badge className={DEADLINE_TYPE_COLORS[d.type?.toUpperCase() || 'GENERIC']}>{DEADLINE_TYPE_LABELS[d.type?.toUpperCase() || 'GENERIC']}</Badge>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}