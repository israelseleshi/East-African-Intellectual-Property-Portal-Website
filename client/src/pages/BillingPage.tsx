import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { invoiceService, clientService } from '../utils/api'
import { financialsApi } from '@/api/financials'
import { useSettingsStore } from '@/store/settingsStore'
import {
  CurrencyDollar,
  ChartLineUp,
  ArrowUpRight,
  WarningCircle,
  Clock,
  Download,
  Receipt,
  CheckCircle,
  Bank,
  Plus,
  Trash,
  CaretLeft,
  CaretRight,
  X,
  FileArrowDown,
  CreditCard,
  SquaresFour,
  List,
  CheckSquare,
  Square,
  ShareFat
} from '@phosphor-icons/react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
import { DateRangePicker } from '@/components/ui/date-range-picker'
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
import { Typography } from '@/components/ui/typography'
import { InvoiceSharePopover } from '@/components/InvoiceSharePopover'
import { useExcelExport } from '@/hooks/useExcelExport'
import ExportProgressModal from '@/components/ExportProgressModal'
import HelpButton from '@/components/HelpButton'

const EIPO_FEES = [
  { code: 'FILED', description: 'Application For Registration Of Trade Mark', amount: 1750 },
  { code: 'AMENDMENT_APPLICATION', description: 'Amendment Of Application For Registration Trademark', amount: 350 },
  { code: 'OPPOSITION', description: 'Opposition To Registration Of A Trademark', amount: 1500 },
  { code: 'REGISTRATION', description: 'Registration Of Trade Mark', amount: 3000 },
  { code: 'RENEWAL_APPLICATION', description: 'Application For Renewal Of Registration Of A Trademark', amount: 1300 },
  { code: 'RENEWAL', description: 'Renewal Of Registration Of Trade Mark', amount: 2200 },
  { code: 'AMENDMENT_REGISTRATION', description: 'Amendment Of Registration Of A Trademark', amount: 360 },
  { code: 'SUBSTITUTE_CERTIFICATE', description: 'Substitute Certificate Of Registration Of A Trademark', amount: 495 },
  { code: 'CANCELLATION', description: 'Application For The Cancellation Or Invalidation Of The Registration Of A Trademark', amount: 2600 },
  { code: 'TRANSFER', description: 'Registration Of Transfer Of Ownership Of A Trademark', amount: 1300 },
  { code: 'LICENSE', description: 'Registration Of License Contract Of A Trademark', amount: 1300 },
  { code: 'LICENSE_CANCELLATION', description: 'Registration Of Cancellation Of License Contract Of A Trademark', amount: 450 },
  { code: 'DIVISION', description: 'Division Of Application For Registration Of Trade Mark', amount: 350 },
  { code: 'MERGER', description: 'Merger Of Registration Or Application For Registration Of Trade Mark', amount: 350 },
  { code: 'AGENT_APPLICATION', description: 'Application For Registration Of A Trade Mark Agent', amount: 315 },
  { code: 'AGENT_ASSESSMENT', description: "Trade Mark Agent's Competence Assessment", amount: 270 },
  { code: 'AGENT_REGISTRATION', description: 'Registration Of A Trade Mark Agent', amount: 1350 },
  { code: 'AGENT_RENEWAL', description: 'Renewal Of Registration Of A Trade Mark Agent', amount: 1125 },
  { code: 'EXTENSION', description: 'Application For Extension Of A Time Limit', amount: 500 },
  { code: 'SEARCH', description: 'Search For Registered Trademarks', amount: 450 },
  { code: 'INSPECTION', description: 'Inspection Of Records And Documents Of The Office', amount: 150 },
  { code: 'COPIES', description: 'Copies Of Records And Documents Of The Office (Per Page)', amount: 10 },
  { code: 'FILING', description: 'Filing Fee', amount: 0 },
  { code: 'EXAMINATION', description: 'Examination Fee', amount: 0 },
  { code: 'PUBLICATION', description: 'Publication Fee', amount: 0 },
  { code: 'REGISTRATION_FEE', description: 'Registration Fee', amount: 0 },
  { code: 'LEGAL', description: 'Legal Service Fee', amount: 0 },
  { code: 'OTHER', description: 'Other Fee', amount: 0 }
]

export default function BillingPage() {
  const navigate = useNavigate()
  const { companyInfo } = useSettingsStore()

  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: ''
  })
  const [clients, setClients] = useState<any[]>([])
  const [trademarks, setTrademarks] = useState<string[]>([])
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [newInvoice, setNewInvoice] = useState({
    clientId: '',
    currency: 'USD',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  })
  const [lineItems, setLineItems] = useState([
    { description: '', category: 'OFFICIAL_FEE', amount: '' }
  ])
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstanding: 0,
    paidMtd: 0,
    clientCount: 0,
    overdueCount: 0
  })

  const [filters, setFilters] = useState<{
    dateFrom?: Date
    dateTo?: Date
    status: string
    client: string
    trademark: string
  }>({
    dateFrom: undefined,
    dateTo: undefined,
    status: '__all__',
    client: '__all__',
    trademark: '__all__'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const itemsPerPage = viewMode === 'grid' ? 6 : 5

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await invoiceService.getAll()
      
      const mappedTransactions = data.map((inv: any) => {
        const noteText = String(inv.notes || '')
        const stageMatch = noteText.match(/Auto-generated for\s+([A-Z_]+)/i)
        const stageCode = stageMatch?.[1]?.toUpperCase()
        const stageLabel = stageCode ? stageCode.replace(/_/g, ' ') : null

        return {
          id: inv.id,
          invoiceNumber: inv.invoice_number || '',
          markId: inv.trademark_id || inv.markId || '',
          markName: inv.mark_name || inv.markName || '',
          clientName: inv.client_name || 'Client',
          clientId: inv.client_id,
          type: stageLabel || inv.type || 'INVOICE',
          stageCode: stageCode || null,
          amount: Number(inv.total_amount || inv.amount),
          currency: inv.currency,
          status: inv.status,
          date: new Date(inv.issue_date || inv.date || new Date()).toLocaleDateString(),
          issueDate: inv.issue_date || null,
          dueDate: inv.due_date || null,
          notes: noteText,
          method: inv.payment_method || inv.method || 'Bank Transfer',
          items: inv.items || [],
          feeDescription: inv.fee_description || inv.description || ''
        }
      })
      
      setTransactions(mappedTransactions)

      if (data.length > 0) {
        const totalRevenue = data.reduce((acc: number, inv: any) => acc + Number(inv.total_amount || 0), 0)
        const outstanding = data
          .filter((inv: any) => inv.status !== 'PAID')
          .reduce((acc: number, inv: any) => acc + Number(inv.total_amount || 0), 0)
        const paidMtd = data
          .filter((inv: any) => {
            const issueDate = inv.issue_date ? new Date(inv.issue_date) : new Date()
            const now = new Date()
            return inv.status === 'PAID' && 
                   issueDate.getMonth() === now.getMonth() && 
                   issueDate.getFullYear() === now.getFullYear()
          })
          .reduce((acc: number, inv: any) => acc + Number(inv.total_amount || 0), 0)
        
        const uniqueClients = new Set(data.map((inv: any) => inv.client_name)).size
        const uniqueTrademarks = [...new Set(data.map((inv: any) => inv.mark_name).filter(Boolean))]
        const overdueCount = data.filter((inv: any) => inv.status === 'OVERDUE').length

        setStats({
          totalRevenue,
          outstanding,
          paidMtd,
          clientCount: uniqueClients,
          overdueCount
        })
        setTrademarks(uniqueTrademarks.sort())
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClients = useCallback(async () => {
    try {
      const result = await clientService.getClients({ page: 1, limit: 500 })
      const clientList = Array.isArray(result) ? result : (result?.data || [])
      setClients(clientList)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
      setClients([])
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchClients()
  }, [fetchTransactions])

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', category: 'OFFICIAL_FEE', amount: '' }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const updateLineItem = (index: number, field: string, value: string) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    
    if (field === 'category' && value) {
      const selectedFee = EIPO_FEES.find(fee => fee.code === value)
      if (selectedFee) {
        updated[index].description = selectedFee.description
        updated[index].amount = selectedFee.amount.toString()
      }
    }
    setLineItems(updated)
  }

  const handleCreateInvoice = async () => {
    if (!newInvoice.clientId) {
      toast.error('Please select a client');
      return;
    }

    const validItems = lineItems.filter(item => item.description && item.amount);
    if (validItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setCreatingInvoice(true);
    try {
      await financialsApi.createInvoice({
        clientId: newInvoice.clientId,
        items: validItems.map(item => ({
          description: item.description,
          category: item.category,
          amount: Number(item.amount)
        })),
        currency: newInvoice.currency,
        dueDate: newInvoice.dueDate,
        notes: newInvoice.notes
      });

      toast.success('Invoice created successfully');

      setIsCreateInvoiceModalOpen(false);
      setNewInvoice({
        clientId: '',
        currency: 'USD',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      });
      setLineItems([{ description: '', category: 'OFFICIAL_FEE', amount: '' }]);
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to create invoice.');
    } finally {
      setCreatingInvoice(false);
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentData.amount) return;

    try {
      await financialsApi.recordPayment({
        invoiceId: selectedInvoice.id,
        amount: Number(paymentData.amount),
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: paymentData.referenceNumber,
        notes: paymentData.notes
      });

      toast.success('Payment recorded successfully');

      setIsPaymentModalOpen(false);
      setPaymentData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: '',
        notes: ''
      });
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to record payment.');
    }
  }

  const totalInvoiceAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  }, [lineItems])

  const formatAmount = (val: number, txCurrency?: string) => {
    if (val == null || isNaN(val)) return '—'
    const currencyCode = txCurrency || 'USD'
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', ETB: 'ETB ', KES: 'KES ' }
    const symbol = symbols[currencyCode] || `${currencyCode} `
    return symbol + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = tx.issueDate || tx.date
      const txDateObj = txDate ? new Date(txDate) : null
      const fromOk = !filters.dateFrom || (txDateObj ? txDateObj >= filters.dateFrom : true)
      const toOk = !filters.dateTo || (txDateObj ? txDateObj <= new Date(filters.dateTo.getFullYear(), filters.dateTo.getMonth(), filters.dateTo.getDate(), 23, 59, 59) : true)
      const statusOk = filters.status === '__all__' || tx.status === filters.status
      const clientOk = filters.client === '__all__' || tx.clientId === filters.client
      const trademarkOk = filters.trademark === '__all__' || tx.markName === filters.trademark
      return fromOk && toOk && statusOk && clientOk && trademarkOk
    })
  }, [transactions, filters])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage))

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, viewMode])

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTransactions.slice(start, start + itemsPerPage)
  }, [filteredTransactions, currentPage, itemsPerPage])

  // Selection helpers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)))
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setIsDeleting(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => financialsApi.deleteInvoice(id))
      )
      toast.success(`${selectedIds.size} invoices moved to trash.`)
      setSelectedIds(new Set())
      setShowDeleteDialog(false)
      fetchTransactions()
    } catch (error) {
      console.error('Bulk delete failed:', error)
      toast.error('Failed to delete invoices.')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      dateFrom: undefined,
      dateTo: undefined,
      status: '__all__',
      client: '__all__',
      trademark: '__all__'
    })
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const handleDownload = async (tx: any) => {
    try {
      const { generateProfessionalInvoice } = await import('@/utils/generateProfessionalInvoice')
      
      const items = (tx.items || []).map((item: any) => ({
        name: item.description || item.category || 'Service',
        description: item.category || '',
        quantity: 1,
        price: Number(item.amount || 0),
        tax: 0
      }))

      // Add fee description if no items
      if (items.length === 0 && tx.feeDescription) {
        items.push({
          name: tx.feeDescription,
          description: '',
          quantity: 1,
          price: Number(tx.amount || 0),
          tax: 0
        })
      }

      const pdfBytesResult = await generateProfessionalInvoice({
        invoiceNumber: tx.invoiceNumber || tx.id,
        issueDate: tx.issueDate || tx.date || new Date().toISOString(),
        dueDate: tx.dueDate,
        clientName: tx.clientName || 'Client',
        items: items,
        currency: tx.currency || 'USD',
        notes: tx.notes,
        status: tx.status
      })

      const fileName = (tx.invoiceNumber || tx.id).replace(/[^a-z0-9]/gi, '_').toUpperCase();
      downloadBlob(new Blob([pdfBytesResult], { type: 'application/pdf' }), `INVOICE_${fileName}.pdf`)
    } catch (error) {
      console.error('Failed to generate professional invoice:', error)
      toast.error('Could not generate invoice PDF.');
    }
  }

  const { isExporting, exportProgress, startExport } = useExcelExport()

  const handleExportExcel = async () => {
    if (filteredTransactions.length === 0) return

    startExport({
      sheetName: 'Invoices',
      fileName: 'EAIP_Billing',
      columns: [
        { header: 'Invoice Number', key: 'number', width: 20 },
        { header: 'Client Name', key: 'client', width: 25 },
        { header: 'Trademark', key: 'mark', width: 25 },
        { header: 'Fee Type', key: 'type', width: 20 },
        { header: 'Issue Date', key: 'issueDate', width: 15 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Currency', key: 'currency', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Method', key: 'method', width: 15 },
      ],
      rows: filteredTransactions,
      mapRow: (tx) => ({
        number: tx.invoiceNumber || tx.id,
        client: tx.clientName,
        mark: tx.markName || '—',
        type: tx.type,
        issueDate: tx.issueDate ? new Date(tx.issueDate).toISOString().split('T')[0] : (tx.date.includes('/') ? tx.date.split('/').reverse().join('-') : tx.date),
        dueDate: tx.dueDate ? new Date(tx.dueDate).toISOString().split('T')[0] : '—',
        amount: Number(tx.amount || 0),
        currency: tx.currency,
        status: tx.status,
        method: tx.method || '—',
      }),
      formatHeader: (ws) => {
        const worksheet = ws as Record<string, unknown>
        const bdr = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }
        ;(worksheet as any).spliceRows(1, 0, [])
        ;(worksheet as any).mergeCells(1, 1, 1, 10)
        const titleCell = (worksheet as any).getCell(1, 1)
        titleCell.value = 'EAST AFRICAN INTELLECTUAL PROPERTY PORTAL — BILLING MASTER LIST'
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF1F497D' } }
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
        titleCell.border = { top: bdr, left: bdr, bottom: bdr, right: bdr }
        ;(worksheet as any).getRow(1).height = 35

        const headerRow = (worksheet as any).getRow(2)
        headerRow.height = 25
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        for (let i = 1; i <= 3; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
        for (let i = 4; i <= 6; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }
        for (let i = 7; i <= 9; i++) headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
        headerRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }
        ;(worksheet as any).views = [{ state: 'frozen', ySplit: 2 }]
        ;(worksheet as any).autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 10 } }
      },
      formatRow: (r, tx) => {
        const row = r as any
        const amountCell = row.getCell(7)
        amountCell.numFmt = tx.currency === 'ETB' ? '"ETB "#,##0.00' : '"$"#,##0.00;[Red]("$"#,##0.00)'
      },
    })
  }

  if (loading) {
    return (
      <div className="w-full p-4 md:p-10 space-y-8 bg-[#F8F9FA] text-foreground min-h-screen">
        <header className="flex items-center justify-between">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-48" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border-none shadow-premium rounded-2xl">
              <CardContent className="p-8 space-y-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-premium rounded-3xl">
          <CardContent className="p-10 space-y-6">
            <Skeleton className="h-8 w-64" />
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 bg-[#F8F9FA] text-foreground min-h-screen pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-10 pt-4 md:pt-10">
        <div className="space-y-2">
          <Typography.h1 className="tracking-tight font-bold">Billing & Financials</Typography.h1>
          <Typography.p className="text-muted-foreground text-lg font-medium opacity-80">Professional invoicing and regional fee management system.</Typography.p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HelpButton pageId="billing" />
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-2">
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                variant="destructive"
                className="flex items-center gap-2 h-12 px-6 rounded-xl shadow-sm hover:shadow-md transition-all font-bold"
              >
                <Trash size={20} weight="bold" />
                <span>Delete {selectedIds.size}</span>
              </Button>
            </div>
          )}
            <Button
            data-tour="export-button"
            onClick={handleExportExcel}
            variant="outline"
            className="bg-white hover:shadow-md transition-all h-12 px-6 rounded-xl border-none shadow-sm font-semibold"
          >
            <FileArrowDown size={20} className="mr-2" />
            <span>Export Excel</span>
          </Button>
          <Button
            data-tour="create-invoice-button"
            onClick={() => setIsCreateInvoiceModalOpen(true)}
            className="h-12 px-6 rounded-xl shadow-sm hover:shadow-md transition-all font-bold"
          >
            <Plus size={20} weight="bold" className="mr-2" />
            Generate New Invoice
          </Button>
        </div>
      </header>

      <div className="mx-4 md:px-10 space-y-10">
        {/* Stats Cards */}
        <div className="grid gap-8 md:grid-cols-3" data-tour="stats-cards">
          <Card className="overflow-hidden border-none shadow-2xl bg-gradient-to-br from-[#1A1A1A] to-[#404040] text-white rounded-3xl transform hover:scale-[1.02] transition-all duration-300">
            <CardContent className="p-8 relative">
              <div className="absolute -top-6 -right-6 p-4 opacity-5 rotate-12">
                <Receipt size={160} weight="duotone" />
              </div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner">
                  <CurrencyDollar size={28} weight="bold" className="text-primary" />
                </div>
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase">Overview</div>
              </div>
              <div className="text-sm font-bold text-white/50 tracking-wider uppercase mb-2 relative z-10">Total Revenue</div>
              <div className="text-4xl font-black tracking-tighter relative z-10">{formatAmount(stats.totalRevenue)}</div>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-white relative z-10">
                <ChartLineUp size={18} weight="bold" />
                <span className="tracking-wide">ALL TIME PERFORMANCE</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="overflow-hidden border-none shadow-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white rounded-3xl cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
            onClick={() => setFilters(prev => ({ 
              ...prev, 
              status: (prev.status === 'OVERDUE') ? '__all__' : 'OVERDUE' 
            }))}
          >
            <CardContent className="p-8 relative">
              <div className="absolute -top-6 -right-6 p-4 opacity-10 rotate-12">
                <WarningCircle size={160} weight="duotone" />
              </div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner">
                  <WarningCircle size={28} weight="bold" />
                </div>
                <div className={`px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold tracking-widest uppercase ${filters.status === 'OVERDUE' ? 'bg-white text-orange-600' : ''}`}>
                  {filters.status === 'OVERDUE' ? 'Filtered' : 'Priority'}
                </div>
              </div>
              <div className="text-sm font-bold text-white/60 tracking-wider uppercase mb-2 relative z-10">Outstanding</div>
              <div className="text-4xl font-black tracking-tighter relative z-10">{formatAmount(stats.outstanding)}</div>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold relative z-10">
                <Clock size={18} weight="bold" />
                <span className="tracking-wide">{stats.overdueCount} INVOICES OVERDUE</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="overflow-hidden border-none shadow-2xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white rounded-3xl cursor-pointer transform hover:scale-[1.02] transition-all duration-300"
            onClick={() => setFilters(prev => ({ 
              ...prev, 
              status: (prev.status === 'PAID') ? '__all__' : 'PAID' 
            }))}
          >
            <CardContent className="p-8 relative">
              <div className="absolute -top-6 -right-6 p-4 opacity-10 rotate-12">
                <CheckCircle size={160} weight="duotone" />
              </div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-inner">
                  <ArrowUpRight size={28} weight="bold" />
                </div>
                <div className={`px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold tracking-widest uppercase ${filters.status === 'PAID' ? 'bg-white text-emerald-600' : ''}`}>
                  Current Month
                </div>
              </div>
              <div className="text-sm font-bold text-white/60 tracking-wider uppercase mb-2 relative z-10">Paid (MTD)</div>
              <div className="text-4xl font-black tracking-tighter relative z-10">{formatAmount(stats.paidMtd)}</div>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold relative z-10">
                <span className="bg-white/20 px-3 py-1 rounded-full tracking-widest uppercase shadow-sm">Active Records</span>
                <span className="tracking-wide">{stats.clientCount} CLIENTS PAID</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border-none shadow-premium space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4">
              <CardTitle className="text-xl font-bold mr-4" data-tour="invoice-list">Transaction Ledger</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {filters.status !== '__all__' && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold text-xs uppercase cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, status: '__all__' }))}>
                    Status: {filters.status} <X size={14} weight="bold" />
                  </Badge>
                )}
                {filters.client !== '__all__' && (
                  <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold text-xs uppercase cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, client: '__all__' }))}>
                    Client: {clients.find(c => c.id === filters.client)?.name || 'Filtered'} <X size={14} weight="bold" />
                  </Badge>
                )}
                {filters.trademark !== '__all__' && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold text-xs uppercase cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, trademark: '__all__' }))}>
                    Record: {filters.trademark} <X size={14} weight="bold" />
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center bg-[#F8F9FA] p-1.5 rounded-xl border-none shadow-inner self-end xl:self-auto">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-premium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Table View"
              >
                <List size={22} weight={viewMode === 'table' ? 'fill' : 'regular'} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-premium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Grid View"
              >
                <SquaresFour size={22} weight={viewMode === 'grid' ? 'fill' : 'regular'} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <DateRangePicker data-tour="date-range-filter"
              fromDate={filters.dateFrom}
              toDate={filters.dateTo}
              onDateChange={(from, to) => setFilters(prev => ({ ...prev, dateFrom: from, dateTo: to }))}
              placeholder="Filter by date range"
              className="bg-[#F8F9FA] border-none h-12 rounded-xl text-sm font-medium"
            />
            
            <Select value={filters.client} onValueChange={(val) => setFilters(prev => ({ ...prev, client: val }))}>
              <SelectTrigger className="h-12 bg-[#F8F9FA] border-none rounded-xl font-medium focus:ring-primary/20">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="__all__">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.trademark} onValueChange={(val) => setFilters(prev => ({ ...prev, trademark: val }))}>
              <SelectTrigger className="h-12 bg-[#F8F9FA] border-none rounded-xl font-medium focus:ring-primary/20">
                <SelectValue placeholder="All Trademarks" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="__all__">All Trademarks</SelectItem>
                {trademarks.map((tm) => (
                  <SelectItem key={tm} value={tm}>{tm}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select data-tour="status-filter" value={filters.status} onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))}>
              <SelectTrigger className="h-12 bg-[#F8F9FA] border-none rounded-xl font-medium focus:ring-primary/20">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-none shadow-xl">
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="PAID">Fully Paid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partial Payment</SelectItem>
                <SelectItem value="OVERDUE">Overdue Invoices</SelectItem>
                <SelectItem value="DRAFT">Draft Mode</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="h-12 bg-white border-none shadow-sm hover:shadow-md transition-all rounded-xl font-bold flex items-center gap-2" onClick={resetFilters}>
              <X size={18} weight="bold" /> Reset
            </Button>
          </div>
        </div>

        <div className="mt-8">
          {filteredTransactions.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-32 text-center border-none shadow-premium rounded-3xl bg-white">
              <div className="p-6 rounded-full bg-primary/5 mb-6">
                <Receipt size={64} weight="duotone" className="text-primary/40" />
              </div>
              <Typography.h3 className="mb-2 font-bold">No transactions found</Typography.h3>
              <Typography.p className="max-w-md mx-auto text-muted-foreground text-lg">
                Your financial ledger will appear here once invoices are generated or recorded.
              </Typography.p>
              <Button onClick={() => setIsCreateInvoiceModalOpen(true)} className="mt-8 h-12 px-8 rounded-xl shadow-lg">
                <Plus className="mr-2" size={20} weight="bold" /> Create First Invoice
              </Button>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedTransactions.map((tx) => {
                const isSelected = selectedIds.has(tx.id)
                return (
                  <Card 
                    key={tx.id} 
                    className={`group relative flex flex-col cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 rounded-3xl overflow-hidden border-none ${isSelected ? 'ring-2 ring-primary bg-primary/5 shadow-xl' : 'bg-white shadow-premium'}`}
                    onClick={() => navigate(`/billing/${tx.id}`)}
                  >
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                      <div className="opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100" onClick={e => e.stopPropagation()}>
                        <InvoiceSharePopover row={tx} />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(tx.id); }}
                        className={`p-1.5 rounded-xl bg-white/90 backdrop-blur-sm transition-all shadow-sm ${isSelected ? 'opacity-100 text-primary scale-110' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:scale-110'}`}
                      >
                        {isSelected ? <CheckSquare size={24} weight="fill" /> : <Square size={24} />}
                      </button>
                    </div>

                    <CardContent className="p-8 pt-10">
                      <div className="flex items-start gap-4 mb-6">
                        <div className={`p-4 rounded-2xl transition-all duration-300 ${tx.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : tx.status === 'OVERDUE' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'} group-hover:shadow-md`}>
                          <Receipt size={28} weight="duotone" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h3 className="text-lg font-bold truncate group-hover:text-primary transition-colors">{tx.invoiceNumber || tx.id}</h3>
                          <p className="text-sm font-medium text-muted-foreground">{tx.clientName}</p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-[#F8F9FA]">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-muted-foreground">Trademark Record</span>
                          <span className="font-bold text-[#1A1A1A] truncate max-w-[150px]">{tx.markName || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-muted-foreground">Issue Date</span>
                          <span className="font-bold text-[#1A1A1A]">{tx.date}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                          <span className="text-xl font-black text-primary tracking-tighter">{formatAmount(tx.amount, tx.currency)}</span>
                        </div>
                        <div className="pt-2 flex justify-between items-center">
                          <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Current Status</span>
                          <Badge 
                            variant="secondary"
                            className={`font-bold tracking-wider uppercase text-[10px] px-3 py-1 rounded-full border-none shadow-sm ${
                              tx.status === 'PAID' ? 'bg-emerald-500 text-white' : 
                              tx.status === 'OVERDUE' ? 'bg-orange-500 text-white' : 
                              'bg-blue-500 text-white'
                            }`}
                          >
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="overflow-hidden border-none shadow-premium rounded-3xl bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[11px] uppercase tracking-widest bg-[#F8F9FA] text-muted-foreground font-bold border-none">
                    <tr>
                      <th className="px-8 py-5 w-16">
                        <button onClick={toggleSelectAll} className="hover:text-primary transition-colors">
                          {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 ? (
                            <CheckSquare size={22} weight="fill" className="text-primary" />
                          ) : (
                            <Square size={22} />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-5">Client & Case</th>
                      <th className="px-6 py-5">Financial Details</th>
                      <th className="px-6 py-5">Date & Timeline</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8F9FA]">
                    {paginatedTransactions.map((tx) => {
                      const isSelected = selectedIds.has(tx.id)
                      return (
                        <tr
                          key={tx.id}
                          className={`group cursor-pointer transition-all hover:bg-[#F8F9FA] ${isSelected ? 'bg-primary/5' : 'bg-white'}`}
                          onClick={() => navigate(`/billing/${tx.id}`)}
                        >
                          <td className="px-8 py-6" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelect(tx.id)} className="text-muted-foreground hover:text-primary transition-colors">
                              {isSelected ? <CheckSquare size={22} weight="fill" className="text-primary" /> : <Square size={22} />}
                            </button>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-base text-[#1A1A1A] group-hover:text-primary transition-colors">{tx.clientName || 'Private Client'}</span>
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{tx.markName || 'NO TRADEMARK LINKED'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col gap-1">
                              <span className="font-black text-lg text-primary tracking-tighter">{formatAmount(tx.amount, tx.currency)}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tx.invoiceNumber || 'Manual Entry'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-sm text-[#4A4A4A]">{tx.date}</span>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tx.type}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <Badge 
                              variant="secondary"
                              className={`font-bold tracking-wider uppercase text-[10px] px-3 py-1 rounded-full border-none shadow-sm ${
                                tx.status === 'PAID' ? 'bg-emerald-500 text-white' : 
                                tx.status === 'PARTIALLY_PAID' ? 'bg-blue-400 text-white' :
                                tx.status === 'OVERDUE' ? 'bg-orange-500 text-white' : 
                                'bg-slate-400 text-white'
                              }`}
                            >
                              {tx.status === 'PARTIALLY_PAID' ? 'Partial' : tx.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-6" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {tx.status !== 'PAID' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedInvoice(tx)
                                    setPaymentData(prev => ({ ...prev, amount: tx.amount.toString() }))
                                    setIsPaymentModalOpen(true)
                                  }}
                                  title="Record Payment"
                                >
                                  <CheckCircle size={22} weight="bold" />
                                </Button>
                              )}
                              <InvoiceSharePopover row={tx} />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 rounded-xl text-primary hover:bg-primary/5 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownload(tx)
                                }}
                                title="Download PDF"
                              >
                                <Download size={22} weight="bold" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )})}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          
          {filteredTransactions.length > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between mt-10 gap-6">
              <p className="text-sm font-semibold text-muted-foreground order-2 md:order-1">
                Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of <span className="text-foreground">{filteredTransactions.length}</span> invoices
              </p>
              <div className="flex items-center gap-2 order-1 md:order-2">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-11 px-4 rounded-xl hover:bg-white hover:shadow-premium transition-all font-bold disabled:opacity-30"
                >
                  <CaretLeft size={20} weight="bold" className="mr-2" />
                  Previous
                </Button>
                <div className="flex items-center gap-1.5 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'ghost'}
                      onClick={() => setCurrentPage(page)}
                      className={`h-11 w-11 p-0 rounded-xl font-bold transition-all ${currentPage === page ? 'shadow-lg shadow-primary/20 scale-110' : 'hover:bg-white hover:shadow-premium'}`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-11 px-4 rounded-xl hover:bg-white hover:shadow-premium transition-all font-bold disabled:opacity-30"
                >
                  Next
                  <CaretRight size={20} weight="bold" className="ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Payment Recording Modal */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden bg-white/95 backdrop-blur-xl">
            <DialogHeader className="p-10 border-b border-border/50 bg-emerald-50/30">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                  <Bank size={32} weight="duotone" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight uppercase">Deposit Protocol</DialogTitle>
                  <DialogDescription className="font-medium text-emerald-600/80">RECORD SYSTEMIC SETTLEMENT</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Settlement Amount</Label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black text-2xl group-focus-within:scale-110 transition-transform">$</span>
                  <Input 
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    className="pl-12 h-16 bg-[#F8F9FA] border-none rounded-2xl text-2xl font-black focus-visible:ring-4 focus-visible:ring-primary/5 transition-all shadow-inner"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Execution Date</Label>
                  <DatePicker 
                    date={paymentData.paymentDate ? new Date(paymentData.paymentDate) : undefined}
                    onDateChange={(date) => setPaymentData({...paymentData, paymentDate: date ? date.toISOString().split('T')[0] : ''})}
                    placeholder="Select date"
                    className="h-14 bg-[#F8F9FA] border-none rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Channel</Label>
                  <Select 
                    value={paymentData.paymentMethod}
                    onValueChange={(val) => setPaymentData({...paymentData, paymentMethod: val})}
                  >
                    <SelectTrigger className="h-14 bg-[#F8F9FA] border-none rounded-xl font-bold shadow-inner"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="BANK_TRANSFER" className="font-bold">Bank Transfer</SelectItem>
                      <SelectItem value="CASH" className="font-bold">Cash Payment</SelectItem>
                      <SelectItem value="CHECK" className="font-bold">Certified Check</SelectItem>
                      <SelectItem value="MOBILE_MONEY" className="font-bold">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Reference Vector</Label>
                <Input 
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({...paymentData, referenceNumber: e.target.value})}
                  placeholder="Receipt # or Bank Confirmation"
                  className="h-14 bg-[#F8F9FA] border-none rounded-xl font-bold shadow-inner"
                />
              </div>

              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 ml-1">Systemic Notes</Label>
                <Textarea 
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  className="bg-[#F8F9FA] border-none rounded-2xl min-h-[120px] resize-none p-5 font-medium shadow-inner"
                  placeholder="Input additional transaction metadata..."
                />
              </div>
            </div>

            <DialogFooter className="p-10 border-t border-border/50 bg-muted/20 gap-3">
              <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)} className="h-14 rounded-2xl font-bold px-8">Discard</Button>
              <Button onClick={handleRecordPayment} className="h-14 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all">Execute Settlement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Invoice Modal */}
        <Dialog open={isCreateInvoiceModalOpen} onOpenChange={setIsCreateInvoiceModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-none shadow-2xl rounded-[3rem] p-0 bg-white/95 backdrop-blur-xl scrollbar-hide">
            <DialogHeader className="p-12 border-b border-border/50 bg-primary/5">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-[2rem] bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                  <FileArrowDown size={36} weight="duotone" />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black tracking-tighter uppercase">Invoicing Protocol</DialogTitle>
                  <DialogDescription className="text-lg font-medium text-primary/60">GENERATE SYSTEMIC BILLING ARTIFACT</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="p-12 space-y-12">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Entity Selection *</Label>
                  <Select 
                    value={newInvoice.clientId}
                    onValueChange={(val) => setNewInvoice({...newInvoice, clientId: val})}
                  >
                    <SelectTrigger className="h-16 bg-[#F8F9FA] border-none rounded-[1.5rem] font-black text-lg px-8 shadow-inner focus:ring-4 focus:ring-primary/5 transition-all"><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent className="rounded-[1.5rem] border-none shadow-2xl p-2">
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id} className="py-4 rounded-xl font-bold">{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Currency Matrix</Label>
                  <Select 
                    value={newInvoice.currency}
                    onValueChange={(val) => setNewInvoice({...newInvoice, currency: val})}
                  >
                    <SelectTrigger className="h-16 bg-[#F8F9FA] border-none rounded-[1.5rem] font-black text-lg px-8 shadow-inner focus:ring-4 focus:ring-primary/5 transition-all"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-[1.5rem] border-none shadow-2xl p-2">
                      <SelectItem value="USD" className="py-4 rounded-xl font-bold">USD - US Dollars</SelectItem>
                      <SelectItem value="ETB" className="py-4 rounded-xl font-bold">ETB - Ethiopian Birr</SelectItem>
                      <SelectItem value="KES" className="py-4 rounded-xl font-bold">KES - Kenyan Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Settlement Deadline</Label>
                  <DatePicker 
                    date={newInvoice.dueDate ? new Date(newInvoice.dueDate) : undefined}
                    onDateChange={(date) => setNewInvoice({...newInvoice, dueDate: date ? date.toISOString().split('T')[0] : ''})}
                    placeholder="Select due date"
                    allowFuture={true}
                    className="h-16 bg-[#F8F9FA] border-none rounded-[1.5rem] px-8 font-bold shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Aggregate Total</Label>
                  <div className="h-16 px-8 flex items-center bg-primary text-white rounded-[1.5rem] font-black text-3xl tracking-tighter shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                    <span className="opacity-60 mr-3 text-sm font-bold tracking-widest">{newInvoice.currency === 'ETB' ? 'ETB' : newInvoice.currency === 'KES' ? 'KES' : '$'}</span>
                    {totalInvoiceAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between ml-1">
                  <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">Component Breakdown *</Label>
                  <Button variant="ghost" size="sm" onClick={addLineItem} className="font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl px-6 h-10 border border-primary/10">
                    <Plus size={16} weight="bold" className="mr-2" /> Add Component
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {lineItems.map((item, index) => (
                    <div key={index} className="group relative flex gap-6 items-start p-8 bg-[#F8F9FA] rounded-[2.5rem] transition-all hover:bg-white hover:shadow-premium border border-transparent hover:border-primary/10 shadow-inner">
                      <div className="flex-1 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 ml-1">Fee Category</Label>
                            <Select 
                              value={item.category}
                              onValueChange={(val) => updateLineItem(index, 'category', val)}
                            >
                              <SelectTrigger className="bg-white border-none rounded-xl h-14 font-bold shadow-sm px-6"><SelectValue placeholder="Select a fee..." /></SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-2xl max-h-[300px] p-2">
                                {EIPO_FEES.map((fee) => (
                                  <SelectItem key={fee.code} value={fee.code} className="text-xs font-bold py-3 rounded-lg">
                                    {fee.description}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 ml-1">Unit Valuation</Label>
                            <Input 
                              type="number"
                              placeholder="0.00"
                              value={item.amount}
                              onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                              className="bg-white border-none rounded-xl h-14 font-black text-xl text-primary shadow-sm px-6"
                            />
                          </div>
                        </div>
                        <Input 
                          placeholder="Detailed specifications of systemic service..."
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="bg-white border-none rounded-xl h-14 font-bold text-muted-foreground placeholder:opacity-30 shadow-sm px-6"
                        />
                      </div>
                      {lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="mt-8 text-destructive/20 hover:text-destructive hover:bg-destructive/5 rounded-2xl h-14 w-14 transition-all"
                        >
                          <Trash size={24} weight="bold" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Internal Log Entry</Label>
                <Textarea 
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                  placeholder="Record systemic context or internal billing instructions..."
                  className="bg-[#F8F9FA] border-none rounded-[2rem] min-h-[140px] resize-none p-8 font-medium shadow-inner"
                />
              </div>
            </div>

            <DialogFooter className="p-12 border-t border-border/50 bg-muted/20 gap-4">
              <Button variant="ghost" onClick={() => setIsCreateInvoiceModalOpen(false)} className="h-16 px-10 rounded-2xl font-bold text-lg">Discard</Button>
              <Button onClick={handleCreateInvoice} disabled={creatingInvoice} className="h-16 px-12 rounded-2xl font-black text-xl shadow-2xl shadow-primary/30 bg-primary text-white hover:bg-primary/90 transition-all hover:scale-105">
                {creatingInvoice ? 'Processing...' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
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
                    SYSTEMIC INVOICE DECOMMISSIONING
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            <div className="p-10">
              <p className="text-base font-medium text-muted-foreground leading-relaxed">
                You are about to move <span className="text-foreground font-black underline decoration-destructive/30 decoration-2 underline-offset-4">{selectedIds.size} invoice(s)</span> to the trash repository. This action will suspend systemic billing tracking for these entities.
              </p>
            </div>
            <AlertDialogFooter className="p-10 border-t border-border/50 bg-muted/20 gap-3">
              <AlertDialogCancel disabled={isDeleting} className="h-14 px-8 rounded-2xl font-bold border-none bg-white hover:bg-muted/50 shadow-sm transition-all">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBulkDelete} 
                disabled={isDeleting} 
                className="h-14 px-10 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-destructive text-white hover:bg-destructive/90 shadow-xl shadow-destructive/20 transition-all"
              >
                {isDeleting ? 'Processing...' : 'Confirm Purge'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ExportProgressModal
          isExporting={isExporting}
          progress={exportProgress}
          message="Exporting Billing..."
          subtext="Generating your invoice report."
        />
      </div>
    </div>
  )
}
