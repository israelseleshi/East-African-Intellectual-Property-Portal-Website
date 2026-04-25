import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { invoiceService, clientService } from '../utils/api'
import { financialsApi } from '@/api/financials'
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
  MagnifyingGlass,
  FileArrowDown,
  CreditCard,
  SquaresFour,
  List,
  CheckSquare,
  Square
} from '@phosphor-icons/react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DatePicker } from '@/components/ui/date-picker'
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

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '__all__',
    client: '__all__'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const itemsPerPage = viewMode === 'grid' ? 6 : 10

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
        const overdueCount = data.filter((inv: any) => inv.status === 'OVERDUE').length

        setStats({
          totalRevenue,
          outstanding,
          paidMtd,
          clientCount: uniqueClients,
          overdueCount
        })
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
  }, [fetchTransactions])

  useEffect(() => {
    if (isCreateInvoiceModalOpen) {
      fetchClients()
    }
  }, [isCreateInvoiceModalOpen, fetchClients])

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
      const fromOk = !filters.dateFrom || (txDateObj ? txDateObj >= new Date(filters.dateFrom) : true)
      const toOk = !filters.dateTo || (txDateObj ? txDateObj <= new Date(`${filters.dateTo}T23:59:59`) : true)
      const statusOk = filters.status === '__all__' || tx.status === filters.status
      const clientOk = filters.client === '__all__' || tx.clientName.toLowerCase().includes(filters.client.toLowerCase())
      return fromOk && toOk && statusOk && clientOk
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
      dateFrom: '',
      dateTo: '',
      status: '__all__',
      client: '__all__'
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
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595.28, 841.89])
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

      const marginLeft = 50
      const marginRight = 545
      let y = 800

      try {
        const logoUrl = '/eaip-logo.png'
        const logoImageBytes = await fetch(logoUrl).then(res => res.arrayBuffer())
        const logoImage = await pdfDoc.embedPng(logoImageBytes)
        const logoDims = logoImage.scale(0.125)
        page.drawImage(logoImage, {
          x: (595.28 - logoDims.width) / 2,
          y: y - logoDims.height,
          width: logoDims.width,
          height: logoDims.height,
        })
        y -= (logoDims.height + 15)
      } catch (e) {
        console.warn('Could not load logo for PDF', e)
        y -= 40
      }

      const companyInfo = [
        'EAST AFRICAN INTELLECTUAL PROPERTY',
        'Addis Ababa, Ethiopia',
        'Email: info@eastafricanip.com | Web: www.eastafricanip.com'
      ]
      companyInfo.forEach((line, i) => {
        const fontSize = i === 0 ? 14 : 9
        const font = i === 0 ? boldFont : regularFont
        const textWidth = font.widthOfTextAtSize(line, fontSize)
        page.drawText(line, {
          x: (595.28 - textWidth) / 2,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1)
        })
        y -= (fontSize + 5)
      })

      y -= 30
      page.drawLine({
        start: { x: marginLeft, y },
        end: { x: marginRight, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8)
      })
      y -= 40

      page.drawText('INVOICE', {
        x: marginLeft,
        y,
        size: 24,
        font: boldFont,
        color: rgb(0.08, 0.16, 0.32)
      })
      
      const invoiceNo = `No: ${tx.invoiceNumber || tx.id}`
      const invNoWidth = boldFont.widthOfTextAtSize(invoiceNo, 12)
      page.drawText(invoiceNo, {
        x: marginRight - invNoWidth,
        y: y + 5,
        size: 12,
        font: boldFont
      })
      y -= 50

      const drawSectionTitle = (title: string, yPos: number) => {
        page.drawText(title.toUpperCase(), {
          x: marginLeft,
          y: yPos,
          size: 10,
          font: boldFont,
          color: rgb(0.4, 0.4, 0.4)
        })
        return yPos - 20
      }

      y = drawSectionTitle('Client & Trademark Details', y)
      
      const trademarkDisplay = (tx.notes && tx.notes.includes('Auto-generated for')) 
        ? (tx.markName !== tx.clientName ? tx.markName : 'New Trademark') 
        : (tx.markName || 'Trademark');

      const detailRows: Array<[string, string]> = [
        ['Client Name', tx.clientName || 'Client'],
        ['Trademark', trademarkDisplay]
      ]
      detailRows.forEach(([label, value]) => {
        page.drawText(label, { x: marginLeft, y, size: 10, font: boldFont })
        page.drawText(value, { x: marginLeft + 120, y, size: 10, font: regularFont })
        y -= 18
      })

      y -= 20
      y = drawSectionTitle('Billing Schedule', y)
      const billingRows: Array<[string, string]> = [
        ['Issue Date', tx.issueDate ? new Date(tx.issueDate).toLocaleDateString() : tx.date],
        ['Due Date', tx.dueDate ? new Date(tx.dueDate).toLocaleDateString() : '—'],
        ['Payment Method', tx.method || 'Bank Transfer']
      ]
      billingRows.forEach(([label, value]) => {
        page.drawText(label, { x: marginLeft, y, size: 10, font: boldFont })
        page.drawText(value, { x: marginLeft + 120, y, size: 10, font: regularFont })
        y -= 18
      })

      y -= 30
      
      const hasItems = tx.items && tx.items.length > 0
      const hasFeeDesc = tx.feeDescription || (tx.notes && tx.notes.includes('Auto-generated for'))
      
      if (hasItems || hasFeeDesc) {
        y = drawSectionTitle('Fee Details', y)
        
        if (hasItems) {
          page.drawRectangle({
            x: marginLeft,
            y: y - 5,
            width: marginRight - marginLeft,
            height: 20,
            color: rgb(0.96, 0.97, 0.98)
          })
          page.drawText('#', { x: marginLeft + 5, y, size: 9, font: boldFont })
          page.drawText('Description', { x: marginLeft + 30, y, size: 9, font: boldFont })
          page.drawText('Amount', { x: marginRight - 80, y, size: 9, font: boldFont })
          y -= 22
          
          tx.items.forEach((item: any, index: number) => {
            const desc = item.description || item.category || 'Fee'
            page.drawText(String(index + 1), { x: marginLeft + 5, y, size: 9, font: regularFont })
            page.drawText(desc, { x: marginLeft + 30, y, size: 9, font: regularFont })
            const itemAmount = `${tx.currency || 'ETB'} ${Number(item.amount || 0).toLocaleString()}`
            page.drawText(itemAmount, { x: marginRight - 80, y, size: 9, font: regularFont })
            y -= 16
          })
        } else if (tx.feeDescription) {
          page.drawText(tx.feeDescription, { x: marginLeft, y, size: 10, font: regularFont })
          y -= 20
        }
        
        y -= 15
      }

      page.drawRectangle({
        x: marginLeft,
        y: y - 10,
        width: marginRight - marginLeft,
        height: 40,
        color: rgb(0.96, 0.97, 0.98)
      })
      
      page.drawText('TOTAL AMOUNT DUE', {
        x: marginLeft + 15,
        y: y + 5,
        size: 12,
        font: boldFont,
        color: rgb(0.08, 0.16, 0.32)
      })

      const amountText = `${tx.currency || 'ETB'} ${Number(tx.amount || 0).toLocaleString()}`
      const amountWidth = boldFont.widthOfTextAtSize(amountText, 16)
      page.drawText(amountText, {
        x: marginRight - amountWidth - 15,
        y: y + 3,
        size: 16,
        font: boldFont,
        color: rgb(0.08, 0.16, 0.32)
      })
      
      y -= 60
      y -= 40
      page.drawLine({
        start: { x: marginRight - 180, y },
        end: { x: marginRight, y },
        thickness: 1,
        color: rgb(0.1, 0.1, 0.1)
      })
      y -= 12
      page.drawText('Authorized Signature', {
        x: marginRight - 145,
        y,
        size: 10,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1)
      })

      const pdfBytes = await pdfDoc.save()
      const stableBytes = new Uint8Array(pdfBytes.length)
      stableBytes.set(pdfBytes)
      const filenameSafe = (tx.invoiceNumber || tx.id || 'invoice').replace(/[^a-z0-9-_]/gi, '_')
      downloadBlob(new Blob([stableBytes], { type: 'application/pdf' }), `${filenameSafe}.pdf`)

      toast.success(`PDF generated for ${tx.markName || 'invoice'}.`);
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error)
      toast.error('Could not generate invoice PDF.');
    }
  }

  const handleExportExcel = async () => {
    if (filteredTransactions.length === 0) return;
    const ExcelJS = (await import('exceljs')).default
    
    const workbook = new ExcelJS.Workbook()
    ;(workbook.properties as any).defaultFont = 'Times New Roman'
    const worksheet = workbook.addWorksheet('Invoices')

    // Professional borders and fonts
    const borderStyle = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } }

    worksheet.columns = [
      { header: 'Invoice Number', key: 'number', width: 20 },
      { header: 'Client Name', key: 'client', width: 25 },
      { header: 'Trademark', key: 'mark', width: 25 },
      { header: 'Fee Type', key: 'type', width: 20 },
      { header: 'Issue Date', key: 'issueDate', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Method', key: 'method', width: 15 }
    ]

    const headerRow = worksheet.getRow(1)
    headerRow.height = 25
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    
    // Group 1: Invoice/Client (Blue)
    for (let i = 1; i <= 3; i++) {
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    }
    // Group 2: Fee Info (Orange)
    for (let i = 4; i <= 6; i++) {
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }
    }
    // Group 3: Financials (Green)
    for (let i = 7; i <= 9; i++) {
      headerRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } }
    }
    // Group 4: Payment (Gray)
    headerRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }

    filteredTransactions.forEach(tx => {
      const row = worksheet.addRow({
        number: tx.invoiceNumber || tx.id,
        client: tx.clientName,
        mark: tx.markName || '—',
        type: tx.type,
        issueDate: tx.issueDate ? new Date(tx.issueDate).toISOString().split('T')[0] : (tx.date.includes('/') ? tx.date.split('/').reverse().join('-') : tx.date),
        dueDate: tx.dueDate ? new Date(tx.dueDate).toISOString().split('T')[0] : '—',
        amount: Number(tx.amount || 0),
        currency: tx.currency,
        status: tx.status,
        method: tx.method || '—'
      })

      // Styling Amount column as Currency
      const amountCell = row.getCell(7)
      amountCell.numFmt = '"$"#,##0.00;[Red]("$"#,##0.00)'
      if (tx.currency === 'ETB') amountCell.numFmt = '"ETB "#,##0.00'

      // Apply borders to row cells
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      })
    })

    // Header borders
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle }
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `billing_export_${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Professional Excel file with bordered data and currency formatting downloaded.');
  }

  if (loading) {
    return (
      <div className="w-full p-4 md:p-8 space-y-8 bg-[#E8E8ED] text-foreground min-h-screen">
        <header className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 bg-[#E8E8ED] text-foreground min-h-screen">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-8 pt-4 md:pt-8">
        <div className="space-y-2">
          <Typography.h1a>Billing & Ledger</Typography.h1a>
          <Typography.muted>Professional invoicing and financial fee management.</Typography.muted>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <Button
            onClick={handleExportExcel}
            variant="outline"
            className="flex items-center gap-2 bg-white"
          >
            <FileArrowDown size={16} />
            <span>Export Excel</span>
          </Button>
          <Button
            onClick={() => setIsCreateInvoiceModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} weight="bold" />
            Create Invoice
          </Button>
        </div>
      </header>

      <div className="mx-4 md:mx-8 pb-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary to-blue-800 text-white">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Receipt size={100} weight="duotone" />
              </div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <CurrencyDollar size={24} weight="bold" />
                </div>
                <CreditCard size={24} weight="fill" className="opacity-50" />
              </div>
              <div className="text-sm text-white/70 relative z-10">Total Revenue</div>
              <div className="text-3xl font-bold leading-none mt-1 relative z-10">{formatAmount(stats.totalRevenue)}</div>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium relative z-10">
                <ChartLineUp size={16} />
                <span>All time revenue</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setFilters(prev => ({ 
              ...prev, 
              status: (prev.status === 'OVERDUE') ? '__all__' : 'OVERDUE' 
            }))}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <WarningCircle size={24} weight="bold" />
                </div>
              </div>
              <div className="text-sm text-white/70">Outstanding</div>
              <div className="text-3xl font-bold leading-none mt-1">{formatAmount(stats.outstanding)}</div>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                <Clock size={16} />
                <span>{stats.overdueCount} overdue</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setFilters(prev => ({ 
              ...prev, 
              status: (prev.status === 'PAID') ? '__all__' : 'PAID' 
            }))}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <ArrowUpRight size={24} weight="bold" />
                </div>
                <ChartLineUp size={24} weight="fill" className="opacity-50" />
              </div>
              <div className="text-sm text-white/70">Paid (MTD)</div>
              <div className="text-3xl font-bold leading-none mt-1">{formatAmount(stats.paidMtd)}</div>
              <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">Active</span>
                <span>Across {stats.clientCount} clients</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Transaction History</CardTitle>
                {filters.status !== '__all__' && (
                  <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" onClick={() => setFilters(prev => ({ ...prev, status: '__all__' }))}>
                    Filter: {filters.status} <X size={12} className="ml-1" />
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search..."
                    className="pl-9 w-[200px] bg-[#E8E8ED]"
                    value={filters.client === '__all__' ? '' : filters.client}
                    onChange={(e) => setFilters(prev => ({ ...prev, client: e.target.value || '__all__' }))}
                  />
                </div>
                <Select value={filters.status} onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger className="w-[140px] bg-[#E8E8ED]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Status</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  <X size={14} /> Clear
                </Button>
                <div className="flex items-center bg-muted/50 p-1 rounded-lg border ml-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-[#E8E8ED] shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-[#E8E8ED]/50'}`}
                    title="Table View"
                  >
                    <List size={18} weight={viewMode === 'table' ? 'fill' : 'regular'} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#E8E8ED] shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-[#E8E8ED]/50'}`}
                    title="Grid View"
                  >
                    <SquaresFour size={18} weight={viewMode === 'grid' ? 'fill' : 'regular'} />
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
                <div className="h-16 w-16 bg-muted flex items-center justify-center rounded-2xl">
                  <Receipt size={32} className="text-muted-foreground opacity-50" />
                </div>
                <div>
                  <Typography.h3a>No transactions found</Typography.h3a>
                <Typography.muted>Your ledger will appear here once invoices are generated.</Typography.muted>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {paginatedTransactions.map((tx) => {
                  const isSelected = selectedIds.has(tx.id)
                  return (
                    <Card 
                      key={tx.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border bg-card'}`}
                      onClick={() => navigate(`/billing/${tx.id}`)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(tx.id); }}
                        className={`absolute top-3 right-3 z-10 p-1 rounded-md bg-[#E8E8ED]/80 backdrop-blur-sm transition-opacity ${isSelected ? 'opacity-100 text-primary' : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground'}`}
                      >
                        {isSelected ? <CheckSquare size={22} weight="fill" /> : <Square size={22} />}
                      </button>
                      <CardContent className="p-4 pt-6">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-lg ${tx.status === 'PAID' ? 'bg-green-100 text-green-700' : tx.status === 'OVERDUE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            <Receipt size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{tx.invoiceNumber || tx.id}</h3>
                            <p className="text-sm text-muted-foreground">{tx.clientName}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Trademark</span>
                            <span className="font-medium truncate ml-2">{tx.markName || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-bold">{formatAmount(tx.amount, tx.currency)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <Badge 
                              variant={tx.status === 'PAID' ? 'default' : tx.status === 'OVERDUE' ? 'destructive' : 'outline'}
                              className={tx.status === 'PAID' ? 'bg-green-500' : ''}
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 w-12">
                        <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground">
                          {selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0 ? (
                            <CheckSquare size={18} weight="fill" className="text-primary" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                      <th className="px-6 py-3 font-semibold">Client</th>
                      <th className="px-6 py-3 font-semibold">Trademark</th>
                      <th className="px-6 py-3 font-semibold">Type</th>
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-6 py-3 font-semibold">Amount</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedTransactions.map((tx) => {
                      const isSelected = selectedIds.has(tx.id)
                      return (
                        <tr
                          key={tx.id}
                          className={`group hover:bg-muted/50 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                          onClick={() => navigate(`/billing/${tx.id}`)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleSelect(tx.id)} className="text-muted-foreground hover:text-foreground">
                              {isSelected ? <CheckSquare size={18} weight="fill" className="text-primary" /> : <Square size={18} />}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{tx.clientName || 'Client'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium">{tx.markName || '—'}</div>
                          </td>
                          <td className="px-6 py-4 font-medium">{tx.type}</td>
                          <td className="px-6 py-4 text-muted-foreground">{tx.date}</td>
                          <td className="px-6 py-4 font-bold">{formatAmount(tx.amount, tx.currency)}</td>
                          <td className="px-6 py-4">
                            <Badge 
                            variant={
                              tx.status === 'PAID' ? 'default' : 
                              tx.status === 'PARTIALLY_PAID' ? 'secondary' :
                              tx.status === 'OVERDUE' ? 'destructive' : 'outline'
                            }
                            className={`font-medium ${
                              tx.status === 'PAID' ? 'bg-green-500 hover:bg-green-600' :
                              tx.status === 'PARTIALLY_PAID' ? 'bg-blue-500 hover:bg-blue-600' :
                              tx.status === 'OVERDUE' ? 'bg-red-500 hover:bg-red-600' :
                              'bg-gray-500 hover:bg-gray-600'
                            }`}
                          >
                            {tx.status === 'PARTIALLY_PAID' ? 'Partially Paid' : tx.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {tx.status !== 'PAID' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedInvoice(tx)
                                  setPaymentData(prev => ({ ...prev, amount: tx.amount.toString() }))
                                  setIsPaymentModalOpen(true)
                                }}
                                title="Record Payment"
                              >
                                <CheckCircle size={16} />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(tx)
                              }}
                              title="Download PDF"
                            >
                              <Download size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
            
            {filteredTransactions.length > 0 && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of{' '}
                  <span className="font-medium">{filteredTransactions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <CaretLeft size={16} />
                  </Button>
                  <span className="text-sm px-2">
                    Page <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span>
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <CaretRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Recording Modal */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bank size={20} className="text-primary" />
                Record Payment
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Amount Received</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                  <Input 
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <DatePicker 
                    date={paymentData.paymentDate ? new Date(paymentData.paymentDate) : undefined}
                    onDateChange={(date) => setPaymentData({...paymentData, paymentDate: date ? date.toISOString().split('T')[0] : ''})}
                    placeholder="Select payment date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select 
                    value={paymentData.paymentMethod}
                    onValueChange={(val) => setPaymentData({...paymentData, paymentMethod: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHECK">Check</SelectItem>
                      <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input 
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({...paymentData, referenceNumber: e.target.value})}
                  placeholder="Receipt # or Bank Ref"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment}>Post Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Invoice Modal */}
        <Dialog open={isCreateInvoiceModalOpen} onOpenChange={setIsCreateInvoiceModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileArrowDown size={20} className="text-primary" />
                Create New Invoice
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select 
                    value={newInvoice.clientId}
                    onValueChange={(val) => setNewInvoice({...newInvoice, clientId: val})}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select 
                    value={newInvoice.currency}
                    onValueChange={(val) => setNewInvoice({...newInvoice, currency: val})}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollars</SelectItem>
                      <SelectItem value="ETB">ETB - Ethiopian Birr</SelectItem>
                      <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <DatePicker 
                    date={newInvoice.dueDate ? new Date(newInvoice.dueDate) : undefined}
                    onDateChange={(date) => setNewInvoice({...newInvoice, dueDate: date ? date.toISOString().split('T')[0] : ''})}
                    placeholder="Select due date"
                    allowFuture={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <div className="h-10 px-3 flex items-center bg-muted rounded-md border font-bold">
                    {newInvoice.currency === 'ETB' ? 'ETB' : newInvoice.currency === 'KES' ? 'KES' : '$'}
                    {totalInvoiceAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Line Items *</Label>
                  <Button variant="ghost" size="sm" onClick={addLineItem}>
                    <Plus size={14} /> Add Item
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start p-4 bg-muted/30 rounded-lg border">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Fee Type</Label>
                            <Select 
                              value={item.category}
                              onValueChange={(val) => updateLineItem(index, 'category', val)}
                            >
                              <SelectTrigger><SelectValue placeholder="Select a fee..." /></SelectTrigger>
                              <SelectContent>
                                {EIPO_FEES.map((fee) => (
                                  <SelectItem key={fee.code} value={fee.code}>
                                    {fee.description} ({fee.amount.toLocaleString()} ETB)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Amount</Label>
                            <Input 
                              type="number"
                              placeholder="0.00"
                              value={item.amount}
                              onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                            />
                          </div>
                        </div>
                        <Input 
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        />
                      </div>
                      {lineItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="text-destructive"
                        >
                          <Trash size={16} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea 
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                  placeholder="Internal notes..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateInvoiceModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateInvoice} disabled={creatingInvoice}>
                {creatingInvoice ? 'Creating...' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} invoice(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move {selectedIds.size} invoice(s) to the trash. You can restore them later from the Trash page.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
