import { Calendar as CalendarIcon, Filter as Funnel, ChevronDown as CaretDown, ChevronLeft as CaretLeft, ChevronRight as ChevronsRight, Clock, AlertCircle as WarningCircle, CheckCircle, List, Download as DownloadSimple } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useState, useEffect, useMemo } from 'react'
import { trademarkService } from '../utils/api'
import { casesApi } from '@/api/cases'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Typography } from '@/components/ui/typography'
import { deriveAlertInfo, type AlertSeverity } from '@/utils/alertHelpers'
import { useExcelExport } from '@/hooks/useExcelExport'
import ExportProgressModal from '@/components/ExportProgressModal'
import HelpButton from '@/components/HelpButton'

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
  ET: '/flags/ethiopia-flag.png',
  SS: '/flags/south-sudan-flag.svg',
  CD: '/flags/drc-flag.svg'
}

const JURISDICTION_NAMES: Record<string, string> = {
  ALL: 'All Regions', ET: 'Ethiopia', KE: 'Kenya', ER: 'Eritrea', DJ: 'Djibouti',
  SO: 'Somalia', TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', BI: 'Burundi', SD: 'Sudan',
  SS: 'South Sudan', CD: 'DRC'
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
  const [allCases, setAllCases] = useState<Array<Record<string, unknown>>>([])
  const [alertFilter, setAlertFilter] = useState<AlertSeverity | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [yearFilter, setYearFilter] = useState('ALL')
  const { isExporting, exportProgress, startExport } = useExcelExport()

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
  const uniqueYears = Array.from(new Set(deadlines.map(d => d.due_date ? new Date(d.due_date).getFullYear().toString() : '').filter(Boolean))).sort()

  useEffect(() => {
    async function fetchDeadlines() {
      try {
        const response = await casesApi.listPage<Record<string, unknown>>({
          page: 1,
          pageSize: 10000,
          includeDeadlines: true
        })
        const cases = Array.isArray(response?.rows) ? response.rows : []
        const allDeadlines = cases.flatMap((c) => {
          const caseRecord = c as Record<string, unknown>
          const caseDeadlines = Array.isArray(caseRecord.deadlines) ? caseRecord.deadlines : []
          return caseDeadlines
            .filter((d) => {
              const dd = d as Record<string, unknown>
              const s = String(dd.status ?? '').toUpperCase()
              return s !== 'COMPLETED' && s !== 'SUPERSEDED'
            })
            .map((d) => {
              const dd = d as Record<string, unknown>
              return {
                ...dd,
                mark: String(caseRecord.mark_name ?? caseRecord.markName ?? ''),
                jurisdiction: String(caseRecord.jurisdiction ?? ''),
                client: String(caseRecord.client_name ?? '')
              }
            })
        })
        setDeadlines(allDeadlines)
      } catch (error) { console.error('Failed to fetch deadlines:', error) }
      finally { setLoading(false) }
    }
    fetchDeadlines()
  }, [])

  useEffect(() => {
    async function fetchAllCasesForAlerts() {
      try {
        const response = await casesApi.listPage<Record<string, unknown>>({
          page: 1,
          pageSize: 10000,
          sort: 'created_at_desc',
          includeDeadlines: false
        })
        setAllCases(Array.isArray(response?.rows) ? response.rows : [])
      } catch {
        setAllCases([])
      }
    }
    fetchAllCasesForAlerts()
  }, [])

  const getDaysRemaining = (dueDate?: string) => dueDate ? Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0

  const caseById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>()
    for (const c of allCases) {
      if (typeof c.id === 'string') map.set(c.id, c)
    }
    return map
  }, [allCases])

  const handleAlertFilterClick = (severity: AlertSeverity | 'all') => {
    setAlertFilter(severity)
    setSelectedDate(null)
  }

  const filteredDeadlines = deadlines.filter(d => {
    const matchesJurisdiction = filter === 'ALL' || d.jurisdiction === filter
    const matchesTrademark = trademarkFilter === 'ALL' || d.mark === trademarkFilter
    const matchesClient = clientFilter === 'ALL' || d.client === clientFilter
    const matchesSearch = !searchQuery || d.mark?.toLowerCase().includes(searchQuery.toLowerCase()) || d.type?.toLowerCase().includes(searchQuery.toLowerCase()) || d.client?.toLowerCase().includes(searchQuery.toLowerCase())
    const daysLeft = getDaysRemaining(d.due_date)
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'overdue' && daysLeft < 0) || (statusFilter === 'upcoming' && daysLeft >= 0 && daysLeft <= 30) || (statusFilter === 'completed' && d.status === 'COMPLETED')
    let matchesAlert = true
    if (alertFilter !== 'all') {
      if (d.case_id && typeof d.case_id === 'string') {
        const linkedCase = caseById.get(d.case_id)
        matchesAlert = linkedCase ? deriveAlertInfo(linkedCase).severity === alertFilter : false
      } else {
        matchesAlert = false
      }
    }
    return matchesJurisdiction && matchesTrademark && matchesClient && matchesSearch && matchesStatus && matchesAlert
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stats = { total: filteredDeadlines.length, overdue: filteredDeadlines.filter(d => getDaysRemaining(d.due_date) < 0).length, upcoming: filteredDeadlines.filter(d => { const days = getDaysRemaining(d.due_date); return days >= 0 && days <= 30; }).length, today: filteredDeadlines.filter(d => { const today = new Date().toISOString().split('T')[0]; return d.due_date === today; }).length }

  const handleExportExcel = async () => {
    if (filteredDeadlines.length === 0) return

    startExport({
      sheetName: 'Deadlines',
      fileName: 'EAIP_Deadlines',
      columns: [
        { header: 'Trademark', key: 'mark', width: 30 },
        { header: 'Deadline Type', key: 'type', width: 20 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Days Remaining', key: 'daysRemaining', width: 15 },
        { header: 'Jurisdiction', key: 'jurisdiction', width: 15 },
        { header: 'Client', key: 'client', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Priority', key: 'priority', width: 15 },
      ],
      rows: filteredDeadlines,
      mapRow: (d) => {
        const daysLeft = getDaysRemaining(d.due_date)
        return {
          mark: d.mark || '—',
          type: DEADLINE_TYPE_LABELS[d.type || 'GENERIC'] || d.type || 'Other',
          dueDate: d.due_date ? new Date(d.due_date).toISOString().split('T')[0] : '—',
          daysRemaining: daysLeft < 0 ? `Overdue (${Math.abs(daysLeft)})` : daysLeft === 0 ? 'Today' : daysLeft,
          jurisdiction: JURISDICTION_NAMES[d.jurisdiction || 'ALL'] || d.jurisdiction || '—',
          client: d.client || '—',
          status: d.status || '—',
          priority: d.priority || '—',
        }
      },
      formatHeader: (ws) => {
        const worksheet = ws as Record<string, unknown>
        const bdr = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
        ;(worksheet as any).spliceRows(1, 0, [])
        ;(worksheet as any).mergeCells(1, 1, 1, 8)
        const titleCell = (worksheet as any).getCell(1, 1)
        titleCell.value = 'EAST AFRICAN INTELLECTUAL PROPERTY PORTAL — DEADLINES MASTER LIST'
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F497D' } }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        titleCell.border = { top: bdr, left: bdr, bottom: bdr, right: bdr }
        ;(worksheet as any).getRow(1).height = 35
        const headerRow = (worksheet as any).getRow(2)
        headerRow.height = 25
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        for (let i = 1; i <= 8; i++) {
          headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
          headerRow.getCell(i).border = { top: bdr, left: bdr, bottom: bdr, right: bdr }
        }
        ;(worksheet as any).views = [{ state: 'frozen', ySplit: 2 }]
        ;(worksheet as any).autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 8 } }
      },
      formatRow: (row, d) => {
        const daysLeft = getDaysRemaining(d.due_date)
        if (daysLeft < 0) {
          ;(row as any).eachCell((cell: any) => { cell.font = { color: { argb: 'FFDC2626' } } })
        } else if (daysLeft <= 7) {
          ;(row as any).eachCell((cell: any) => { cell.font = { color: { argb: 'FFD97706' } } })
        }
      },
      successMessage: 'Deadlines report has been downloaded.',
    })
  }

  if (loading) {
    return (
      <div className="w-full p-4 md:p-10 space-y-8 bg-[#F8F9FA] text-foreground min-h-screen">
        <header className="flex items-center justify-between">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-48" />
        </header>
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Card className="border-none shadow-premium"><CardContent className="p-10"><Skeleton className="h-96 w-full rounded-2xl" /></CardContent></Card>
      <ExportProgressModal
        isExporting={isExporting}
        progress={exportProgress}
        message="Exporting Deadlines..."
        subtext="Generating your deadlines report."
      />
    </div>
  )
}


  return (
    <div className="w-full space-y-8 bg-[#F8F9FA] text-foreground min-h-screen">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-10 pt-4 md:pt-10">
        <div className="space-y-2">
          <Typography.h1 className="tracking-tight font-bold">Statutory Deadlines</Typography.h1>
          <Typography.p className="text-muted-foreground text-lg font-medium opacity-80">Critical tracking for oppositions, renewals, and responses.</Typography.p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HelpButton pageId="deadlines" />
          <Button data-tour="export-button" variant="outline" onClick={handleExportExcel} disabled={isExporting} className="bg-white hover:shadow-md transition-all h-12 px-6 rounded-xl border-none shadow-sm font-semibold">
            <DownloadSimple size={20} className="mr-2" />
            <span>Export Excel</span>
          </Button>
        </div>
      </header>

      <div className="mx-4 md:mx-10 pb-10 space-y-8">
        <Card className="border-none shadow-sm hover:shadow-premium transition-all duration-500 bg-white">
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 md:w-[300px]">
                  <Funnel className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={18} />
                  <Input data-tour="search-input" placeholder="Search deadlines..." className="pl-12 bg-muted/30 border-none h-12 rounded-xl focus-visible:ring-primary/20" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Select data-tour="status-filter" value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                  <SelectTrigger className="w-[160px] border-none bg-muted/30 h-12 rounded-xl font-semibold"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-premium">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button data-tour="jurisdiction-filter" variant="ghost" className="h-12 justify-between bg-muted/30 border-none rounded-xl px-4 hover:bg-muted/50 font-semibold">
                      <JurisdictionFlag code={filter} className="h-4 w-6 mr-2" />
                      {JURISDICTION_NAMES[filter]}
                      <CaretDown size={14} className="ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-xl border-none shadow-premium p-2">
                    {Object.entries(JURISDICTION_NAMES).map(([code, name]) => (
                      <DropdownMenuItem key={code} onClick={() => setFilter(code)} className="rounded-lg py-2.5">
                        <JurisdictionFlag code={code} className="h-4 w-6 mr-3" />
                        <span className="font-medium">{name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Select value={trademarkFilter} onValueChange={setTrademarkFilter}>
                  <SelectTrigger className="w-[200px] border-none bg-muted/30 h-12 rounded-xl font-semibold"><SelectValue placeholder="All Trademarks" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-premium max-h-[300px]">
                    <SelectItem value="ALL">All Trademarks</SelectItem>
                    {uniqueTrademarks.map(t => (<SelectItem key={t} value={t || ''} className="rounded-lg">{t}</SelectItem>))}
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-[200px] border-none bg-muted/30 h-12 rounded-xl font-semibold"><SelectValue placeholder="All Clients" /></SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-premium max-h-[300px]">
                    <SelectItem value="ALL">All Clients</SelectItem>
                    {uniqueClients.map(c => (<SelectItem key={c} value={c || ''} className="rounded-lg">{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="border-r border-muted/30">
                <div className="p-6 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <Typography.h4 className="text-primary font-bold flex items-center gap-2 tracking-tight" data-tour="deadline-list">
                      <List size={22} /> 
                      Deadline Registry
                    </Typography.h4>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger className="h-9 w-[130px] text-sm border-none bg-white/50 hover:bg-white shadow-sm font-semibold rounded-xl focus:ring-0 transition-all">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-premium">
                        <SelectItem value="ALL" className="rounded-lg">All Years</SelectItem>
                        {uniqueYears.map(y => (
                          <SelectItem key={y} value={y} className="rounded-lg">{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {filteredDeadlines.length > 0 ? (
                  <ScrollArea className="h-[700px]">
                    {(() => {
                      const listDeadlines = yearFilter === 'ALL'
                        ? filteredDeadlines
                        : filteredDeadlines.filter(d => d.due_date && new Date(d.due_date).getFullYear().toString() === yearFilter)

                      if (listDeadlines.length === 0) {
                        return (
                          <div className="px-6 py-20 text-center">
                            <CalendarIcon size={64} className="mx-auto text-muted-foreground/20 mb-6" />
                            <p className="text-muted-foreground font-medium">No deadlines recorded for {yearFilter}.</p>
                          </div>
                        )
                      }

                      const grouped: Record<string, typeof listDeadlines> = {}
                      listDeadlines.forEach(d => {
                        const y = d.due_date ? new Date(d.due_date).getFullYear().toString() : 'Unknown'
                        if (!grouped[y]) grouped[y] = []
                        grouped[y].push(d)
                      })
                      Object.values(grouped).forEach(items => items.sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')))
                      const sorted = Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b))

                      return (
                        <div className="divide-y divide-muted/30">
                          {sorted.map(([year, items]) => (
                            <div key={year} className="bg-white">
                              <div className="sticky top-0 z-10 px-8 py-4 bg-muted/5 backdrop-blur-md text-sm font-bold uppercase tracking-[0.2em] text-primary/40 border-b border-muted/30 flex items-center justify-between">
                                <span>{year}</span>
                                <Badge variant="secondary" className="bg-primary/5 text-primary border-none rounded-lg">{items.length} EVENTS</Badge>
                              </div>
                              <div className="divide-y divide-muted/20">
                                {items.map((d) => {
                                  const daysLeft = getDaysRemaining(d.due_date)
                                  return (
                                    <div key={d.id} onClick={() => navigate(`/deadlines/${d.id}`)} className="group flex items-center gap-6 px-8 py-6 hover:bg-primary/[0.02] transition-all cursor-pointer relative overflow-hidden">
                                      {daysLeft < 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
                                      {daysLeft >= 0 && daysLeft <= 30 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                                      
                                      <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl border border-muted shadow-sm bg-white group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40 leading-tight">{d.due_date ? new Date(d.due_date).toLocaleDateString('en-US', { month: 'short' }) : '?'}</span>
                                        <span className="text-2xl font-bold text-primary tracking-tighter leading-none py-1">{d.due_date ? new Date(d.due_date).getDate() : '?'}</span>
                                        <span className="text-[10px] font-bold text-muted-foreground/60 leading-tight">{d.due_date ? new Date(d.due_date).getFullYear() : ''}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1.5">
                                          <Typography.h4 className="truncate font-bold tracking-tight text-primary group-hover:text-accent transition-colors">{d.mark || 'Unnamed Mark'}</Typography.h4>
                                          <Badge variant="outline" className="text-[10px] font-bold bg-white/50 border-muted/50 px-2 py-0"><JurisdictionFlag code={d.jurisdiction || ''} className="h-3 w-4 mr-2" />{d.jurisdiction}</Badge>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Badge variant={daysLeft < 0 ? 'destructive' : daysLeft <= 30 ? 'warning' : 'info'} className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider">{DEADLINE_TYPE_LABELS[d.type?.toUpperCase() || 'GENERIC'] || d.type}</Badge>
                                          <Typography.small className="text-muted-foreground truncate font-medium text-xs">{d.client}</Typography.small>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-2">
                                        <ChevronsRight size={24} className="text-primary/10 group-hover:text-primary/40 group-hover:translate-x-2 transition-all duration-300" />
                                        {daysLeft < 0 && <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">OVERDUE</span>}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </ScrollArea>
                ) : (
                  <div className="px-6 py-20 text-center">
                    <CalendarIcon size={64} className="mx-auto text-muted-foreground/20 mb-6" />
                    <p className="text-muted-foreground font-medium">No deadlines matching your search criteria.</p>
                  </div>
                )}
              </div>

              <div className="p-10 bg-muted/5">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <Typography.h3 className="flex items-center gap-3 font-bold text-primary tracking-tight">
                      <CalendarIcon data-tour="calendar-view" size={28} className="text-primary/60" />
                      {currentMonth.toLocaleString('en-US', { month: 'long' })}
                    </Typography.h3>
                    <Select
                      value={currentMonth.getFullYear().toString()}
                      onValueChange={(val) => setYear(parseInt(val))}
                    >
                      <SelectTrigger className="h-10 w-[120px] border-none bg-white shadow-sm hover:shadow-md font-bold text-xl px-4 focus:ring-0 rounded-xl transition-all">
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
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm" onClick={() => navigateMonth('prev')}><CaretLeft size={20} /></Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm" onClick={() => navigateMonth('next')}><ChevronsRight size={20} /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-3 text-center text-sm mb-8">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, idx) => (<div key={`header-${day}-${idx}`} className="font-bold text-muted-foreground/30 py-2 text-[10px] uppercase tracking-[0.2em]">{day}</div>))}
                  {Array.from({ length: startDayOfMonth(currentMonth) }).map((_, i) => (<div key={`empty-${i}`} className="aspect-square" />))}
                  {Array.from({ length: daysInMonth(currentMonth) }, (_, i) => i + 1).map(day => {
                    const hasDeadline = isDeadlineOnDate(day)
                    return (
                      <div
                        key={day}
                        onClick={() => setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                        className={`aspect-square flex items-center justify-center rounded-2xl transition-all cursor-pointer relative text-sm font-bold
                          ${isSelected(day) ? "bg-primary text-primary-foreground shadow-lg scale-110 z-10" : hasDeadline ? "bg-orange-500 text-white shadow-md ring-1 ring-orange-600/30" : "hover:bg-primary/5 text-primary/80 bg-white shadow-sm border border-muted/10"}
                          ${isToday(day) && !isSelected(day) && !hasDeadline ? "border-2 border-primary/40" : ""}`}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
                {selectedDate && (
                  <div className="mt-10 pt-8 border-t border-muted/30 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                      <Typography.small className="text-primary uppercase font-bold tracking-[0.2em] text-[10px]">
                        {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </Typography.small>
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none rounded-lg font-bold uppercase tracking-wider">
                        {(() => {
                          const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                          return filteredDeadlines.filter(d => d.due_date && d.due_date.startsWith(selectedDateStr)).length
                        })()} Events
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      {(() => {
                        const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                        const selectedDeadlines = filteredDeadlines.filter(d => d.due_date && d.due_date.startsWith(selectedDateStr))
                        if (selectedDeadlines.length === 0) return (
                          <div className="py-12 text-center bg-muted/10 rounded-3xl border border-dashed border-muted-foreground/20">
                            <p className="text-sm text-muted-foreground font-medium italic">No deadlines scheduled for this date</p>
                          </div>
                        )
                        return selectedDeadlines.map(d => (
                          <div key={d.id} className="p-5 bg-white rounded-3xl flex items-center justify-between border border-transparent shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group/item" onClick={() => navigate(`/deadlines/${d.id}`)}>
                            <div className="flex-1 min-w-0 pr-6">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-bold truncate text-primary group-hover:text-accent transition-colors tracking-tight text-lg">{d.mark}</div>
                                <Badge variant="outline" className="text-[10px] h-5 py-0 font-bold bg-muted/5 border-muted/50">{d.jurisdiction}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                                {d.client}
                              </div>
                            </div>
                            <Badge className={`${DEADLINE_TYPE_COLORS[d.type?.toUpperCase() || 'GENERIC']} text-white text-[10px] px-4 py-1.5 font-bold border-none shadow-sm`}>
                              {DEADLINE_TYPE_LABELS[d.type?.toUpperCase() || 'GENERIC']}
                            </Badge>
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