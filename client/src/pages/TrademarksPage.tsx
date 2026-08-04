import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Plus, Search as MagnifyingGlass, Download as DownloadSimple, ChevronLeft as CaretLeft, ChevronRight as CaretRight, ChevronUp as CaretUp, ChevronDown as CaretDown, LayoutGrid as SquaresFour, List, ShieldCheck, File, CheckCircle, Clock, Eye, BadgeCheck as SealCheck, Globe, Trash2 as Trash, CheckSquare, Square, Table as TableIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { Spinner } from '@/components/ui/spinner'
import { getMarkImageCandidates } from '@/utils/markImage'
import { useToast } from '@/components/ui/toast'
import { useExcelExport, ExcelColumn } from '@/hooks/useExcelExport'
import ExportProgressModal from '@/components/ExportProgressModal'
import HelpButton from '@/components/HelpButton'
import { casesApi, CasesQuery } from '@/api/cases'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ColumnCustomizerModal } from '@/components/ColumnCustomizerModal'
import JurisdictionBadge from '@/components/JurisdictionBadge'
import { DeadlineAlertPill } from '@/components/trademarks/DeadlineAlertPill'
import { deriveAlertInfo, type AlertSeverity } from '@/utils/alertHelpers'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  loadColumnPreferences,
  saveColumnPreferences,
  getColumnById,
  ALL_COLUMNS,
  COLUMN_GROUPS,
  getDefaultPreferences,
  type ColumnDef,
  type ColumnPreferences,
} from '@/utils/tableColumnConfig'

import countries from 'world-countries'

const COUNTRY_NAME_MAP: Record<string, string> = { ALL: 'All Jurisdictions' }
for (const c of countries) {
  COUNTRY_NAME_MAP[c.cca2] = c.name.common
}
// Ensure East African countries that aren't ISO codes still work
COUNTRY_NAME_MAP['SL'] = 'Somaliland'
COUNTRY_NAME_MAP['CD'] = 'DRC'

const JURISDICTION_NAMES: Record<string, string> = COUNTRY_NAME_MAP

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
  const [loadAttempts, setLoadAttempts] = useState(0)

  const candidates = useMemo(() => {
    return getMarkImageCandidates(markImage)
  }, [markImage])

  useEffect(() => { setCandidateIndex(0); setFailed(false); setLoadAttempts(0) }, [markImage])

  useEffect(() => {
    if (failed && loadAttempts < 3) {
      const timer = setTimeout(() => {
        setFailed(false)
        setLoadAttempts(a => a + 1)
        setCandidateIndex(0)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [failed, loadAttempts])

  const current = candidates[candidateIndex]

  const handleError = () => {
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex(idx => idx + 1)
    } else {
      setFailed(true)
    }
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground shadow-sm">
      {!failed && current ? (
        <img
          src={current}
          alt={`${label} logo`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={handleError}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
          <ShieldCheck size={20} className="text-muted-foreground/60" />
        </div>
      )}
    </div>
  )
}

function getImageExtension(url: string, contentType: string | null): 'png' | 'jpeg' {
  const ct = (contentType || '').toLowerCase()
  if (ct.includes('png')) return 'png'
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpeg'
  const lowered = url.toLowerCase()
  if (lowered.includes('.png')) return 'png'
  return 'jpeg'
}

async function compressImageBytes(buffer: ArrayBuffer, mimeType: string): Promise<{ bytes: Uint8Array; extension: 'png' | 'jpeg' }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No canvas context'))

      const maxDim = 120
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      // Fill white background for transparency to jpeg conversion
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      // Aggressive compression
      canvas.toBlob(
        (blobResult) => {
          if (!blobResult) return reject(new Error('Compression failed'))
          blobResult.arrayBuffer().then((buf) => {
            resolve({ bytes: new Uint8Array(buf), extension: 'jpeg' })
          }).catch(reject)
        },
        'image/jpeg',
        0.5
      )
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  }  )
}

// ── Excel group color helpers ──────────────────────────────────────
function getGroupFillColor(groupId: string): string {
  const colors: Record<string, string> = {
    markInfo: 'DCE8F5',  // bg-blue-100
    dates: 'FEF3CD',     // bg-amber-100
    status: 'D5F5E3',    // bg-emerald-100
    client: 'E8DAEF',    // bg-purple-100
    priority: 'FCE4EC',  // bg-rose-100
    lifecycle: 'F1F5F9', // bg-slate-100
  }
  return colors[groupId] || 'F3F4F6'
}

function getGroupTextColor(groupId: string): string {
  const colors: Record<string, string> = {
    markInfo: '1E40AF',  // text-blue-800
    dates: '92400E',     // text-amber-800
    status: '065F46',    // text-emerald-800
    client: '5B21B6',    // text-purple-800
    priority: '9F1239',  // text-rose-800
    lifecycle: '1E293B', // text-slate-800
  }
  return colors[groupId] || '1F2937'
}

async function fetchImageForExcel(imageUrl: string): Promise<{ bytes: Uint8Array; extension: 'png' | 'jpeg' } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(imageUrl, { 
      signal: controller.signal,
      mode: 'cors',
      credentials: 'include'
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText} - ${imageUrl}`);
      return null;
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.toLowerCase().startsWith('image/')) {
      return null;
    }
    const buffer = await response.arrayBuffer()
    if (!buffer.byteLength) return null
    try {
      return await compressImageBytes(buffer, contentType)
    } catch (compressErr) {
      console.warn('Image compression failed, using original:', compressErr)
      return {
        bytes: new Uint8Array(buffer),
        extension: getImageExtension(imageUrl, contentType),
      }
    }
  } catch (err) {
    console.error(`Error fetching image from ${imageUrl}:`, err);
    return null
  }
}

export default function TrademarksPage() {
  const navigate = useNavigate()
  const { toast: addToast } = useToast()
  const [searchParams] = useSearchParams()

  type CaseRow = {
    id: string; markName?: string; mark_name?: string; filingNumber?: string; filing_number?: string;
    filingDate?: string; filing_date?: string; client?: { name?: string; type?: string }; client_name?: string;
    client_type?: string; jurisdiction?: string; status?: string; type?: string; created_at?: string; updated_at?: string;
    registration_dt?: string; registrationDt?: string; registration_number?: string; registrationNumber?: string;
    next_action_date?: string; nextActionDate?: string; expiry_date?: string; expiryDate?: string;
    next_renewal_date?: string; nextRenewalDate?: string; publication_date?: string; publicationDate?: string;
    priority?: string; markType?: string; colorIndication?: string; mark_image?: string; markImage?: string;
    certificate_number?: string; certificateNumber?: string;
  }

  const [cases, setCases] = useState<CaseRow[]>([])
  const [allCases, setAllCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [q, setQ] = useState('')
  const [jurisdiction, setJurisdiction] = useState<string | 'ALL'>('ALL')
  const [status, setStatus] = useState<string | 'ALL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [alertFilter, setAlertFilter] = useState<AlertSeverity | 'all'>('all')
  const [sortKey, setSortKey] = useState<'markName' | 'nextActionDate' | 'alert' | null>('alert')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const pageSize = 20

  // Column visibility customization
  const [showColumnModal, setShowColumnModal] = useState(false)
  const [colPrefs, setColPrefs] = useState<ColumnPreferences>(() => loadColumnPreferences())

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isExporting, exportProgress, startExport } = useExcelExport()

  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const topSpacerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bottom = bottomScrollRef.current
    const spacer = topSpacerRef.current
    if (!bottom || !spacer) return
    const ro = new ResizeObserver(() => {
      spacer.style.width = `${bottom.scrollWidth}px`
    })
    ro.observe(bottom)
    return () => ro.disconnect()
  }, [])

  const syncScroll = useCallback((source: 'top' | 'bottom') => (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft
    if (source === 'top' && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = scrollLeft
    }
    if (source === 'bottom' && topScrollRef.current) {
      topScrollRef.current.scrollLeft = scrollLeft
    }
  }, [])

  useEffect(() => { fetchCases() }, [q, status, jurisdiction, currentPage, sortKey, sortDir])

  useEffect(() => { fetchAllCasesForAlerts() }, [q, status, jurisdiction, sortKey, sortDir])

  const fetchAllCasesForAlerts = async () => {
    try {
      const firstResponse = await casesApi.listPage({
        q,
        page: 1,
        pageSize: 500,
        sort: 'created_at_desc',
        status: status === 'ALL' ? undefined : status,
        jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction,
        includeDeadlines: true
      })
      const total = Number(firstResponse?.total || 0)
      let rows = Array.isArray(firstResponse?.rows) ? (firstResponse.rows as CaseRow[]) : []
      if (total > rows.length) {
        const remainingPages = Math.ceil(total / 500)
        const extraPages = []
        for (let p = 2; p <= remainingPages; p++) {
          const r = await casesApi.listPage({
            q,
            page: p,
            pageSize: 500,
            sort: 'created_at_desc',
            status: status === 'ALL' ? undefined : status,
            jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction,
            includeDeadlines: true
          })
          if (Array.isArray(r?.rows)) {
            extraPages.push(...(r.rows as CaseRow[]))
          }
        }
        rows = [...rows, ...extraPages]
      }
      setAllCases(rows)
    } catch {
      setAllCases([])
    }
  }

  const fetchCases = async () => {
    try {
      setLoading(true)
      let sort: CasesQuery['sort'] = 'created_at_desc'
      if (sortKey === 'markName') {
        sort = sortDir === 'asc' ? 'mark_name_asc' : 'mark_name_desc'
      } else if (sortKey === 'nextActionDate') {
        sort = sortDir === 'asc' ? 'filing_date_asc' : 'filing_date_desc'
      }
      const response = await casesApi.listPage({
        q,
        page: currentPage,
        pageSize,
        sort,
        status: status === 'ALL' ? undefined : status,
        jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction,
        includeDeadlines: true
      })
      setCases(Array.isArray(response?.rows) ? (response.rows as CaseRow[]) : [])
      setTotalCount(Number(response?.total || 0))
    } catch {
      setCases([])
      setTotalCount(0)
    }
    finally { setLoading(false) }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRows.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return

    const idsToDelete = Array.from(selectedIds)
    const count = idsToDelete.length
    const idSet = new Set(idsToDelete)

    const casesSnapshot = cases
    const allCasesSnapshot = allCases
    const countSnapshot = totalCount

    setIsDeleting(true)
    try {
      setCases(prev => prev.filter(c => !idSet.has(c.id)))
      setAllCases(prev => prev.filter(c => !idSet.has(c.id)))
      setTotalCount(prev => Math.max(0, prev - count))
      setSelectedIds(new Set())
      setShowDeleteDialog(false)

      await casesApi.bulkDelete(idsToDelete)

      toast.success(`${count} trademark(s) moved to trash.`)
    } catch (error) {
      setCases(casesSnapshot)
      setAllCases(allCasesSnapshot)
      setTotalCount(countSnapshot)
      console.error('Bulk delete failed:', error)
      toast.error('Failed to delete trademarks.', {
        description: 'Your selection has been restored. Please try again.',
        action: {
          label: 'Retry',
          onClick: () => { handleBulkDelete() }
        }
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const alertFilteredAll = useMemo(() => {
    if (alertFilter === 'all') return null
    return allCases.filter(c => deriveAlertInfo(c).severity === alertFilter)
  }, [allCases, alertFilter])

  const totalPages = useMemo(() => {
    if (alertFilter === 'all') {
      return Math.max(1, Math.ceil(totalCount / pageSize))
    }
    if (!alertFilteredAll) return 1
    return Math.max(1, Math.ceil(alertFilteredAll.length / pageSize))
  }, [alertFilter, totalCount, alertFilteredAll, pageSize])

  const filteredRows = useMemo(() => {
    if (alertFilter === 'all') return allCases
    if (!alertFilteredAll) return allCases
    return alertFilteredAll
  }, [allCases, alertFilteredAll, alertFilter])

  const handleSort = (key: 'markName' | 'nextActionDate' | 'alert') => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows
    const arr = [...filteredRows]
    if (sortKey === 'markName') {
      arr.sort((a, b) => {
        const av = markLabel(a).toLowerCase()
        const bv = markLabel(b).toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    } else if (sortKey === 'nextActionDate') {
      arr.sort((a, b) => {
        const ad = new Date(a.nextActionDate || a.next_action_date || '').getTime() || 0
        const bd = new Date(b.nextActionDate || b.next_action_date || '').getTime() || 0
        return sortDir === 'asc' ? ad - bd : bd - ad
      })
    } else if (sortKey === 'alert') {
      arr.sort((a, b) => {
        const ad = deriveAlertInfo(a).daysRemaining ?? 9999
        const bd = deriveAlertInfo(b).daysRemaining ?? 9999
        if (sortDir === 'asc') {
          if (ad >= 0 && bd >= 0) return ad - bd
          if (ad < 0 && bd < 0) return bd - ad
          return ad >= 0 ? -1 : 1
        }
        if (ad >= 0 && bd >= 0) return bd - ad
        if (ad < 0 && bd < 0) return ad - bd
        return ad >= 0 ? 1 : -1
      })
    }
    return arr
  }, [filteredRows, sortKey, sortDir])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, currentPage, pageSize])

  const visibleColumnDefs = useMemo(() => {
    const visibleSet = new Set(colPrefs.visibleColumns)
    const order = colPrefs.columnOrder || ALL_COLUMNS.map(c => c.id)
    return order
      .filter(id => visibleSet.has(id))
      .map(id => getColumnById(id))
      .filter((d): d is ColumnDef => d !== undefined)
  }, [colPrefs])

  useEffect(() => { setCurrentPage(1) }, [q, jurisdiction, status, alertFilter, sortKey, sortDir])

  const handleDownloadForm = async (e: React.MouseEvent, t: CaseRow) => {
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
      
      // Merge top-level case data into eipaForm to ensure PDF engine gets the latest DB values
      const eipaForm = (caseData.eipaForm ?? null) as Record<string, unknown> | null
      const resolvedImage = caseData.mark_image || caseData.markImage || eipaForm?.image_field as string || eipaForm?.mark_image as string || ''

      const mergedData = {
        ...(caseData.eipaForm as Record<string, unknown> || {}),
        // Primary Checkboxes (Mark Type)
        chk_goods: !!caseData.chk_goods,
        chk_services: !!caseData.chk_services,
        chk_collective: !!caseData.chk_collective,
        // Primary Checkboxes (Mark Form)
        type_word: !!caseData.is_word,
        type_figur: !!caseData.is_figurative,
        k_type_mi: !!caseData.is_mixed,
        type_thre: !!caseData.is_three_dim,
        // Secondary data
        priority_country: caseData.priority_country,
        priority_filing_date: caseData.priority_filing_date,
        disclaimer_text_english: caseData.disclaimer_english,
        disclaimer_text_amharic: caseData.disclaimer_amharic,
        mark_description: caseData.mark_description,
        mark_name: caseData.markName || caseData.mark_name,
        // Mark image - ensure it gets passed for PDF embedding
        mark_image: resolvedImage,
        image_field: resolvedImage,
        // Signature fields
        applicant_sign_day: caseData.applicant_sign_day || '',
        applicant_sign_month: caseData.applicant_sign_month || '',
        applicant_sign_year_en: caseData.applicant_sign_year_en || '',
        // Priority checklist
        chk_priority_accompanies: !!caseData.chk_priority_accompanies,
        chk_priority_submitted_later: !!caseData.chk_priority_submitted_later
      }
      
      const { fillPdfForm } = await import('@/utils/pdfUtils')
      const pdfBytes = await fillPdfForm(pdfUrl, mergedData)
      const pdfArrayBuffer: ArrayBuffer = pdfBytes instanceof ArrayBuffer
        ? pdfBytes
        : (pdfBytes as unknown as ArrayBuffer)
      const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' })

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

  const exportColExtractors: Record<string, (c: CaseRow) => string> = {
    markName: (c) => markLabel(c),
    markType: (c) => c.markType || 'Word',
    filingNumber: (c) => c.filing_number || c.filingNumber || 'PENDING',
    registrationNumber: (c) => c.registration_number || (c as CaseRow).registrationNumber || '—',
    certificateNumber: (c) => c.certificate_number || (c as any).certificateNumber || '—',
    colorIndication: (c) => c.colorIndication || '—',
    filingDate: (c) => (c.filingDate || c.filing_date) ? new Date(c.filingDate || c.filing_date!).toISOString().split('T')[0] : '—',
    publicationDate: (c) => (c.publicationDate || c.publication_date) ? new Date(c.publicationDate || c.publication_date!).toISOString().split('T')[0] : '—',
    registrationDate: (c) => (c.registrationDt || c.registration_dt) ? new Date(c.registrationDt || c.registration_dt!).toISOString().split('T')[0] : '—',
    expiryDate: (c) => (c.expiryDate || c.expiry_date) ? new Date(c.expiryDate || c.expiry_date!).toISOString().split('T')[0] : '—',
    nextRenewalDate: (c) => (c.nextRenewalDate || c.next_renewal_date) ? new Date(c.nextRenewalDate || c.next_renewal_date!).toISOString().split('T')[0] : '—',
    nextActionDate: (c) => (c.nextActionDate || c.next_action_date) ? new Date(c.nextActionDate || c.next_action_date!).toISOString().split('T')[0] : '—',
    status: (c) => STATUS_NAMES[c.status || 'DRAFT'] || c.status || 'Draft',
    flowStage: (c) => (c as any).flow_stage || (c as any).flowStage || '—',
    jurisdiction: (c) => JURISDICTION_NAMES[c.jurisdiction || 'ET'] || c.jurisdiction || 'Ethiopia',
    clientName: (c) => c.client_name || c.client?.name || '—',
    clientType: (c) => c.client_type || c.client?.type || '—',
    priority: (c) => c.priority || '—',
    priorityCountry: (c) => (c as any).priority_country || '—',
    priorityFilingDate: (c) => (c as any).priority_filing_date || '—',
    createdAt: (c) => c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '—',
    updatedAt: (c) => c.updated_at ? new Date(c.updated_at).toISOString().split('T')[0] : '—',
    deadlineType: (c) => (c as any).deadline_type || (c as any).deadlineType || '—',
    deadlineDue: (c) => (c as any).deadline_due || (c as any).deadlineDue || '—',
  }

  const handleExportExcel = async () => {
    const exportResponse = await casesApi.listPage({
      q,
      page: 1,
      pageSize: 1000,
      sort: 'created_at_desc',
      status: status === 'ALL' ? undefined : status,
      jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction,
      includeDeadlines: true
    })
    const exportRows = Array.isArray(exportResponse?.rows) ? (exportResponse.rows as CaseRow[]) : []
    if (!exportRows.length) return

    // Build export column definitions — insert a dedicated markImage column after markName
    const baseCols = ALL_COLUMNS.filter(c => c.id !== 'actions')
    const exportColDefs: ColumnDef[] = []
    for (const col of baseCols) {
      exportColDefs.push(col)
      if (col.id === 'markName') {
        exportColDefs.push({
          id: 'markImage',
          label: 'Mark Image',
          group: col.group,
          defaultVisible: false,
          fieldKey: 'mark_image',
        })
      }
    }
    // Cache the 1-based column index for image placement
    const imageColIdx = exportColDefs.findIndex(c => c.id === 'markImage') + 1

    const exportColumns: ExcelColumn[] = exportColDefs.map(def => ({
      header: def.label,
      key: def.id,
      width: def.id === 'markName' ? 30 : def.id === 'markImage' ? 14 : def.id === 'clientName' ? 30 : 20,
    }))

    // Build group boundary indices (1-based) for category sub-header row
    const groupBoundaries: { groupId: string; groupLabel: string; fillColor: string; textColor: string; start: number; end: number }[] = []
    let colIndex = 0
    for (const col of exportColDefs) {
      colIndex++
      const group = COLUMN_GROUPS.find(g => g.id === col.group)
      if (!group) continue
      const prev = groupBoundaries[groupBoundaries.length - 1]
      if (!prev || prev.groupId !== col.group) {
        groupBoundaries.push({
          groupId: col.group,
          groupLabel: group.label,
          fillColor: getGroupFillColor(col.group),
          textColor: getGroupTextColor(col.group),
          start: colIndex,
          end: colIndex,
        })
      } else {
        prev.end = colIndex
      }
    }

    startExport({
      sheetName: 'Trademarks',
      fileName: 'EAIP_Trademarks',
      columns: exportColumns,
      rows: exportRows,
      mapRow: (c) => {
        const row: Record<string, string> = {}
        for (const def of exportColDefs) {
          if (def.id === 'markImage') {
            row.markImage = ''  // image rendered visually by formatRow
            continue
          }
          const extractor = exportColExtractors[def.id]
          row[def.id] = extractor ? extractor(c) : '—'
        }
        return row
      },
      formatHeader: (ws: unknown) => {
        const worksheet = ws as Record<string, unknown>
        const colCount = (worksheet.columns as unknown[]).length

        // Insert 3 empty rows at top: title, categories, column headers
        ;(worksheet as any).spliceRows(1, 0, [], [], [])

        const borderStyle = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }

        // ── Row 1: Title ──
        ;(worksheet as any).mergeCells(1, 1, 1, colCount)
        const titleCell = (worksheet as any).getCell(1, 1)
        titleCell.value = 'EAST AFRICAN INTELLECTUAL PROPERTY PORTAL — TRADEMARKS MASTER LIST'
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F497D' } }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        titleCell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        ;(worksheet as any).getRow(1).height = 35

        // ── Row 2: Category / Group sub-headers with color coding ──
        const catRow = (worksheet as any).getRow(2)
        catRow.height = 28

        for (const group of groupBoundaries) {
          if (group.start !== group.end) {
            ;(worksheet as any).mergeCells(2, group.start, 2, group.end)
          }
          const cell = catRow.getCell(group.start)
          cell.value = group.groupLabel
          cell.font = { bold: true, color: { argb: `FF${group.textColor}` }, size: 10 }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${group.fillColor}` } }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        }

        // ── Row 3: Column headers ──
        const headerRow = (worksheet as any).getRow(3)
        headerRow.height = 35
        headerRow.font = { bold: true, color: { argb: 'FF000000' }, size: 10 }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        for (let i = 1; i <= colCount; i++) {
          headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
          headerRow.getCell(i).border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        }

        // Freeze rows 1-3 (title + categories + headers) and add auto-filter on headers
        ;(worksheet as any).views = [{ state: 'frozen', ySplit: 3 }]
        ;(worksheet as any).autoFilter = {
          from: { row: 3, column: 1 },
          to: { row: 3, column: colCount },
        }
      },
      formatRow: async (row: unknown, c: CaseRow) => {
        try {
          const excelRow = row as Record<string, unknown>
          ;(excelRow as any).height = 65

          const rawImagePath = (c.mark_image || c.markImage || '').trim()
          if (rawImagePath) {
            const candidates = getMarkImageCandidates(rawImagePath)
            let imagePayload: { bytes: Uint8Array; extension: 'png' | 'jpeg' } | null = null
            for (const candidate of candidates) {
              imagePayload = await fetchImageForExcel(candidate)
              if (imagePayload) break
            }
            if (imagePayload) {
              const ws = (excelRow as any).worksheet
              const wb = ws.parent
              const imageId = wb.addImage({
                buffer: imagePayload.bytes,
                extension: imagePayload.extension,
              })
              // Place image in the dedicated Mark Image column
              ws.addImage(imageId, {
                tl: { col: imageColIdx - 0.85, row: (excelRow as any).number - 0.9 },
                ext: { width: 55, height: 55 },
              })
            }
          }
        } catch {
          // ignore image errors in export
        }
      },
      successMessage: 'Detailed Excel file has been downloaded.',
      errorMessage: 'Could not generate Excel file',
    })
  }

  const renderCell = useCallback((row: CaseRow, col: ColumnDef) => {
    switch (col.render) {
      case 'mark':
        return (
          <div className="flex items-center gap-3">
            <MarkInfoThumbnail markImage={row.mark_image || row.markImage} label={markLabel(row)} />
            <span className="font-medium truncate hover:underline">{markLabel(row)}</span>
          </div>
        )
      case 'statusBadge': {
        const statusKey = row.status || 'DRAFT'
        return (
          <Badge className={STATUS_COLORS[statusKey] || 'bg-primary text-primary-foreground'}>
            {STATUS_NAMES[statusKey] || statusKey}
          </Badge>
        )
      }
      case 'jurisdictionBadge':
        return <JurisdictionBadge jurisdiction={row.jurisdiction || 'ET'} />
      case 'filingBadge':
        return <span className="font-medium text-sm">{row.filing_number || row.filingNumber || 'PENDING'}</span>
      case 'actions':
        return (
          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDownloadForm(e, row) }}>
            <DownloadSimple size={16} />
          </Button>
        )
      default: {
        const record = row as unknown as Record<string, unknown>
        let value = record[col.fieldKey] ?? record[col.id] ?? '—'
        if (value === '—' && col.id === 'nextRenewalDate') {
          value = row.expiry_date || row.expiryDate || '—'
        }
        if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
          return value.split('T')[0]
        }
        if (typeof value === 'object' && value !== null) {
          const obj = value as Record<string, unknown>
          return String(obj.name ?? obj.type ?? '—')
        }
        return String(value)
      }
    }
  }, [handleDownloadForm])

  return (
    <div className="w-full max-w-[100vw] mx-auto p-4 md:p-10 space-y-8 min-h-screen bg-[#F8F9FA] overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <Typography.h1 className="tracking-tight font-bold">Trademark Registry</Typography.h1>
          <Typography.p className="text-muted-foreground text-lg font-medium opacity-80 hidden sm:block">Manage and track your intellectual property portfolio across East Africa.</Typography.p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HelpButton pageId="trademarks" />
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                variant="destructive"
                className="flex items-center gap-2 h-12 px-6 rounded-xl shadow-sm hover:shadow-md transition-all"
              >
                <Trash size={20} />
                <span className="font-bold">Delete {selectedIds.size}</span>
              </Button>
            </div>
          )}
          <Button data-tour="columns-button" variant="outline" onClick={() => setShowColumnModal(true)} className="bg-white hover:shadow-md transition-all h-12 px-5 rounded-xl border-none shadow-sm font-semibold" title="Customize columns">
            <TableIcon size={20} className="mr-2" />
            <span className="hidden sm:inline">Columns</span>
          </Button>
          <Button data-tour="export-button" variant="outline" onClick={handleExportExcel} disabled={isExporting} className="bg-white hover:shadow-md transition-all h-12 px-5 rounded-xl border-none shadow-sm font-semibold">
            <DownloadSimple size={20} className="mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
          <Button data-tour="new-application-button" onClick={() => navigate('/eipa-forms/application-form')} className="h-12 px-6 rounded-xl shadow-sm hover:shadow-md transition-all font-bold">
            <Plus size={20} className="mr-2" />
            <span className="hidden sm:inline">New Application</span>
          </Button>
        </div>
      </header>

      <ExportProgressModal
        isExporting={isExporting}
        progress={exportProgress}
        message="Exporting Trademarks..."
        subtext="Compressing images and generating your Excel file."
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
          <AlertDialogHeader className="p-10 border-b border-border/50 bg-destructive/5">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive shadow-inner">
                <Trash size={32} />
              </div>
              <div>
                <AlertDialogTitle className="text-2xl font-black tracking-tight uppercase">Purge Protocol</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-bold text-destructive/80 mt-1">
                  SYSTEMIC TRADEMARK DECOMMISSIONING
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="p-10">
            <p className="text-base font-medium text-muted-foreground leading-relaxed">
              You are about to move <span className="text-foreground font-black underline decoration-destructive/30 decoration-2 underline-offset-4">{selectedIds.size} trademark(s)</span> to the trash repository. This action will suspend systemic tracking but can be reversed via security protocols.
            </p>
          </div>
          <AlertDialogFooter className="p-10 border-t border-border/50 bg-muted/20 gap-3">
            <AlertDialogCancel className="h-14 px-8 rounded-2xl font-bold border-none bg-white hover:bg-muted/50 shadow-sm transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              className="h-14 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-destructive text-white hover:bg-destructive/90 shadow-xl shadow-destructive/20 transition-all"
            >
              {isDeleting ? "Processing..." : "Confirm Purge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 w-full lg:max-w-xl relative">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={20} />
            <Input data-tour="search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by mark name, filing number, or client..." className="pl-12 bg-muted/30 border-none h-12 rounded-xl focus-visible:ring-primary/20" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-tour="jurisdiction-filter" variant="ghost" className="h-12 justify-between bg-muted/30 border-none rounded-xl px-5 hover:bg-muted/50 font-semibold min-w-[180px]">
                  <span className="truncate">{JURISDICTION_NAMES[jurisdiction]}</span>
                  <CaretDown size={14} className="ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl border-none shadow-premium p-2">
                {Object.entries(JURISDICTION_NAMES).map(([code, name]) => (
                  <DropdownMenuItem key={code} onClick={() => setJurisdiction(code)} className={`rounded-lg py-2.5 font-medium ${jurisdiction === code ? 'bg-primary/5 text-primary' : ''}`}>
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-tour="status-filter" variant="ghost" className="h-12 justify-between bg-muted/30 border-none rounded-xl px-5 hover:bg-muted/50 font-semibold min-w-[160px]">
                  <span className="truncate">{STATUS_NAMES[status]}</span>
                  <CaretDown size={14} className="ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl border-none shadow-premium p-2">
                {Object.entries(STATUS_NAMES).map(([code, name]) => (
                  <DropdownMenuItem key={code} onClick={() => setStatus(code)} className={`rounded-lg py-2.5 font-medium ${status === code ? 'bg-primary/5 text-primary' : ''}`}>
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-12 justify-between bg-primary/5 border border-primary/10 rounded-xl px-5 hover:bg-primary/10 font-semibold min-w-[160px]">
                  <span className="truncate">{alertFilter === 'all' ? 'All Records' : alertFilter.toUpperCase()}</span>
                  <span className="ml-2 text-xs font-bold text-primary/70">{alertFilter === 'all' ? totalCount : (alertFilteredAll?.length ?? 0)}</span>
                  <CaretDown size={14} className="ml-1 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl border-none shadow-premium p-2">
                <DropdownMenuItem onClick={() => setAlertFilter('all')} className={`rounded-lg py-2.5 font-medium ${alertFilter === 'all' ? 'bg-primary/5 text-primary' : ''}`}>
                  <span className="flex items-center gap-2">All Records <span className="text-xs text-muted-foreground">({totalCount})</span></span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAlertFilter('critical')} className={`rounded-lg py-2.5 font-medium ${alertFilter === 'critical' ? 'bg-red-50 text-red-700' : ''}`}>
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2" /> Critical
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAlertFilter('high')} className={`rounded-lg py-2.5 font-medium ${alertFilter === 'high' ? 'bg-orange-50 text-orange-700' : ''}`}>
                  <span className="w-2 h-2 rounded-full bg-orange-500 mr-2" /> High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAlertFilter('medium')} className={`rounded-lg py-2.5 font-medium ${alertFilter === 'medium' ? 'bg-yellow-50 text-yellow-700' : ''}`}>
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" /> Medium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAlertFilter('low')} className={`rounded-lg py-2.5 font-medium ${alertFilter === 'low' ? 'bg-blue-50 text-blue-700' : ''}`}>
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" /> Low
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAlertFilter('info')} className={`rounded-lg py-2.5 font-medium ${alertFilter === 'info' ? 'bg-slate-50 text-slate-700' : ''}`}>
                  <span className="w-2 h-2 rounded-full bg-slate-500 mr-2" /> Info
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1 h-12">
              <Button data-tour="view-toggle" variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className={`h-10 w-10 rounded-lg transition-all ${viewMode === 'table' ? 'shadow-md' : 'hover:bg-white/50'}`} onClick={() => setViewMode('table')}><List size={20} /></Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className={`h-10 w-10 rounded-lg transition-all ${viewMode === 'grid' ? 'shadow-md' : 'hover:bg-white/50'}`} onClick={() => setViewMode('grid')}><SquaresFour size={20} /></Button>
            </div>
          </div>
        </div>
      </Card>

      <ColumnCustomizerModal
        open={showColumnModal}
        onOpenChange={setShowColumnModal}
        preferences={colPrefs}
        onApply={(prefs) => {
          setColPrefs(prefs)
          saveColumnPreferences(prefs)
        }}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-3xl border-none shadow-sm" />)}
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-muted rounded-3xl bg-white/50">
          <MagnifyingGlass size={64} className="text-muted-foreground/20 mb-6" />
          <Typography.h3 className="text-primary font-bold tracking-tight">No trademarks found</Typography.h3>
          <Typography.p className="text-muted-foreground font-medium mt-2">Try adjusting your search query or filters.</Typography.p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedRows.map(t => (
              <Card key={t.id} className="p-6 cursor-pointer border-none shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-500 bg-white rounded-3xl group" onClick={() => navigate(`/trademarks/${t.id}`)}>
                <div className="flex items-start gap-5">
                  <div className="group-hover:scale-110 transition-transform duration-500">
                    <MarkInfoThumbnail markImage={t.mark_image || t.markImage} label={markLabel(t)} />
                  </div>
                  <div className="flex-1 min-w-0">
                      <Typography.h4 className="truncate font-bold tracking-tight text-primary group-hover:text-accent transition-colors text-lg">{markLabel(t)}</Typography.h4>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="outline" className="bg-muted/30 border-none font-bold text-[10px] px-2 py-0.5">{t.jurisdiction || 'ET'}</Badge>
                      <Badge className={`${STATUS_COLORS[t.status || 'DRAFT'] || 'bg-primary'} border-none shadow-sm font-bold text-[10px] px-2 py-0.5 tracking-wider`}>
                        {STATUS_NAMES[t.status || 'DRAFT'] || t.status || 'DRAFT'}
                      </Badge>
                    </div>
                    <div className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{t.client_name || t.client?.name || '—'}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><CaretLeft size={16} /></Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button 
                          key={page} 
                          variant={currentPage === page ? 'default' : 'ghost'} 
                          size="sm" 
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 || 
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-2 text-muted-foreground">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><CaretRight size={16} /></Button>
              </div>
              <span className="text-sm text-muted-foreground font-medium">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
              </span>
            </div>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden border-none shadow-sm bg-white p-0">
          {/* Synchronized top scroll bar */}
          <div
            ref={topScrollRef}
            onScroll={syncScroll('top')}
            className="overflow-x-auto w-full"
            style={{ height: 0, minHeight: 0, overflowY: 'hidden' }}
          >
            <div ref={topSpacerRef} style={{ height: 1 }} />
          </div>
          <div ref={bottomScrollRef} className="overflow-x-auto w-full" onScroll={syncScroll('bottom')}>
            <Table ref={tableRef}>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="sticky left-0 z-20 bg-muted/50 w-12 px-4">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      {selectedIds.size === filteredRows.length && filteredRows.length > 0 ? (
                        <CheckSquare size={18} className="text-primary" />
                      ) : (
                        <Square size={18} className="text-muted-foreground/40" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead
                    className="sticky left-12 z-20 bg-muted/50 w-28 cursor-pointer select-none"
                    onClick={() => handleSort('alert')}
                  >
                    <div className="flex items-center gap-1.5">
                      Alert
                      {sortKey === 'alert' ? (
                        sortDir === 'asc'
                          ? <CaretUp size={12} className="text-primary" />
                          : <CaretDown size={12} className="text-primary" />
                      ) : (
                        <CaretUp size={12} className="opacity-30" />
                      )}
                    </div>
                  </TableHead>
                  {visibleColumnDefs.map(col => {
                    const isSortable = col.id === 'markName' || col.id === 'nextActionDate'
                    const isSorted = sortKey === col.id
                    return (
                      <TableHead
                        key={col.id}
                        className={`${isSortable ? 'cursor-pointer select-none' : ''} ${col.id === 'markName' ? 'sticky left-40 z-20 bg-muted/50' : ''} ${col.id === 'markName' || col.id === 'clientName' || col.id === 'jurisdiction' ? 'text-left' : col.id === 'actions' ? 'text-right' : 'text-center'}`}
                        onClick={isSortable ? () => handleSort(col.id as 'markName' | 'nextActionDate') : undefined}
                      >
                        <div className={`flex items-center gap-1.5 ${col.id === 'markName' || col.id === 'clientName' || col.id === 'jurisdiction' ? '' : 'justify-center'}`}>
                          {col.label}
                          {isSortable && (
                            isSorted
                              ? (sortDir === 'asc'
                                  ? <CaretUp size={12} className="text-primary" />
                                  : <CaretDown size={12} className="text-primary" />)
                              : <CaretUp size={12} className="opacity-30" />
                          )}
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map(t => (
                  <TableRow key={t.id} className="group">
                    <TableCell className="sticky left-0 z-10 bg-white px-4 py-3 group-hover:bg-muted/50">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(t.id) }}
                        className="flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        {selectedIds.has(t.id) ? (
                          <CheckSquare size={18} className="text-primary" />
                        ) : (
                          <Square size={18} className="text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="sticky left-12 z-10 bg-white px-4 py-3 group-hover:bg-muted/50">
                      <DeadlineAlertPill row={t} />
                    </TableCell>
                    {visibleColumnDefs.map(col => {
                      const isClickable = !['actions', 'markImage', 'colorIndication'].includes(col.id)
                      return (
                        <TableCell
                          key={col.id}
                          className={`${col.id === 'markName' ? 'sticky left-40 z-10 bg-white group-hover:bg-muted/50' : ''} ${isClickable ? 'cursor-pointer' : ''} ${col.id === 'clientName' ? 'truncate max-w-[200px]' : ''} ${col.id === 'markName' || col.id === 'clientName' || col.id === 'jurisdiction' ? 'text-left' : col.id === 'actions' ? 'text-right' : 'text-center'}`}
                          onClick={isClickable ? () => navigate(`/trademarks/${t.id}`) : undefined}
                        >
                          {col.id === 'markName' ? (
                            <div className="flex items-center gap-3">
                              <MarkInfoThumbnail markImage={t.mark_image || t.markImage} label={markLabel(t)} />
                              <span className="font-medium text-foreground group-hover:text-primary transition-colors">{markLabel(t)}</span>
                            </div>
                          ) : renderCell(t, col)}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-center gap-6 border-t border-muted/30 px-6 py-10 bg-muted/5">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><CaretLeft size={20} /></Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // Show first page, last page, and pages around current page
                    if (
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button 
                          key={page} 
                          variant={currentPage === page ? 'default' : 'ghost'} 
                          size="sm" 
                          className={`min-w-[40px] h-10 rounded-xl font-bold ${currentPage === page ? 'shadow-lg' : 'hover:bg-white hover:shadow-sm'}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 || 
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="px-2 text-muted-foreground/40 font-bold">•••</span>;
                    }
                    return null;
                  })}
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><CaretRight size={20} /></Button>
              </div>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} records
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
