import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, MagnifyingGlass, DownloadSimple, CaretLeft, CaretRight, SquaresFour, List, ShieldCheck, File, CheckCircle, Clock, Eye, SealCheck, CaretDown, Globe } from '@phosphor-icons/react'
import ExcelJS from 'exceljs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { trademarkService } from '@/utils/api'
import { useToast } from '@/components/ui/toast'
import { casesApi } from '@/api/cases'
import { fillPdfForm } from '@/utils/pdfUtils'

const JURISDICTION_NAMES: Record<string, string> = {
  ALL: 'All Jurisdictions',
  ET: 'Ethiopia', KE: 'Kenya', ER: 'Eritrea', DJ: 'Djibouti',
  SO: 'Somalia', TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', BI: 'Burundi',
}

const STATUS_ICONS: Record<string, typeof File> = {
  ALL: ShieldCheck, DRAFT: File, FILED: Globe, FORMAL_EXAM: Clock,
  SUBSTANTIVE_EXAM: Eye, PUBLISHED: CheckCircle, REGISTERED: SealCheck
}

const STATUS_NAMES: Record<string, string> = {
  ALL: 'All Statuses', DRAFT: 'Draft', FILED: 'Filed', FORMAL_EXAM: 'Formal Exam',
  SUBSTANTIVE_EXAM: 'Substantive', PUBLISHED: 'Published', REGISTERED: 'Registered'
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500 text-white hover:bg-slate-600',
  FILED: 'bg-blue-500 text-white hover:bg-blue-600',
  FORMAL_EXAM: 'bg-yellow-500 text-black hover:bg-yellow-600',
  SUBSTANTIVE_EXAM: 'bg-orange-500 text-white hover:bg-orange-600',
  PUBLISHED: 'bg-purple-500 text-white hover:bg-purple-600',
  REGISTERED: 'bg-green-600 text-white hover:bg-green-700',
  REJECTED: 'bg-red-500 text-white hover:bg-red-600',
  ABANDONED: 'bg-gray-700 text-white hover:bg-gray-800'
}

function markLabel(t: { markName?: string; mark_name?: string }) {
  return t.markName || t.mark_name || '—'
}

function MarkInfoThumbnail({ markImage, label }: { markImage?: string; label: string }) {
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  const resolveMarkImageUrl = (rawPath?: string) => {
    if (!rawPath) return ''
    if (rawPath.startsWith('http') || rawPath.startsWith('data:')) return rawPath
    const devApiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')
    const origin = import.meta.env.PROD ? window.location.origin : devApiBase
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
    if (path.startsWith('/api/')) return `${origin}${path}`
    if (path.startsWith('/uploads/')) return `${origin}/api${path}`
    if (path.startsWith('/forms-download/')) return `${origin}/api${path}`
    return `${origin}/api/forms-download/${path.replace(/^\//, '')}`
  }

  const candidates = useMemo(() => {
    const primary = resolveMarkImageUrl(markImage)
    if (!primary) return []
    const list = [primary]
    if (!import.meta.env.PROD) {
      const remote = primary.replace(/^http:\/\/localhost:\d+/i, 'https://eastafricanip.com').replace(/^http:\/\/127\.0\.0\.1:\d+/i, 'https://eastafricanip.com')
      if (remote !== primary) list.push(remote)
    }
    return Array.from(new Set(list))
  }, [markImage])

  useEffect(() => { setCandidateIndex(0); setFailed(false) }, [markImage, candidates.join('|')])

  const current = candidates[candidateIndex]

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground shadow-sm">
      {!failed && current ? (
        <img src={current} alt={`${label} logo`} className="h-full w-full object-cover" onError={() => {
          if (candidateIndex < candidates.length - 1) setCandidateIndex(idx => idx + 1)
          else setFailed(true)
        }} />
      ) : <ShieldCheck size={24} />}
    </div>
  )
}

export default function TrademarksPage() {
  const navigate = useNavigate()
  const { toast: addToast } = useToast()
  const [searchParams] = useSearchParams()

  const [cases, setCases] = useState<Array<{ id: string; markName?: string; mark_name?: string; filingNumber?: string; filing_number?: string; filingDate?: string; filing_date?: string; client?: { name?: string; type?: string }; client_name?: string; client_type?: string; jurisdiction?: string; status?: string; created_at?: string; updated_at?: string; registration_dt?: string; registrationDt?: string; next_action_date?: string; nextActionDate?: string; priority?: string; markType?: string; colorIndication?: string; mark_image?: string; markImage?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [jurisdiction, setJurisdiction] = useState<string | 'ALL'>('ALL')
  const [status, setStatus] = useState<string | 'ALL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const pageSize = 10

  useEffect(() => { fetchCases() }, [q, status, jurisdiction])

  const fetchCases = async () => {
    try {
      setLoading(true)
      const data = await trademarkService.getCases({ q, status: status === 'ALL' ? undefined : status, jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction })
      setCases(Array.isArray(data) ? data : [])
    } catch { setCases([]) }
    finally { setLoading(false) }
  }

  const filteredRows = useMemo(() => {
    return cases.filter(c => {
      const matchesQ = !q || (c.markName || c.mark_name || '').toLowerCase().includes(q.toLowerCase()) || (c.filingNumber || c.filing_number || '').toLowerCase().includes(q.toLowerCase()) || (c.client?.name || c.client_name || '').toLowerCase().includes(q.toLowerCase())
      return matchesQ && (jurisdiction === 'ALL' || c.jurisdiction === jurisdiction) && (status === 'ALL' || c.status === status)
    })
  }, [cases, q, jurisdiction, status])

  const totalPages = Math.ceil(filteredRows.length / pageSize)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [q, jurisdiction, status])

  const handleDownloadForm = async (e: React.MouseEvent, t: any) => {
    e.stopPropagation()
    try {
      const caseData = await casesApi.getById(t.id)
      if (!caseData || !caseData.eipaForm) {
        addToast({ title: 'No Data', description: 'No EIPA form data found for this case', variant: 'destructive' })
        return
      }

      addToast({ title: 'Preparing PDF...', description: 'Please wait while we generate your form' })

      // Detect renewal vs application
      const isRenewal = (t.status || '').toUpperCase() === 'RENEWAL' || (t.type || '').toUpperCase() === 'RENEWAL'
      const pdfUrl = isRenewal ? '/renewal_form.pdf' : '/application_form.pdf'
      
      const pdfBytes = await fillPdfForm(pdfUrl, caseData.eipaForm as Record<string, unknown>)
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileNameStr = markLabel(t).replace(/[^a-z0-9]/gi, '_').toUpperCase()
      link.download = `${fileNameStr}_EIPA_FORM.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      addToast({ title: 'Download Started' })
    } catch (err) {
      console.error('Download error:', err)
      addToast({ title: 'Download Failed', description: 'Could not generate PDF form', variant: 'destructive' })
    }
  }

  const handleExportCSV = () => {
    if (!filteredRows.length) return
    const headers = ['Mark Name', 'Filing Number', 'Jurisdiction', 'Status', 'Client']
    const csvData = filteredRows.map(c => [markLabel(c), c.filing_number || c.filingNumber || 'PENDING', c.jurisdiction, c.status, c.client_name || c.client?.name || '—'])
    const csv = [headers.join(','), ...csvData.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `trademarks_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Trademarks</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}><DownloadSimple size={18} /><span>Export CSV</span></Button>
          <Button onClick={() => navigate('/eipa-forms/application-form')}><Plus size={18} /><span>New Application</span></Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 w-full lg:max-w-md">
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by mark, filing #, or owner..." />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <span>{JURISDICTION_NAMES[jurisdiction]}</span>
                  <CaretDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {Object.entries(JURISDICTION_NAMES).map(([code, name]) => (
                  <DropdownMenuItem key={code} onClick={() => setJurisdiction(code)} className={jurisdiction === code ? 'bg-accent' : ''}>
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <span>{STATUS_NAMES[status]}</span>
                  <CaretDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {Object.entries(STATUS_NAMES).map(([code, name]) => (
                  <DropdownMenuItem key={code} onClick={() => setStatus(code)} className={status === code ? 'bg-accent' : ''}>
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-sm text-muted-foreground">{filteredRows.length} records</span>
            <div className="flex items-center gap-1 border rounded-lg h-9 ml-2">
              <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')}><List size={18} /></Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}><SquaresFour size={18} /></Button>
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl">
          <MagnifyingGlass size={48} className="text-muted-foreground opacity-30 mb-4" />
          <div className="text-xl font-bold">No records found</div>
          <p className="text-muted-foreground">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedRows.map(t => (
            <Card key={t.id} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/trademarks/${t.id}`)}>
              <div className="flex items-start gap-3">
                <MarkInfoThumbnail markImage={t.mark_image || t.markImage} label={markLabel(t)} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{markLabel(t)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{t.jurisdiction || 'ET'}</Badge>
                    <Badge className={STATUS_COLORS[t.status || 'DRAFT'] || 'bg-primary text-primary-foreground'}>{t.status || 'DRAFT'}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{t.client_name || t.client?.name || '—'}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-semibold">Mark</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Client</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Region</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Filing #</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedRows.map(t => (
                <tr key={t.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/trademarks/${t.id}`)}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><MarkInfoThumbnail markImage={t.mark_image || t.markImage} label={markLabel(t)} /><span className="font-medium truncate">{markLabel(t)}</span></div></td>
                  <td className="px-4 py-3 text-center truncate max-w-[150px]">{t.client_name || t.client?.name || '—'}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="outline">{t.jurisdiction || 'ET'}</Badge></td>
                  <td className="px-4 py-3 text-center"><Badge className={STATUS_COLORS[t.status || 'DRAFT'] || 'bg-primary text-primary-foreground'}>{t.status || 'DRAFT'}</Badge></td>
                  <td className="px-4 py-3 text-center"><Badge>{t.filing_number || t.filingNumber || 'PENDING'}</Badge></td>
                  <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDownloadForm(e, t) }}><DownloadSimple size={16} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><CaretLeft size={16} /></Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                  <Button key={page} variant={currentPage === page ? 'default' : 'ghost'} size="sm" onClick={() => setCurrentPage(page)}>{page}</Button>
                ))}
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><CaretRight size={16} /></Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}