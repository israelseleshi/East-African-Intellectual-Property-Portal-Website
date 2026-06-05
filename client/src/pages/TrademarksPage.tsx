import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, MagnifyingGlass, DownloadSimple, CaretLeft, CaretRight, CaretUp, CaretDown, SquaresFour, List, ShieldCheck, File, CheckCircle, Clock, Eye, SealCheck, Globe, Trash, CheckSquare, Square, Table } from '@phosphor-icons/react'
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
import { useExcelExport } from '@/hooks/useExcelExport'
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
  loadColumnPreferences,
  saveColumnPreferences,
  getColumnById,
  ALL_COLUMNS,
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

  const candidates = useMemo(() => {
    return getMarkImageCandidates(markImage)
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
  })
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

    startExport({
      sheetName: 'Trademarks',
      fileName: 'EAIP_Trademarks',
      columns: [
        { header: 'Mark Image', key: 'markImage', width: 22 },
        { header: 'Mark Name', key: 'markName', width: 30 },
        { header: 'Mark Type', key: 'markType', width: 15 },
        { header: 'Filing Number', key: 'filingNumber', width: 20 },
        { header: 'Registration Number', key: 'regNumber', width: 20 },
        { header: 'Jurisdiction', key: 'jurisdiction', width: 20 },
        { header: 'Current Status', key: 'status', width: 15 },
        { header: 'Filing Date', key: 'filingDate', width: 15 },
        { header: 'Registration Date', key: 'regDate', width: 15 },
        { header: 'Next Action Date', key: 'nextAction', width: 15 },
        { header: 'Client/Owner Name', key: 'client', width: 30 },
        { header: 'Client Type', key: 'clientType', width: 15 },
        { header: 'Color Indication', key: 'colors', width: 25 },
        { header: 'Priority Info', key: 'priority', width: 25 },
        { header: 'System Created', key: 'createdAt', width: 20 },
      ],
      rows: exportRows,
      mapRow: (c) => ({
        markImage: c.mark_image || c.markImage ? 'Image' : 'No Image',
        markName: markLabel(c),
        markType: c.markType || 'Word',
        filingNumber: c.filing_number || c.filingNumber || 'PENDING',
        regNumber: c.registration_number || (c as CaseRow).registrationNumber || '—',
        jurisdiction: JURISDICTION_NAMES[c.jurisdiction || 'ET'] || c.jurisdiction || 'Ethiopia',
        status: STATUS_NAMES[c.status || 'DRAFT'] || c.status || 'Draft',
        filingDate: (c.filingDate || c.filing_date) ? new Date(c.filingDate || c.filing_date!).toISOString().split('T')[0] : '—',
        regDate: (c.registrationDt || c.registration_dt) ? new Date(c.registrationDt || c.registration_dt!).toISOString().split('T')[0] : '—',
        nextAction: (c.nextActionDate || c.next_action_date) ? new Date(c.nextActionDate || c.next_action_date!).toISOString().split('T')[0] : '—',
        client: c.client_name || c.client?.name || '—',
        clientType: c.client_type || c.client?.type || '—',
        colors: c.colorIndication || '—',
        priority: c.priority || '—',
        createdAt: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '—',
      }),
      formatHeader: (ws: unknown) => {
        const worksheet = ws as Record<string, unknown>
        const colCount = (worksheet.columns as unknown[]).length
        ;(worksheet as any).spliceRows(1, 0, [], [])

        const borderStyle = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }

        ;(worksheet as any).mergeCells(1, 1, 1, colCount)
        const titleCell = (worksheet as any).getCell(1, 1)
        titleCell.value = 'EAST AFRICAN INTELLECTUAL PROPERTY PORTAL — TRADEMARKS MASTER LIST'
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F497D' } }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        titleCell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        ;(worksheet as any).getRow(1).height = 35

        ;(worksheet as any).mergeCells(2, 2, 2, 5)
        ;(worksheet as any).mergeCells(2, 6, 2, 10)
        ;(worksheet as any).mergeCells(2, 11, 2, 12)
        ;(worksheet as any).mergeCells(2, 13, 2, 15)

        const catFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        const catAlign = { vertical: 'middle', horizontal: 'center' }
        const catData = [
          { r: 2, c: 1, text: '1. IMAGE', color: 'FF4B5563' },
          { r: 2, c: 2, text: '2. MARK IDENTIFICATION', color: 'FF5B9BD5' },
          { r: 2, c: 6, text: '3. REGISTRATION & STATUS', color: 'FF70AD47' },
          { r: 2, c: 11, text: '4. CLIENT INFORMATION', color: 'FF7030A0' },
          { r: 2, c: 13, text: '5. ADDITIONAL DETAILS', color: 'FFED7D31' },
        ]
        for (const cat of catData) {
          const cell = (worksheet as any).getCell(cat.r, cat.c)
          cell.value = cat.text
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cat.color } }
          cell.font = catFont
          cell.alignment = catAlign
          cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        }
        ;(worksheet as any).getRow(2).height = 30

        const headerRow = (worksheet as any).getRow(3)
        headerRow.height = 35
        headerRow.font = { bold: true, color: { argb: 'FF000000' }, size: 10 }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } }
        for (let i = 2; i <= 5; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
        for (let i = 6; i <= 10; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }
        for (let i = 11; i <= 12; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4DFEC' } }
        for (let i = 13; i <= colCount; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } }
        for (let i = 1; i <= colCount; i++) {
          headerRow.getCell(i).border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        }

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
          ;(excelRow as any).getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }

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
              ;(excelRow as any).getCell(1).value = ''
              ws.addImage(imageId, {
                tl: { col: 0.15, row: (excelRow as any).number - 0.9 },
                ext: { width: 55, height: 55 },
              })
            } else {
              ;(excelRow as any).getCell(1).value = 'Image Unavailable'
            }
          }
        } catch {
          ;(row as any).getCell(1).value = 'Image Unavailable'
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
                <Trash size={20} weight="bold" />
                <span className="font-bold">Delete {selectedIds.size}</span>
              </Button>
            </div>
          )}
          <Button data-tour="columns-button" variant="outline" onClick={() => setShowColumnModal(true)} className="bg-white hover:shadow-md transition-all h-12 px-5 rounded-xl border-none shadow-sm font-semibold" title="Customize columns">
            <Table size={20} className="mr-2" />
            <span className="hidden sm:inline">Columns</span>
          </Button>
          <Button data-tour="export-button" variant="outline" onClick={handleExportExcel} disabled={isExporting} className="bg-white hover:shadow-md transition-all h-12 px-5 rounded-xl border-none shadow-sm font-semibold">
            <DownloadSimple size={20} className="mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
          <Button data-tour="new-application-button" onClick={() => navigate('/eipa-forms/application-form')} className="h-12 px-6 rounded-xl shadow-sm hover:shadow-md transition-all font-bold">
            <Plus size={20} weight="bold" className="mr-2" />
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
                <Trash size={32} weight="duotone" />
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
              <Button data-tour="view-toggle" variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className={`h-10 w-10 rounded-lg transition-all ${viewMode === 'table' ? 'shadow-md' : 'hover:bg-white/50'}`} onClick={() => setViewMode('table')}><List size={20} weight="bold" /></Button>
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className={`h-10 w-10 rounded-lg transition-all ${viewMode === 'grid' ? 'shadow-md' : 'hover:bg-white/50'}`} onClick={() => setViewMode('grid')}><SquaresFour size={20} weight="bold" /></Button>
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
          <MagnifyingGlass size={64} className="text-muted-foreground/20 mb-6" weight="duotone" />
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
        <Card className="overflow-hidden border-none shadow-sm bg-white rounded-3xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[600px] md:min-w-[800px] text-black border-collapse">
              <thead>
                <tr className="border-b border-muted/30 bg-muted/10 sticky top-0 z-30">
                  <th className="sticky left-0 z-40 bg-white px-6 py-5 text-left text-sm font-bold tracking-wide text-black w-12 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      {selectedIds.size === filteredRows.length && filteredRows.length > 0 ? (
                        <CheckSquare size={20} className="text-primary" weight="fill" />
                      ) : (
                        <Square size={20} className="text-muted-foreground/40" />
                      )}
                    </button>
                  </th>
                  <th
                    className="sticky left-12 z-40 bg-white px-4 py-5 text-left text-sm font-bold tracking-wide text-black w-28 cursor-pointer select-none hover:text-primary transition-colors shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"
                    onClick={() => handleSort('alert')}
                  >
                    <div className="flex items-center gap-1.5">
                      Alert
                      {sortKey === 'alert' ? (
                        sortDir === 'asc'
                          ? <CaretUp size={12} weight="bold" className="text-primary" />
                          : <CaretDown size={12} weight="bold" className="text-primary" />
                      ) : (
                        <CaretUp size={12} weight="bold" className="opacity-30" />
                      )}
                    </div>
                  </th>
                  {visibleColumnDefs.map(col => {
                    const isSortable = col.id === 'markName' || col.id === 'nextActionDate'
                    const isSorted = sortKey === col.id
                    const isSticky = col.id === 'markName'
                    return (
                      <th
                        key={col.id}
                        className={`px-6 py-5 text-sm font-bold tracking-wide text-black ${
                          col.id === 'markName' || col.id === 'clientName' || col.id === 'jurisdiction'
                            ? 'text-left'
                            : col.id === 'actions'
                            ? 'text-right'
                            : 'text-center'
                         } ${isSortable ? 'cursor-pointer select-none hover:text-primary transition-colors' : ''} ${isSticky ? 'sticky left-40 z-20 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]' : ''}`}
                        onClick={isSortable ? () => handleSort(col.id as 'markName' | 'nextActionDate') : undefined}
                      >
                        <div className={`flex items-center gap-1.5 ${col.id === 'markName' || col.id === 'clientName' || col.id === 'jurisdiction' ? '' : 'justify-center'}`}>
                          {col.label}
                          {isSortable && (
                            isSorted
                              ? (sortDir === 'asc'
                                  ? <CaretUp size={12} weight="bold" className="text-primary" />
                                  : <CaretDown size={12} weight="bold" className="text-primary" />)
                              : <CaretUp size={12} weight="bold" className="opacity-30" />
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/20">
                {paginatedRows.map(t => (
                  <tr key={t.id} className="hover:bg-primary/[0.02] transition-colors group">
                    <td className="sticky left-0 z-10 bg-white px-6 py-5 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-primary/[0.02]">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(t.id) }}
                        className="flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        {selectedIds.has(t.id) ? (
                          <CheckSquare size={20} className="text-primary" weight="fill" />
                        ) : (
                          <Square size={20} className="text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                        )}
                      </button>
                    </td>
                    <td className="sticky left-12 z-10 bg-white px-4 py-5 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-primary/[0.02]">
                      <DeadlineAlertPill row={t} />
                    </td>
                    {visibleColumnDefs.map(col => {
                      const isClickable = !['actions', 'markImage', 'colorIndication'].includes(col.id)
                      const isSticky = col.id === 'markName'
                      return (
                        <td
                          key={col.id}
                          className={`px-6 py-5 text-black ${
                            col.id === 'markName' || col.id === 'clientName' || col.id === 'jurisdiction'
                              ? 'text-left'
                              : col.id === 'actions'
                              ? 'text-right'
                              : 'text-center'
                          } ${isClickable ? 'cursor-pointer' : ''} ${col.id === 'clientName' ? 'truncate max-w-[200px]' : ''} ${isSticky ? 'sticky left-40 z-10 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] group-hover:bg-primary/[0.02]' : ''}`}
                          onClick={isClickable ? () => navigate(`/trademarks/${t.id}`) : undefined}
                        >
                          {col.id === 'markName' ? (
                            <div className="flex items-center gap-4">
                              <MarkInfoThumbnail markImage={t.mark_image || t.markImage} label={markLabel(t)} />
                              <span className="font-bold text-primary group-hover:text-accent transition-colors tracking-tight text-base">{markLabel(t)}</span>
                            </div>
                          ) : renderCell(t, col)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex flex-col items-center justify-center gap-6 border-t border-muted/30 px-6 py-10 bg-muted/5">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><CaretLeft size={20} weight="bold" /></Button>
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
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><CaretRight size={20} weight="bold" /></Button>
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
