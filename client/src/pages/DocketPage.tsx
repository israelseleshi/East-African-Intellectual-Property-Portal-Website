import {
  Plus,
  MagnifyingGlass,
  DotsThree,
  FileText,
  DownloadSimple,
  CaretLeft,
  CaretRight,
  SquaresFour,
  List,
  ShieldCheck,
  File,
  CheckCircle,
  Clock,
  Globe,
  Eye,
  SealCheck,
  CaretDown
} from '@phosphor-icons/react'
import Joyride, { Step } from 'react-joyride'
import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { Jurisdiction, TrademarkStatus } from '@/shared/database'

import JurisdictionBadge from '../components/JurisdictionBadge'
import StatusPill from '../components/StatusPill'
import { trademarkService } from '../utils/api'
import { useToast } from '../components/ui/toast'
import { useApi } from '../hooks/useApi'
import { Card } from "@/components/ui/card"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"

// Country flags for jurisdictions
const JURISDICTION_FLAGS: Record<string, string> = {
  ALL: '🌍',
  ET: '🇪🇹',
  KE: '🇰🇪',
  ER: '🇪🇷',
  DJ: '🇩🇯',
  SO: '🇸🇴',
  SL: '🇸🇴',
  TZ: '🇹🇿',
  UG: '🇺🇬',
  RW: '🇷🇼',
  BI: '🇧🇮',
  SD: '🇸🇩'
}

const JURISDICTION_NAMES: Record<string, string> = {
  ALL: 'All Jurisdictions',
  ET: 'Ethiopia',
  KE: 'Kenya',
  ER: 'Eritrea',
  DJ: 'Djibouti',
  SO: 'Somalia',
  SL: 'Somaliland',
  TZ: 'Tanzania',
  UG: 'Uganda',
  RW: 'Rwanda',
  BI: 'Burundi',
  SD: 'Sudan'
}

// Status icons
const STATUS_ICONS: Record<string, typeof File> = {
  ALL: ShieldCheck,
  DRAFT: File,
  FILED: Globe,
  FORMAL_EXAM: Clock,
  SUBSTANTIVE_EXAM: Eye,
  PUBLISHED: CheckCircle,
  REGISTERED: SealCheck
}

const STATUS_NAMES: Record<string, string> = {
  ALL: 'All Statuses',
  DRAFT: 'Draft',
  FILED: 'Filed',
  FORMAL_EXAM: 'Formal Exam',
  SUBSTANTIVE_EXAM: 'Substantive',
  PUBLISHED: 'Published',
  REGISTERED: 'Registered'
}

function markLabel(t: { markName?: string; mark_name?: string }) {
  return t.markName || t.mark_name || '—'
}

const JURISDICTION_IMAGE_FLAGS: Record<string, string> = {
  ET: '/flags/ethiopia-flag.png',
  KE: '/flags/kenya-flag.png',
  ER: '/flags/eritrea-flag.png',
  DJ: '/flags/djibouti-flag.png',
  SO: '/flags/somalia-flag.png',
  SL: '/flags/somalia-flag.png',
  TZ: '/flags/tanzania-flag.webp',
  UG: '/flags/uganda-flag.png',
  RW: '/flags/rwanda-flag.png',
  BI: '/flags/burundi-flag.png',
}

// Jurisdiction rendering helper
const JurisdictionFlag = ({ code, className = "h-4 w-6" }: { code: string, className?: string }) => {
  const imgSrc = JURISDICTION_IMAGE_FLAGS[code];
  if (imgSrc) {
    return <img src={imgSrc} alt={code} className={`${className} object-cover rounded-sm shadow-sm`} />;
  }
  return <span className="text-[16px]">{JURISDICTION_FLAGS[code] || '🌍'}</span>;
};

export default function DocketPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const startTourFromUrl = searchParams.get('tour') === 'true'

  const [cases, setCases] = useState<Array<{ id: string; markName?: string; mark_name?: string; filingNumber?: string; filing_date?: string; filingDate?: string; filing_number?: string; client?: { name?: string; type?: string }; client_name?: string; client_type?: string; jurisdiction?: string; status?: string; created_at?: string; updated_at?: string; registration_dt?: string; registrationDt?: string; next_action_date?: string; nextActionDate?: string; priority?: string; markType?: string; colorIndication?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | 'ALL'>('ALL')
  const [status, setStatus] = useState<TrademarkStatus | 'ALL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const pageSize = 5

  // Delete Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [runTour, setRunTour] = useState(startTourFromUrl)
  const caseToDelete = useMemo(() => cases.find(c => c.id === deleteId), [cases, deleteId])

  // Tour Steps
  const tourSteps: Step[] = [
    {
      target: '#trademarks-header',
      content: 'Welcome to the Trademarks Docket. This is your central hub for managing all trademark cases across East African jurisdictions.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#new-application-btn',
      content: 'Create a new trademark application here. This starts the intake process for new filings.',
      placement: 'bottom' as const,
    },
    {
      target: '#search-filter',
      content: 'Search by mark name, filing number, or client name to quickly find specific cases.',
      placement: 'bottom' as const,
    },
    {
      target: '#jurisdiction-filter',
      content: 'Filter by jurisdiction to view cases from specific countries (Ethiopia, Kenya, etc.).',
      placement: 'bottom' as const,
    },
    {
      target: '#status-filter',
      content: 'Filter by case status: Draft, Filed, Under Examination, Published, or Registered.',
      placement: 'bottom' as const,
    },
    {
      target: '#view-toggle',
      content: 'Switch between Table view (detailed) and Grid view (compact cards).',
      placement: 'bottom' as const,
    },
    {
      target: '#trademarks-table',
      content: 'Your trademark cases are displayed here with key information: mark, client, jurisdiction, status, and important dates.',
      placement: 'right' as const,
    },
    {
      target: '#pagination',
      content: 'Navigate through large dockets using pagination. Shows total record count.',
      placement: 'top' as const,
    },
  ]

  useEffect(() => {
    fetchCases()
  }, [q, status, jurisdiction])

  const fetchCases = async () => {
    try {
      setLoading(true)
      const data = await trademarkService.getCases({
        q,
        status: status === 'ALL' ? undefined : status,
        jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction
      })
      setCases(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch cases:', error)
      setCases([])
    } finally {
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    return cases.filter((c: { 
      markName?: string; 
      mark_name?: string; 
      wordMark?: string;
      filingNumber?: string; 
      filing_number?: string; 
      client?: { name?: string }; 
      client_name?: string; 
      jurisdiction?: string; 
      status?: string 
    }) => {
      const matchesQ = !q ||
        c.markName?.toLowerCase().includes(q.toLowerCase()) ||
        c.mark_name?.toLowerCase().includes(q.toLowerCase()) ||
        c.wordMark?.toLowerCase().includes(q.toLowerCase()) ||
        c.filingNumber?.toLowerCase().includes(q.toLowerCase()) ||
        c.filing_number?.toLowerCase().includes(q.toLowerCase()) ||
        c.client?.name?.toLowerCase().includes(q.toLowerCase()) ||
        c.client_name?.toLowerCase().includes(q.toLowerCase())
      const matchesJurisdiction = jurisdiction === 'ALL' || c.jurisdiction === jurisdiction
      const matchesStatus = status === 'ALL' || c.status === status
      return matchesQ && matchesJurisdiction && matchesStatus
    })
  }, [cases, q, jurisdiction, status])

  const totalPages = Math.ceil(filteredRows.length / pageSize)

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [q, jurisdiction, status])

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await trademarkService.deleteCase(deleteId)
      await fetchCases()
      setDeleteId(null)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      addToast({
        title: 'Failed to delete trademark',
        description: error?.response?.data?.error || 'Please try again',
        type: 'error'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownloadForm = async (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    try {
      const api = useApi();
      const forms = await api.get(`/forms/list/${caseId}`);
      
      if (!forms || forms.length === 0) {
        addToast({
          title: 'No Form Available',
          description: 'No uploaded form found for this trademark.',
          type: 'warning'
        });
        return;
      }

      const form = forms[0];
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/forms/download/${form.file_name}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = form.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast({
        title: 'Download Complete',
        description: `Downloaded ${form.file_name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Download error:', error);
      addToast({
        title: 'Download Failed',
        description: 'Could not download the form. Please try again.',
        type: 'error'
      });
    }
  };

  return (
    <div className="w-full">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={(data: { status: string }) => {
          if (['finished', 'skipped'].includes(data.status)) {
            setRunTour(false);
            searchParams.delete('tour');
            setSearchParams(searchParams);
          }
        }}
        styles={{
          options: {
            primaryColor: 'var(--eai-primary)',
            textColor: '#1C1C1E',
            zIndex: 10000,
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltipContainer: {
            textAlign: 'left',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
          buttonNext: {
            borderRadius: '0px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonBack: {
            marginRight: '10px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonSkip: {
            fontSize: '13px',
            fontWeight: 'bold',
          }
        }}
      />
      <header className="flex items-end justify-between" id="trademarks-header">
        <h1 className="text-h1 text-[var(--eai-text)]">Trademarks</h1>
        <button
          id="new-application-btn"
          onClick={() => navigate('/intake/new')}
          className="apple-button-primary flex items-center gap-2 shadow-lg shadow-[var(--eai-primary)]/20"
        >
          <Plus size={18} weight="bold" />
          <span className="text-label text-white">New Application</span>
        </button>
      </header>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-xl border-[var(--eai-border)] bg-[var(--eai-surface)]">
          <DialogHeader>
            <DialogTitle className="text-h3 text-[var(--eai-text)]">Delete Trademark</DialogTitle>
            <DialogDescription className="text-body text-[var(--eai-text-secondary)]">
              Are you sure you want to delete <span className="font-black text-[var(--eai-text)]">"{caseToDelete ? markLabel(caseToDelete) : ''}"</span>?
              This action cannot be undone and will remove all history and documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              className="rounded-xl border-[var(--eai-border)] text-label"
            >
              CANCEL
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-label text-white"
            >
              {isDeleting ? 'DELETING...' : 'DELETE PERMANENTLY'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="apple-card p-4 bg-[var(--eai-surface)] mt-8" id="search-filter">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md" id="search-input">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by mark, filing #, or owner..."
              className="apple-input w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Jurisdiction Dropdown */}
            <div id="jurisdiction-filter">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl border border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-3 py-1.5 h-10 tracking-tight hover:bg-[var(--eai-bg)]/50 transition-colors">
                    <JurisdictionFlag code={jurisdiction} />
                    <span className="text-label text-[var(--eai-text)] ml-1 uppercase">{JURISDICTION_NAMES[jurisdiction]}</span>
                    <CaretDown size={14} className="text-[var(--eai-text-secondary)] ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-xl border-[var(--eai-border)] bg-[var(--eai-surface)] shadow-xl max-h-[300px] overflow-y-auto">
                  {Object.entries(JURISDICTION_NAMES).map(([code, name]) => (
                    <DropdownMenuItem
                      key={code}
                      onClick={() => setJurisdiction(code as Jurisdiction | 'ALL')}
                      className={`px-4 py-2.5 text-label cursor-pointer flex items-center gap-3 ${jurisdiction === code ? 'bg-[var(--eai-primary)] text-white' : 'hover:bg-[var(--eai-bg)]'
                        }`}
                    >
                      <JurisdictionFlag code={code} />
                      <span className={jurisdiction === code ? 'text-white' : 'text-[var(--eai-text)]'}>{name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status Dropdown */}
            <div id="status-filter">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl border border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-3 py-1.5 h-10 tracking-tight hover:bg-[var(--eai-bg)]/50 transition-colors">
                    {(() => {
                      const StatusIcon = STATUS_ICONS[status || 'ALL']
                      return <StatusIcon size={16} weight="bold" className="text-[var(--eai-text-secondary)]" />
                    })()}
                    <span className="text-label text-[var(--eai-text)] ml-1 uppercase">
                      {STATUS_NAMES[status || 'ALL']}
                    </span>
                    <CaretDown size={14} className="text-[var(--eai-text-secondary)] ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-xl border-[var(--eai-border)] bg-[var(--eai-surface)] shadow-xl">
                  {Object.entries(STATUS_NAMES).map(([code, name]) => {
                    const StatusIcon = STATUS_ICONS[code]
                    return (
                      <DropdownMenuItem
                        key={code}
                        onClick={() => setStatus(code as TrademarkStatus | 'ALL')}
                        className={`px-4 py-2.5 text-label cursor-pointer flex items-center gap-3 ${status === code ? 'bg-[var(--eai-primary)] text-white' : 'hover:bg-[var(--eai-bg)]'
                          }`}
                      >
                        <StatusIcon size={18} weight="bold" className={status === code ? 'text-white' : 'text-[var(--eai-text-secondary)]'} />
                        <span className={status === code ? 'text-white' : 'text-[var(--eai-text)]'}>{name}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="text-label text-[var(--eai-text)] ml-2">
              {filteredRows.length} records
            </div>

            <div className="flex items-center gap-1 border border-[var(--eai-border)] bg-[var(--eai-bg)]/30 rounded-xl h-10 ml-4 overflow-hidden" id="view-toggle">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-[var(--eai-primary)] text-white' : 'text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]'}`}
                title="Table View"
              >
                <List size={20} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[var(--eai-primary)] text-white' : 'text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]'}`}
                title="Grid View"
              >
                <SquaresFour size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="w-full animate-pulse">
            {/* Table Skeleton */}
            <div className="apple-card overflow-hidden">
              <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4">
                <div className="h-6 w-48 bg-[var(--eai-border)]/50 rounded" />
              </div>
              <div className="divide-y divide-[var(--eai-border)]">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-5">
                    <div className="h-10 w-10 bg-[var(--eai-border)]/40 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-48 bg-[var(--eai-border)]/40 rounded" />
                      <div className="h-4 w-32 bg-[var(--eai-border)]/30 rounded" />
                    </div>
                    <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                    <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                    <div className="h-4 w-16 bg-[var(--eai-border)]/30 rounded" />
                    <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                    <div className="h-4 w-16 bg-[var(--eai-border)]/30 rounded" />
                    <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-[var(--eai-border)]/30 rounded" />
                      <div className="h-8 w-8 bg-[var(--eai-border)]/30 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center apple-card">
            <MagnifyingGlass size={48} weight="duotone" className="text-[var(--eai-text-secondary)] opacity-20 mb-4" />
            <div className="text-h2 text-[var(--eai-text)]">No records found</div>
            <p className="text-body text-[var(--eai-text-secondary)] mt-2">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedRows.map((t) => (
              <Card
                key={t.id}
                className="apple-card group p-5 cursor-pointer border-none bg-[var(--eai-surface)] hover:bg-[var(--eai-bg)]/50 transition-all duration-300 relative overflow-hidden"
                onClick={() => navigate(`/trademarks/${t.id}`)}
              >
                {/* Cult-UI inspired accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--eai-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--eai-bg)] text-[var(--eai-primary)] group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <ShieldCheck size={24} weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-h3 text-[var(--eai-text)] line-clamp-2 group-hover:text-[var(--eai-primary)] transition-colors">
                      {markLabel(t)}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <JurisdictionBadge jurisdiction={(t.jurisdiction || 'ET') as Jurisdiction} />
                      <StatusPill status={(t.status as TrademarkStatus) || 'DRAFT'} />
                    </div>

                    <div className="mt-4 space-y-2 border-t border-[var(--eai-border)] pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-micro text-[var(--eai-text-secondary)] uppercase">Client</span>
                        <span className="text-body font-bold truncate max-w-[120px]">{t.client_name || t.client?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-micro text-[var(--eai-text-secondary)] uppercase">Filing #</span>
                        <span className="text-body font-bold">{t.filing_number || t.filingNumber || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="apple-card overflow-hidden" id="trademarks-table">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] border-collapse text-left">
                <thead className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30">
                  <tr>
                    <th className="px-6 py-4 text-label">Trademark</th>
                    <th className="px-6 py-4 text-label">Client Name</th>
                    <th className="px-6 py-4 text-label">Client Type</th>
                    <th className="px-6 py-4 text-label">Jurisdiction</th>
                    <th className="px-6 py-4 text-label">Status</th>
                    <th className="px-6 py-4 text-label">Filing Date</th>
                    <th className="px-6 py-4 text-label">Reg. Date</th>
                    <th className="px-6 py-4 text-label">Priority</th>
                    <th className="px-6 py-4 text-label">Next Action</th>
                    <th className="px-6 py-4 text-label text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--eai-border)]">
                  {paginatedRows.map((t) => (
                    <tr
                      key={t.id}
                      className="group cursor-pointer hover:bg-[var(--eai-bg)]/40 transition-colors"
                      onClick={() => navigate(`/trademarks/${t.id}`)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--eai-bg)] group-hover:bg-white dark:group-hover:bg-[var(--eai-surface)] transition-colors text-[var(--eai-text-secondary)] group-hover:text-[var(--eai-primary)] shadow-sm">
                            <FileText size={24} weight="duotone" />
                          </div>
                          <div className="max-w-[200px]">
                            <div className="text-body font-bold text-[var(--eai-text)] leading-tight line-clamp-2">
                              {markLabel(t)}
                            </div>
                            <div className="max-w-[180px] truncate text-micro text-[var(--eai-text-secondary)] mt-1 uppercase">
                              {t.markType || '—'} · {t.colorIndication || 'B&W'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-body font-bold text-[var(--eai-text)] max-w-[150px] truncate">
                        {t.client_name || t.client?.name || '—'}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-primary)] text-white rounded-none uppercase">
                          {(t.client_type || t.client?.type || 'COMPANY').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <JurisdictionBadge jurisdiction={(t.jurisdiction || 'ET') as Jurisdiction} />
                      </td>
                      <td className="px-6 py-5">
                        <StatusPill status={(t.status as TrademarkStatus) || 'DRAFT'} />
                      </td>
                      <td className="px-6 py-5 text-body font-medium text-[var(--eai-text-secondary)]">
                        {(() => { const d = t.filing_date || t.filingDate; return d ? new Date(d).toLocaleDateString() : '—'; })()}
                      </td>
                      <td className="px-6 py-5 text-body font-medium text-[var(--eai-text-secondary)]">
                        {(() => { const d = t.registration_dt || t.registrationDt; return d ? new Date(d).toLocaleDateString() : '—'; })()}
                      </td>
                      <td className="px-6 py-5">
                        {t.priority === 'YES' ? (
                          <span className="text-micro px-2 py-0.5 bg-[var(--eai-critical)] text-white rounded-none uppercase font-black">
                            YES
                          </span>
                        ) : (
                          <span className="text-body text-[var(--eai-text-secondary)]">No</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-body font-medium">
                        {(() => { const d = t.next_action_date || t.nextActionDate; return d ? (
                          <div className="flex flex-col">
                            <span className="text-[var(--eai-text)]">{new Date(d).toLocaleDateString()}</span>
                            <span className="text-micro text-[var(--eai-text-secondary)] uppercase">Pending</span>
                          </div>
                        ) : (
                          <span className="text-[var(--eai-text-secondary)]">—</span>
                        ); })()}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => handleDownloadForm(e, t.id)}
                            className="p-2 rounded-xl hover:bg-white dark:hover:bg-[var(--eai-surface)] text-[var(--eai-primary)] transition-all shadow-sm"
                            title="Download Form"
                          >
                            <DownloadSimple size={18} weight="bold" />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-xl hover:bg-white dark:hover:bg-[var(--eai-surface)] text-[var(--eai-text-secondary)] transition-all shadow-sm outline-none"
                              >
                                <DotsThree size={20} weight="bold" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32 rounded-xl border-[var(--eai-border)] bg-[var(--eai-surface)] shadow-xl">
                              <DropdownMenuItem
                                onClick={() => navigate(`/trademarks/${t.id}`)}
                                className="px-4 py-2 text-orange-500 hover:bg-orange-500/10 cursor-pointer focus:bg-orange-500/10 uppercase font-normal"
                              >
                                Edit Case
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(t.id)}
                                className="px-4 py-2 text-label text-red-500 hover:bg-red-500/10 cursor-pointer focus:bg-red-500/10"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--eai-border)] bg-[var(--eai-bg)]/20 px-6 py-4" id="pagination">
                <div className="text-body text-[var(--eai-text-secondary)]">
                  Showing <span className="font-bold text-[var(--eai-text)]">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-[var(--eai-text)]">{Math.min(currentPage * pageSize, filteredRows.length)}</span> of <span className="font-bold text-[var(--eai-text)]">{filteredRows.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--eai-border)] bg-white dark:bg-[var(--eai-bg)] text-[var(--eai-text)] shadow-sm transition-all hover:bg-[var(--eai-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CaretLeft size={16} weight="bold" />
                  </button>

                  <div className="flex items-center gap-1 mx-2">
                    {(() => {
                      const pages = [];
                      const maxVisible = 5;
                      
                      if (totalPages <= maxVisible) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (currentPage > 3) pages.push('...');
                        
                        const start = Math.max(2, currentPage - 1);
                        const end = Math.min(totalPages - 1, currentPage + 1);
                        
                        for (let i = start; i <= end; i++) {
                          if (!pages.includes(i)) pages.push(i);
                        }
                        
                        if (currentPage < totalPages - 2) pages.push('...');
                        if (!pages.includes(totalPages)) pages.push(totalPages);
                      }

                      return pages.map((page, i) => (
                        page === '...' ? (
                          <span key={`dots-${i}`} className="px-2 text-[var(--eai-text-secondary)]">...</span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(Number(page))}
                            className={`h-8 min-w-[32px] px-2 text-label transition-all ${currentPage === page
                              ? "bg-[var(--eai-primary)] text-white shadow-lg shadow-[var(--eai-primary)]/20 rounded-xl"
                              : "text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]"
                              }`}
                          >
                            {page}
                          </button>
                        )
                      ));
                    })()}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--eai-border)] bg-white dark:bg-[var(--eai-bg)] text-[var(--eai-text)] shadow-sm transition-all hover:bg-[var(--eai-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
