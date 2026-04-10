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
  CaretDown,
  CaretUp
} from '@phosphor-icons/react'
import ExcelJS from 'exceljs'
import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import type { Jurisdiction, TrademarkStatus } from '@/shared/database'

import JurisdictionBadge from '../components/JurisdictionBadge'
import { Skeleton } from '@/components/ui/skeleton'
import StatusPill from '../components/StatusPill'
import { trademarkService } from '../utils/api'
import { fillPdfForm } from '../utils/pdfUtils'
import { useToast } from '../components/ui/toast'
import { Card } from "@/components/ui/card"
import { casesApi } from '@/api/cases'

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

function resolveMarkImageUrl(rawPath?: string) {
  if (!rawPath) return ''
  if (rawPath.startsWith('http') || rawPath.startsWith('data:')) return rawPath

  const devApiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')
  const origin = import.meta.env.PROD ? window.location.origin : devApiBase
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

  if (path.startsWith('/api/')) return `${origin}${path}`
  if (path.startsWith('/uploads/')) return `${origin}/api${path}`
  if (path.startsWith('/forms-download/')) return `${origin}/api${path}`

  const filename = path.replace(/^\//, '')
  return `${origin}/api/forms-download/${filename}`
}

function MarkInfoThumbnail({ markImage, label }: { markImage?: string; label: string }) {
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  const candidates = useMemo(() => {
    const primary = resolveMarkImageUrl(markImage)
    if (!primary) return []

    const list = [primary]
    if (!import.meta.env.PROD) {
      const remote = primary
        .replace(/^http:\/\/localhost:\d+/i, 'https://eastafricanip.com')
        .replace(/^http:\/\/127\.0\.0\.1:\d+/i, 'https://eastafricanip.com')
      if (remote !== primary) list.push(remote)
    }
    return Array.from(new Set(list))
  }, [markImage])

  useEffect(() => {
    setCandidateIndex(0)
    setFailed(false)
  }, [markImage, candidates.join('|')])

  const current = candidates[candidateIndex]

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--eai-bg)] text-[var(--eai-text-secondary)] shadow-sm group-hover:text-[var(--eai-primary)] transition-colors">
      {!failed && current ? (
        <img
          src={current}
          alt={`${label} logo`}
          className="h-full w-full object-cover"
          onError={() => {
            if (candidateIndex < candidates.length - 1) {
              setCandidateIndex((idx) => idx + 1)
            } else {
              setFailed(true)
            }
          }}
        />
      ) : (
        <FileText size={24} weight="duotone" />
      )}
    </div>
  )
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
   searchParams.get('tour') === 'true'

  const [cases, setCases] = useState<Array<{ id: string; markName?: string; mark_name?: string; filingNumber?: string; filing_date?: string; filingDate?: string; filing_number?: string; client?: { name?: string; type?: string }; client_name?: string; client_type?: string; jurisdiction?: string; status?: string; created_at?: string; updated_at?: string; registration_dt?: string; registrationDt?: string; next_action_date?: string; nextActionDate?: string; priority?: string; markType?: string; colorIndication?: string; mark_image?: string; markImage?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | 'ALL'>('ALL')
  const [status, setStatus] = useState<TrademarkStatus | 'ALL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const pageSize = 5

  // Delete Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const caseToDelete = useMemo(() => cases.find(c => c.id === deleteId), [cases, deleteId])

  // Tour Steps
  

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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
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

  const sortedRows = useMemo(() => {
    if (!sortConfig) return filteredRows

    return [...filteredRows].sort((a, b) => {
      let aValue: any = ''
      let bValue: any = ''

      switch (sortConfig.key) {
        case 'mark':
          aValue = (a.markName || a.mark_name || '').toLowerCase()
          bValue = (b.markName || b.mark_name || '').toLowerCase()
          break
        case 'client':
          aValue = (a.client_name || a.client?.name || '').toLowerCase()
          bValue = (b.client_name || b.client?.name || '').toLowerCase()
          break
        case 'region':
          aValue = (a.jurisdiction || '').toLowerCase()
          bValue = (b.jurisdiction || '').toLowerCase()
          break
        case 'status':
          aValue = (a.status || '').toLowerCase()
          bValue = (b.status || '').toLowerCase()
          break
        case 'filing':
          aValue = (a.filing_number || a.filingNumber || '').toLowerCase()
          bValue = (b.filing_number || b.filingNumber || '').toLowerCase()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredRows, sortConfig])

  const totalPages = Math.ceil(filteredRows.length / pageSize)

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, currentPage, pageSize])

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

  const handleDownloadForm = async (e: React.MouseEvent, t: any) => {
    e.stopPropagation();
    try {
      const caseId = t.id;
      
      // 1. Fetch EIPA form data for this case
      const caseData = await casesApi.getById(caseId);
      
      if (!caseData) {
        addToast({
          title: 'No Data Available',
          description: 'No data found for this trademark to fill the PDF.',
          type: 'warning'
        });
        return;
      }

      // 2. Prepare data for filling
      const rawEipaForm = (typeof caseData.eipaForm === 'object' && caseData.eipaForm)
        ? caseData.eipaForm as Record<string, unknown>
        : {};

      const fillData = {
        ...rawEipaForm,
        ...caseData,
        applicant_name_english: rawEipaForm.applicant_name_english || caseData.client?.name || caseData.client_name || '',
        applicant_name_amharic: rawEipaForm.applicant_name_amharic || caseData.client?.localName || caseData.client_local_name || '',
        address_street: rawEipaForm.address_street || caseData.client?.addressStreet || caseData.client_address_street || '',
        address_zone: rawEipaForm.address_zone || caseData.client?.addressZone || caseData.client_address_zone || '',
        city_name: rawEipaForm.city_name || caseData.client?.city || caseData.client_city || '',
        city_code: rawEipaForm.city_code || caseData.client?.cityCode || caseData.client_city_code || '',
        state_name: rawEipaForm.state_name || caseData.client?.stateName || caseData.client_state_name || '',
        state_code: rawEipaForm.state_code || caseData.client?.stateCode || caseData.client_state_code || '',
        zip_code: rawEipaForm.zip_code || caseData.client?.zipCode || caseData.client_zip_code || '',
        house_no: rawEipaForm.house_no || caseData.client?.houseNo || caseData.client_house_no || '',
        wereda: rawEipaForm.wereda || caseData.client?.wereda || caseData.client_wereda || '',
        po_box: rawEipaForm.po_box || caseData.client?.poBox || caseData.client_po_box || '',
        telephone: rawEipaForm.telephone || caseData.client?.phone || caseData.client_telephone || '',
        email: rawEipaForm.email || caseData.client?.email || caseData.client_email || '',
        fax: rawEipaForm.fax || caseData.client?.fax || caseData.client_fax || '',
        nationality: rawEipaForm.nationality || caseData.client?.nationality || caseData.client_nationality || '',
        residence_country: rawEipaForm.residence_country || caseData.client?.residenceCountry || caseData.client_residence_country || '',
        mark_description: rawEipaForm.mark_description || caseData.mark_description || caseData.mark_name || caseData.markName || '',
        mark_translation: rawEipaForm.mark_translation || caseData.translation || '',
        mark_transliteration: rawEipaForm.mark_transliteration || caseData.mark_transliteration || '',
        mark_language_requiring_traslation: rawEipaForm.mark_language_requiring_traslation || caseData.mark_language_requiring_traslation || '',
        mark_has_three_dim_features: rawEipaForm.mark_has_three_dim_features || caseData.mark_has_three_dim_features || '',
        mark_color_indication: rawEipaForm.mark_color_indication || caseData.color_indication || caseData.colorIndication || '',
        image_field: rawEipaForm.image_field || caseData.mark_image || caseData.markImage || '',
        filing_number: rawEipaForm.filing_number || caseData.filing_number || caseData.filingNumber || '',
        registration_no: rawEipaForm.registration_no || caseData.registration_no || caseData.registrationNo || '',
        jurisdiction: caseData.jurisdiction,
      };

      // 3. Fill the PDF
      const pdfUrl = '/application_form.pdf';
      const pdfBytes = await fillPdfForm(pdfUrl, fillData, true);

      // 4. Download the generated PDF
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EIPA_FORM_01_${fillData.applicant_name_english || 'Trademark'}_${caseId.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast({
        title: 'Download Started',
        description: 'Generating filled PDF form...',
        type: 'success'
      });
    } catch (error) {
      console.error('PDF Fill/Download error:', error);
      addToast({
        title: 'Download Failed',
        description: 'Could not generate the filled form. Please try again.',
        type: 'error'
      });
    }
  };

  const handleExportCSV = () => {
    if ((sortedRows || []).length === 0) return;
    
    const headers = [
      'Mark Name', 'Filing Number', 'Jurisdiction', 'Status', 'Client', 'Client Type',
      'Mark Type', 'Color Indication', 'Application Date', 'Publication Date',
      'Registration Date', 'Expiry Date', 'Next Action Date', 'Priority',
      'Nice Classes', 'Goods & Services', 'Client Instructions', 'Remarks',
      'Created At', 'Updated At'
    ];
    
    const csvData = sortedRows.map(c => [
      `"${markLabel(c)}"`,
      `"${c.filing_number || c.filingNumber || 'PENDING'}"`,
      `"${JURISDICTION_NAMES[c.jurisdiction || 'ET'] || c.jurisdiction}"`,
      `"${STATUS_NAMES[c.status || 'DRAFT'] || c.status}"`,
      `"${c.client_name || c.client?.name || '—'}"`,
      `"${c.client_type || c.client?.type || '—'}"`,
      `"${c.markType || 'WORD'}"`,
      `"${c.colorIndication || 'B&W'}"`,
      `"${c.filing_date || c.filingDate || '—'}"`,
      `"${(c as any).publication_date || (c as any).publicationDate || '—'}"`,
      `"${c.registration_dt || c.registrationDt || '—'}"`,
      `"${(c as any).expiry_date || (c as any).expiryDate || '—'}"`,
      `"${c.next_action_date || c.nextActionDate || '—'}"`,
      `"${c.priority || 'NO'}"`,
      `"${(c as any).nice_classes || (c as any).niceClasses?.join(', ') || '—'}"`,
      `"${((c as any).goods_services || (c as any).goodsServices || '—').replace(/"/g, '""')}"`,
      `"${((c as any).client_instructions || (c as any).clientInstructions || '—').replace(/"/g, '""')}"`,
      `"${((c as any).remark || '—').replace(/"/g, '""')}"`,
      `"${c.created_at || '—'}"`,
      `"${c.updated_at || '—'}"`
    ].join(','));
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `trademarks_export_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="trademarks-header">
        <h1 className="text-h1 text-[var(--eai-text)]">Trademarks</h1>
        <div className="flex items-center gap-2">
           <button 
             onClick={handleExportCSV}
             className="apple-button-secondary flex items-center gap-2 text-label h-10 px-4"
           >
             <DownloadSimple size={18} weight="bold" />
             <span>Export CSV</span>
           </button>
           <button 
             onClick={() => navigate('/eipa-forms/application-form')}
             className="apple-button-primary flex items-center gap-2 text-label h-10 px-4"
             id="new-application-btn"
           >
             <Plus size={18} weight="bold" />
             <span>New Application</span>
           </button>
        </div>
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
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-label text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="apple-card p-4 bg-[var(--eai-surface)] mt-8" id="search-filter">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 w-full lg:max-w-md" id="search-input">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by mark, filing #, or owner..."
              className="apple-input w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Jurisdiction Dropdown */}
            <div id="jurisdiction-filter">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl border border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-3 py-1.5 h-10 tracking-tight hover:bg-[var(--eai-bg)]/50 transition-colors">
                    <JurisdictionFlag code={jurisdiction} />
                    <span className="text-label text-[var(--eai-text)] ml-1">{JURISDICTION_NAMES[jurisdiction]}</span>
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
                    <span className="text-label text-[var(--eai-text)] ml-1">
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

            <div className="text-label text-[var(--eai-text)] sm:ml-2">
              {filteredRows.length} records
            </div>

            <div className="flex items-center gap-1 border border-[var(--eai-border)] bg-[var(--eai-bg)]/30 rounded-xl h-10 sm:ml-4 overflow-hidden" id="view-toggle">
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

      <div className="mt-8" id="docket-grid">
        {loading ? (
          <div className="w-full">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <Skeleton className="h-10 w-48" />
              <div className="flex gap-2 w-full sm:w-auto">
                <Skeleton className="h-10 w-32 rounded-xl" />
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </header>

            <Card className="apple-card p-4 bg-[var(--eai-surface)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <Skeleton className="h-10 flex-1 max-w-md rounded-xl" />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Skeleton className="h-10 w-40 rounded-xl" />
                  <Skeleton className="h-10 w-40 rounded-xl" />
                  <Skeleton className="h-10 w-24 rounded-xl" />
                  <Skeleton className="h-10 w-20 rounded-xl" />
                </div>
              </div>
            </Card>

            <div className="mt-8 apple-card overflow-hidden">
              <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4">
                <div className="grid grid-cols-6 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>
              <div className="divide-y divide-[var(--eai-border)]">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-6 py-5 flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-xl" />
                      <Skeleton className="h-8 w-8 rounded-xl" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <span className="text-micro text-[var(--eai-text-secondary)]">Client</span>
                        <span className="text-body font-bold truncate max-w-[120px]">{t.client_name || t.client?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-micro text-[var(--eai-text-secondary)]">Filing #</span>
                        <span className="text-body font-bold">{t.filing_number || t.filingNumber || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="apple-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30">
                  <th 
                    className="px-6 py-4 text-[13px] font-bold text-[var(--eai-text-secondary)] cursor-pointer hover:text-[var(--eai-primary)] transition-colors group/th"
                    onClick={() => handleSort('mark')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Mark information</span>
                      <div className="flex flex-col opacity-0 group-hover/th:opacity-100 transition-opacity">
                        <CaretUp size={10} weight="fill" className={sortConfig?.key === 'mark' && sortConfig.direction === 'asc' ? 'text-[var(--eai-primary)]' : ''} />
                        <CaretDown size={10} weight="fill" className={sortConfig?.key === 'mark' && sortConfig.direction === 'desc' ? 'text-[var(--eai-primary)]' : ''} />
                      </div>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[13px] font-bold text-[var(--eai-text-secondary)] text-center cursor-pointer hover:text-[var(--eai-primary)] transition-colors group/th"
                    onClick={() => handleSort('client')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Client</span>
                      <div className="flex flex-col opacity-0 group-hover/th:opacity-100 transition-opacity">
                        <CaretUp size={10} weight="fill" className={sortConfig?.key === 'client' && sortConfig.direction === 'asc' ? 'text-[var(--eai-primary)]' : ''} />
                        <CaretDown size={10} weight="fill" className={sortConfig?.key === 'client' && sortConfig.direction === 'desc' ? 'text-[var(--eai-primary)]' : ''} />
                      </div>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[13px] font-bold text-[var(--eai-text-secondary)] text-center cursor-pointer hover:text-[var(--eai-primary)] transition-colors group/th"
                    onClick={() => handleSort('region')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Region</span>
                      <div className="flex flex-col opacity-0 group-hover/th:opacity-100 transition-opacity">
                        <CaretUp size={10} weight="fill" className={sortConfig?.key === 'region' && sortConfig.direction === 'asc' ? 'text-[var(--eai-primary)]' : ''} />
                        <CaretDown size={10} weight="fill" className={sortConfig?.key === 'region' && sortConfig.direction === 'desc' ? 'text-[var(--eai-primary)]' : ''} />
                      </div>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[13px] font-bold text-[var(--eai-text-secondary)] text-center cursor-pointer hover:text-[var(--eai-primary)] transition-colors group/th"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Status</span>
                      <div className="flex flex-col opacity-0 group-hover/th:opacity-100 transition-opacity">
                        <CaretUp size={10} weight="fill" className={sortConfig?.key === 'status' && sortConfig.direction === 'asc' ? 'text-[var(--eai-primary)]' : ''} />
                        <CaretDown size={10} weight="fill" className={sortConfig?.key === 'status' && sortConfig.direction === 'desc' ? 'text-[var(--eai-primary)]' : ''} />
                      </div>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[13px] font-bold text-[var(--eai-text-secondary)] text-center cursor-pointer hover:text-[var(--eai-primary)] transition-colors group/th"
                    onClick={() => handleSort('filing')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Filing #</span>
                      <div className="flex flex-col opacity-0 group-hover/th:opacity-100 transition-opacity">
                        <CaretUp size={10} weight="fill" className={sortConfig?.key === 'filing' && sortConfig.direction === 'asc' ? 'text-[var(--eai-primary)]' : ''} />
                        <CaretDown size={10} weight="fill" className={sortConfig?.key === 'filing' && sortConfig.direction === 'desc' ? 'text-[var(--eai-primary)]' : ''} />
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[13px] font-bold text-[var(--eai-text-secondary)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--eai-border)]">
                {paginatedRows.map((t) => (
                  <tr 
                    key={t.id}
                    className="hover:bg-[var(--eai-bg)]/40 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/trademarks/${t.id}/detail`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <MarkInfoThumbnail markImage={t.mark_image || t.markImage} label={markLabel(t)} />
                        <div className="min-w-0">
                          <div className="text-body font-bold text-[var(--eai-text)] leading-tight truncate">
                            {markLabel(t)}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <span className="text-micro font-bold truncate inline-block max-w-[150px]">{t.client_name || t.client?.name || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <JurisdictionBadge jurisdiction={(t.jurisdiction || 'ET') as Jurisdiction} />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <StatusPill status={(t.status as TrademarkStatus) || 'DRAFT'} />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="text-micro px-2 py-0.5 border border-[var(--eai-border)] bg-[var(--eai-primary)] text-white rounded-none">
                        {t.filing_number || t.filingNumber || 'PENDING'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleDownloadForm(e, t)}
                          className="p-2 rounded-xl hover:bg-[var(--eai-bg)] text-[var(--eai-primary)] transition-all"
                          title="Download Form"
                        >
                          <DownloadSimple size={18} weight="bold" />
                        </button>
                        <CaretRight size={18} weight="bold" className="text-[var(--eai-border-strong)]" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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



