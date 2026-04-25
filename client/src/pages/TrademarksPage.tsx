import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, MagnifyingGlass, DownloadSimple, CaretLeft, CaretRight, SquaresFour, List, ShieldCheck, File, CheckCircle, Clock, Eye, SealCheck, CaretDown, Globe, Trash, CheckSquare, Square } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { getMarkImageCandidates } from '@/utils/markImage'
import { useToast } from '@/components/ui/toast'
import { casesApi } from '@/api/cases'
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

  const [cases, setCases] = useState<Array<{ id: string; markName?: string; mark_name?: string; filingNumber?: string; filing_number?: string; filingDate?: string; filing_date?: string; client?: { name?: string; type?: string }; client_name?: string; client_type?: string; jurisdiction?: string; status?: string; created_at?: string; updated_at?: string; registration_dt?: string; registrationDt?: string; next_action_date?: string; nextActionDate?: string; priority?: string; markType?: string; colorIndication?: string; mark_image?: string; markImage?: string; registration_number?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [q, setQ] = useState('')
  const [jurisdiction, setJurisdiction] = useState<string | 'ALL'>('ALL')
  const [status, setStatus] = useState<string | 'ALL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const pageSize = 10

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  useEffect(() => { fetchCases() }, [q, status, jurisdiction, currentPage])

  const fetchCases = async () => {
    try {
      setLoading(true)
      const response = await casesApi.listPage({
        q,
        page: currentPage,
        pageSize,
        sort: 'created_at_desc',
        status: status === 'ALL' ? undefined : status,
        jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction,
        includeDeadlines: false
      })
      setCases(Array.isArray(response?.data) ? response.data : [])
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
    
    setIsDeleting(true)
    try {
      await casesApi.bulkDelete(Array.from(selectedIds))
      toast.success(`${selectedIds.size} trademark(s) moved to trash.`)
      setSelectedIds(new Set())
      setShowDeleteDialog(false)
      fetchCases()
    } catch (error) {
      console.error('Bulk delete failed:', error)
      toast.error('Failed to delete trademarks. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredRows = useMemo(() => cases, [cases])

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginatedRows = useMemo(() => filteredRows, [filteredRows])

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
      
      // Merge top-level case data into eipaForm to ensure PDF engine gets the latest DB values
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

  const handleExportExcel = async () => {
    setIsExporting(true)
    setExportProgress(0)
    try {
      const exportResponse = await casesApi.listPage({
        q,
        page: 1,
        pageSize: 1000,
        sort: 'created_at_desc',
        status: status === 'ALL' ? undefined : status,
        jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction,
        includeDeadlines: false
      })
      const exportRows = Array.isArray(exportResponse?.data) ? exportResponse.data : []
      if (!exportRows.length) return

      const ExcelJS = (await import('exceljs')).default
      
      const workbook = new ExcelJS.Workbook()
      ;(workbook.properties as any).defaultFont = 'Times New Roman'
      const worksheet = workbook.addWorksheet('Trademarks')

      // Define all detail columns
      // ... existing code, wait I'll keep the columns unchanged in this simple edit


    // Define all detail columns
    worksheet.columns = [
      { header: 'Mark Image', key: 'markImage', width: 22 },
      // Mark Info (Blue)
      { header: 'Mark Name', key: 'markName', width: 30 },
      { header: 'Mark Type', key: 'markType', width: 15 },
      { header: 'Filing Number', key: 'filingNumber', width: 20 },
      { header: 'Registration Number', key: 'regNumber', width: 20 },
      
      // Jurisdiction & Status (Green)
      { header: 'Jurisdiction', key: 'jurisdiction', width: 20 },
      { header: 'Current Status', key: 'status', width: 15 },
      { header: 'Filing Date', key: 'filingDate', width: 15 },
      { header: 'Registration Date', key: 'regDate', width: 15 },
      { header: 'Next Action Date', key: 'nextAction', width: 15 },
      
      // Client/Owner (Purple)
      { header: 'Client/Owner Name', key: 'client', width: 30 },
      { header: 'Client Type', key: 'clientType', width: 15 },
      
      // Colors & Priority (Orange)
      { header: 'Color Indication', key: 'colors', width: 25 },
      { header: 'Priority Info', key: 'priority', width: 25 },
      { header: 'System Created', key: 'createdAt', width: 20 }
    ]

    // Insert 2 rows at the top for the Master Header and Categorization titles
    worksheet.spliceRows(1, 0, [], [])

    const borderStyle = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }

    // --- ROW 1: MASTER TITLE ---
    worksheet.mergeCells('A1:O1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'EAST AFRICAN INTELLECTUAL PROPERTY PORTAL — TRADEMARKS MASTER LIST'
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F497D' } } // Dark Blue text
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } } // Light Blue bg
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
    titleCell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
    worksheet.getRow(1).height = 35

    // --- ROW 2: CATEGORY GROUP HEADERS ---
    worksheet.mergeCells('B2:E2') // columns 2 to 5
    worksheet.mergeCells('F2:J2') // columns 6 to 10
    worksheet.mergeCells('K2:L2') // columns 11 to 12
    worksheet.mergeCells('M2:O2') // columns 13 to 15

    worksheet.getCell('A2').value = '1. IMAGE'
    worksheet.getCell('B2').value = '2. MARK IDENTIFICATION'
    worksheet.getCell('F2').value = '3. REGISTRATION & STATUS'
    worksheet.getCell('K2').value = '4. CLIENT INFORMATION'
    worksheet.getCell('M2').value = '5. ADDITIONAL DETAILS'

    const catFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    const catAlign = { vertical: 'middle', horizontal: 'center' } as const

    const categories = [
      { cell: 'A2', color: 'FF4B5563' }, // Gray
      { cell: 'B2', color: 'FF5B9BD5' }, // Blue
      { cell: 'F2', color: 'FF70AD47' }, // Green
      { cell: 'K2', color: 'FF7030A0' }, // Purple
      { cell: 'M2', color: 'FFED7D31' }  // Orange
    ]

    for (const cat of categories) {
      const cell = worksheet.getCell(cat.cell)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cat.color } }
      cell.font = catFont
      cell.alignment = catAlign
      cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
    }
    worksheet.getRow(2).height = 30

    // --- ROW 3: COLUMN HEADERS ---
    const headerRow = worksheet.getRow(3)
    headerRow.height = 35
    headerRow.font = { bold: true, color: { argb: 'FF000000' }, size: 10 }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    
    // Light fills for Row 3 sub-headers to match their parent group colors
    headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } } // Gray tint
    for (let i = 2; i <= 5; i++) { // Mark Info (Light Blue tint)
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }
    }
    for (let i = 6; i <= 10; i++) { // Status (Light Green tint)
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }
    }
    for (let i = 11; i <= 12; i++) { // Client (Light Purple tint)
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4DFEC' } }
    }
    for (let i = 13; i <= 15; i++) { // Others (Light Orange tint)
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } }
    }

    // Apply borders for all Row 3 cells
    for(let i = 1; i <= 15; i++) {
        worksheet.getCell(3, i).border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
    }

    const totalRows = exportRows.length
    let processedRows = 0

    // Add data with images
    for (const c of exportRows) {
      const row = worksheet.addRow({
        markImage: c.mark_image || c.markImage ? 'Image' : 'No Image',
        markName: markLabel(c),
        markType: c.markType || 'Word',
        filingNumber: c.filing_number || c.filingNumber || 'PENDING',
        regNumber: c.registration_number || (c as any).registrationNumber || '—',
        jurisdiction: JURISDICTION_NAMES[c.jurisdiction || 'ET'] || c.jurisdiction || 'Ethiopia',
        status: STATUS_NAMES[c.status || 'DRAFT'] || c.status || 'Draft',
        filingDate: (c.filingDate || c.filing_date) ? new Date(c.filingDate || c.filing_date!).toISOString().split('T')[0] : '—',
        regDate: (c.registrationDt || c.registration_dt) ? new Date(c.registrationDt || c.registration_dt!).toISOString().split('T')[0] : '—',
        nextAction: (c.nextActionDate || c.next_action_date) ? new Date(c.nextActionDate || c.next_action_date!).toISOString().split('T')[0] : '—',
        client: c.client_name || c.client?.name || '—',
        clientType: c.client_type || c.client?.type || '—',
        colors: c.colorIndication || '—',
        priority: c.priority || '—',
        createdAt: c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '—'
      })

      row.height = 65

      // Add borders to all cells in the row
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      })

      // Center the mark image specifically
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' }

      // Fetch and embed image
      const rawImagePath = (c.mark_image || c.markImage || '').trim()
      if (rawImagePath) {
        const candidates = getMarkImageCandidates(rawImagePath)
        let imagePayload: { bytes: Uint8Array; extension: 'png' | 'jpeg' } | null = null

        for (const candidate of candidates) {
          imagePayload = await fetchImageForExcel(candidate)
          if (imagePayload) break
        }

        if (imagePayload) {
          const imageId = workbook.addImage({
            buffer: imagePayload.bytes as any,
            extension: imagePayload.extension,
          })

          row.getCell(1).value = ''
          worksheet.addImage(imageId, {
            tl: { col: 0.15, row: row.number - 0.9 },
            ext: { width: 55, height: 55 },
          })
        } else {
          row.getCell(1).value = 'Image Unavailable'
        }
      }
      processedRows++
      setExportProgress(Math.round((processedRows / totalRows) * 100))
    }

    // Header borders
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
    })

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `trademarks_export_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    addToast({ title: 'Export Complete', description: 'Detailed Excel file has been downloaded.' })
    } catch (err) {
      console.error('Export error:', err)
      addToast({ title: 'Export Failed', description: 'Could not generate Excel file', variant: 'destructive' })
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  return (
    <div className="w-full max-w-[100vw] mx-auto p-4 md:p-8 space-y-6 min-h-screen bg-[#E8E8ED]">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Typography.h1a>Trademarks</Typography.h1a>
          <Typography.muted className="hidden sm:block">Manage and track your trademark portfolio across East Africa.</Typography.muted>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash size={16} />
                <span>Delete {selectedIds.size}</span>
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={handleExportExcel} disabled={isExporting} className="bg-white">
            <DownloadSimple size={18} className="mr-1" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
          <Button onClick={() => navigate('/eipa-forms/application-form')}><Plus size={18} className="mr-1" /><span className="hidden sm:inline">New Application</span></Button>
        </div>
      </header>

      {isExporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-sm transition-all duration-300">
          <div className="bg-background rounded-xl p-8 shadow-2xl w-full max-w-[320px] flex flex-col items-center text-center space-y-6 border">
            <div className="bg-primary/10 p-3 rounded-full">
              <DownloadSimple size={36} className="text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <Typography.h4>Exporting Trademarks...</Typography.h4>
              <Typography.muted className="text-sm">Compressing images and generating your Excel file.</Typography.muted>
            </div>
            <div className="w-full space-y-2 pt-2">
              <div className="flex items-center justify-between px-1 text-sm font-extrabold text-muted-foreground">
                <span>Progress</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} className="h-2.5 w-full bg-primary/10" />
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectedIds.size} trademark(s) to the trash. You can restore them later from the Trash page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 w-full lg:max-w-md">
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 flex-1 sm:flex-none">
                  <span className="truncate">{JURISDICTION_NAMES[jurisdiction]}</span>
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
                <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="truncate">{STATUS_NAMES[status]}</span>
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
            <span className="text-sm text-muted-foreground w-full text-center sm:w-auto">{totalCount} records</span>
            <div className="flex items-center gap-1 border rounded-lg h-9 w-full sm:w-auto justify-center">
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
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl">
          <MagnifyingGlass size={48} className="text-muted-foreground opacity-30 mb-4" />
          <Typography.h3a>No records found</Typography.h3a>
          <Typography.muted>Try adjusting your search or filters.</Typography.muted>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedRows.map(t => (
            <Card key={t.id} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/trademarks/${t.id}`)}>
              <div className="flex items-start gap-3">
                <MarkInfoThumbnail markImage={t.mark_image || t.markImage} label={markLabel(t)} />
                <div className="flex-1 min-w-0">
                    <Typography.h4a className="truncate">{markLabel(t)}</Typography.h4a>
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
          <div className="overflow-x-auto max-w-full">
            <table className="w-full min-w-[600px] md:min-w-[800px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center"
                    >
                      {selectedIds.size === filteredRows.length && filteredRows.length > 0 ? (
                        <CheckSquare size={18} className="text-primary" weight="fill" />
                      ) : (
                        <Square size={18} className="text-muted-foreground" />
                      )}
                    </button>
                  </th>
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
                  <tr key={t.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(t.id) }}
                        className="flex items-center justify-center"
                      >
                        {selectedIds.has(t.id) ? (
                          <CheckSquare size={18} className="text-primary" weight="fill" />
                        ) : (
                          <Square size={18} className="text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/trademarks/${t.id}`)}>
                      <div className="flex items-center gap-3"><MarkInfoThumbnail markImage={t.mark_image || t.markImage} label={markLabel(t)} /><span className="font-medium truncate hover:underline">{markLabel(t)}</span></div>
                    </td>
                    <td className="px-4 py-3 text-center cursor-pointer truncate max-w-[150px]" onClick={() => navigate(`/trademarks/${t.id}`)}>{t.client_name || t.client?.name || '—'}</td>
                    <td className="px-4 py-3 text-center cursor-pointer" onClick={() => navigate(`/trademarks/${t.id}`)}><Badge variant="outline">{t.jurisdiction || 'ET'}</Badge></td>
                    <td className="px-4 py-3 text-center cursor-pointer" onClick={() => navigate(`/trademarks/${t.id}`)}><Badge className={STATUS_COLORS[t.status || 'DRAFT'] || 'bg-primary text-primary-foreground'}>{t.status || 'DRAFT'}</Badge></td>
                    <td className="px-4 py-3 text-center cursor-pointer" onClick={() => navigate(`/trademarks/${t.id}`)}><Badge>{t.filing_number || t.filingNumber || 'PENDING'}</Badge></td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDownloadForm(e, t) }}><DownloadSimple size={16} /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
              </span>
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
