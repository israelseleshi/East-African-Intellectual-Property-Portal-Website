import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoiceService, clientService } from '../utils/api'
import { financialsApi } from '@/api/financials'
import { useToast } from '../components/ui/toast'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  CreditCard,
  CurrencyDollar,
  ChartLineUp,
  ArrowUpRight,
  WarningCircle,
  Clock,
  Funnel,
  Download,
  Receipt,
  CheckCircle,
  Bank,
  Plus,
  Trash,
  CaretLeft,
  CaretRight,
  X
} from '@phosphor-icons/react'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const EIPO_FEES = [
  { code: 'FILED', description: 'Application For Registration Of Trade Mark', amount: 1750 },
  { code: 'AMENDMENT_APPLICATION', description: 'Amendment Of Application For Registration Trademark', amount: 350 },
  { code: 'OPPOSITION', description: 'Opposition To Registration Of A Trademark', amount: 1500 },
  { code: 'REGISTRATION', description: 'Registration Of Trade Mark', amount: 3000 },
  { code: 'RENEWAL_APPLICATION', description: 'Application For Renewal Of Registration Of A Trademark', amount: 1300 },
  { code: 'RENEWAL', description: 'Renewal Of Registration Of A Trademark', amount: 2200 },
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
  const { addToast } = useToast()

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
  
  const [stats, setStats] = useState<{
    totalRevenue: number
    outstanding: number
    paidMtd: number
    clientCount: number
    overdueCount: number
  }>({
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
  const itemsPerPage = 5

  const fetchClients = async () => {
    try {
      const result = await clientService.getClients({ page: 1, limit: 500 })
      const clientList = Array.isArray(result) ? result : (result?.data || [])
      setClients(clientList)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
      setClients([])
    }
  }

  useEffect(() => {
    if (isCreateInvoiceModalOpen) {
      fetchClients()
    }
  }, [isCreateInvoiceModalOpen])

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', category: '', amount: '' }])
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
        updated[index].category = 'OFFICIAL_FEE'
      }
    }
    
    setLineItems(updated)
  }

  const handleCreateInvoice = async () => {
    if (!newInvoice.clientId) {
      addToast({ title: 'Error', description: 'Please select a client.', type: 'error' })
      return
    }
    
    const validItems = lineItems.filter(item => item.description && item.amount)
    if (validItems.length === 0) {
      addToast({ title: 'Error', description: 'Please add at least one line item.', type: 'error' })
      return
    }

    setCreatingInvoice(true)
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
      })

      addToast({
        title: 'Invoice Created',
        description: 'The invoice has been created successfully.',
        type: 'success'
      })

      setIsCreateInvoiceModalOpen(false)
      setNewInvoice({
        clientId: '',
        currency: 'USD',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: ''
      })
      setLineItems([{ description: '', category: 'OFFICIAL_FEE', amount: '' }])
      fetchTransactions()
    } catch (error) {
      addToast({ title: 'Error', description: 'Failed to create invoice.', type: 'error' })
    } finally {
      setCreatingInvoice(false)
    }
  }

  const totalInvoiceAmount = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)

  

  const fetchTransactions = async () => {
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
        markName: inv.mark_name || inv.markName || inv.client_name,
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
      }})
      
      setTransactions(mappedTransactions)

      if (data.length > 0) {
        const totalRevenue = data.reduce((acc: number, inv: any) => acc + Number(inv.total_amount), 0)
        const outstanding = data
          .filter((inv: any) => inv.status !== 'PAID')
          .reduce((acc: number, inv: any) => acc + Number(inv.total_amount), 0)
        const paidMtd = data
          .filter((inv: any) => {
            const issueDate = inv.issue_date ? new Date(inv.issue_date) : new Date()
            const now = new Date()
            return inv.status === 'PAID' && 
                   issueDate.getMonth() === now.getMonth() && 
                   issueDate.getFullYear() === now.getFullYear()
          })
          .reduce((acc: number, inv: any) => acc + Number(inv.total_amount), 0)
        
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
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return

    try {
      await financialsApi.recordPayment({
        invoiceId: selectedInvoice.id,
        ...paymentData,
        amount: Number(paymentData.amount)
      })

      addToast({
        title: 'Payment Recorded',
        description: 'The payment has been successfully logged.',
        type: 'success'
      })

      setIsPaymentModalOpen(false)
      fetchTransactions()
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to record payment.',
        type: 'error'
      })
    }
  }

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
      const clientOk = filters.client === '__all__' || tx.clientName === filters.client
      return fromOk && toOk && statusOk && clientOk
    })
  }, [transactions, filters])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage))

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredTransactions.slice(start, start + itemsPerPage)
  }, [filteredTransactions, currentPage])

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
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595.28, 841.89]) // A4
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

      const marginLeft = 50
      const marginRight = 545
      let y = 800

      // 1. Logo & Header
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

      // Company Info (Centered)
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

      // 2. Invoice Title & Basic Info
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

      // 3. Categorized Sections
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

      // Section A: Client & Trademark Details
      y = drawSectionTitle('Client & Trademark Details', y)
      
      // Determine the correct trademark display name
      // Use mark description if it exists and is different from client name, otherwise markName
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
      // Section B: Billing Schedule
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
      
      // 4. Line Items Table
      const hasItems = tx.items && tx.items.length > 0
      const hasFeeDesc = tx.feeDescription || (tx.notes && tx.notes.includes('Auto-generated for'))
      
      if (hasItems || hasFeeDesc) {
        y = drawSectionTitle('Fee Details', y)
        
        if (hasItems) {
          // Table header
          page.drawRectangle({
            x: marginLeft,
            y: y - 5,
            width: marginRight - marginLeft,
            height: 20,
            color: rgb(0.96, 0.97, 0.98)
          })
          page.drawText('#', { x: marginLeft + 5, y: y, size: 9, font: boldFont })
          page.drawText('Description', { x: marginLeft + 30, y: y, size: 9, font: boldFont })
          page.drawText('Amount', { x: marginRight - 80, y: y, size: 9, font: boldFont })
          y -= 22
          
          // Table rows
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

      // 5. Financial Summary Table
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

      // 5. Signature Section
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

      addToast({
        title: 'Invoice Downloaded',
        description: `PDF generated for ${tx.markName || 'invoice'}.`,
        type: 'success'
      })
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error)
      addToast({
        title: 'Download Failed',
        description: 'Could not generate invoice PDF.',
        type: 'error'
      })
    }
  }

  return (
    <div className="w-full">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 text-[var(--eai-text)]">Billing & Ledger</h1>
            <p className="text-body text-[var(--eai-text-secondary)] font-medium">Professional invoicing and financial fee management.</p>
          </div>
          <button
            onClick={() => setIsCreateInvoiceModalOpen(true)}
            className="apple-button-primary rounded-xl flex items-center gap-2"
          >
            <Plus size={18} weight="bold" />
            Create Invoice
          </button>
        </div>
      </header>

      {/* Apple Wallet Style Cards */}
      <div className="grid gap-6 md:grid-cols-3 mt-8" id="billing-stats-grid">
        <div className="apple-card p-6 bg-gradient-to-br from-[var(--eai-primary)] to-[#004B7C] text-white border-none shadow-xl shadow-[var(--eai-primary)]/20 overflow-hidden relative group" id="stat-revenue">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Receipt size={120} weight="duotone" />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <CurrencyDollar size={24} weight="bold" />
            </div>
            <CreditCard size={24} weight="fill" className="opacity-50" />
          </div>
          <div className="text-label text-white/70 relative z-10">Total Revenue</div>
          <div className="text-h1 text-white leading-none mt-1 relative z-10">{formatAmount(stats.totalRevenue)}</div>
          <div className="mt-6 flex items-center gap-1.5 text-micro font-black relative z-10">
            <ChartLineUp size={16} weight="bold" />
            <span>Reflecting all generated invoices</span>
          </div>
        </div>

        <div className="apple-card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white border-none shadow-xl shadow-red-500/20 overflow-hidden relative group" id="stat-outstanding">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <WarningCircle size={24} weight="bold" />
            </div>
          </div>
          <div className="text-label text-white/70 relative z-10">Outstanding</div>
          <div className="text-h1 text-white leading-none mt-1 relative z-10">{formatAmount(stats.outstanding)}</div>
          <div className="mt-6 flex items-center gap-1.5 text-micro font-black relative z-10">
            <Clock size={16} weight="bold" />
            <span>{stats.overdueCount} Overdue invoices</span>
          </div>
        </div>

        <div className="apple-card p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-xl shadow-emerald-500/20 overflow-hidden relative group" id="stat-paid">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <ArrowUpRight size={24} weight="bold" />
            </div>
            <ChartLineUp size={24} weight="fill" className="opacity-50" />
          </div>
          <div className="text-label text-white/70 relative z-10">Paid (MTD)</div>
          <div className="text-h1 text-white leading-none mt-1 relative z-10">{formatAmount(stats.paidMtd)}</div>
          <div className="mt-6 flex items-center gap-1.5 text-micro font-black relative z-10">
            <span className="bg-white/20 px-2 py-0.5 rounded-full">Active</span>
            <span>Across {stats.clientCount} clients</span>
          </div>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="apple-card overflow-hidden mt-8" id="billing-ledger">
        <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-h3">Transaction History</h2>
            <div className="flex items-center gap-2 text-label text-[var(--eai-text-secondary)]">
              <Funnel size={16} weight="bold" />
              <span>Filters</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="apple-input"
            />
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="apple-input"
            />
            <Select
              value={filters.status}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
            >
              <SelectTrigger className="apple-input">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select
                value={filters.client}
                onValueChange={(val) => setFilters((prev) => ({ ...prev, client: val }))}
              >
                <SelectTrigger className="apple-input">
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All clients</SelectItem>
                  {Array.from(new Set(transactions.map((tx) => tx.clientName).filter(Boolean))).map((clientName) => (
                    <SelectItem key={clientName} value={clientName}>{clientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={resetFilters}
                className="apple-button-secondary rounded-xl px-3 flex items-center gap-1"
                title="Clear filters"
              >
                <X size={14} weight="bold" />
                Clear
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="w-full animate-pulse p-6">
              {/* Table Header Skeleton */}
              <div className="flex gap-4 pb-4 border-b border-[var(--eai-border)]">
                <div className="h-4 w-32 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-24 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-24 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-24 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-20 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-24 bg-[var(--eai-border)]/50 rounded ml-auto" />
              </div>
              {/* Table Rows Skeleton */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 py-5 border-b border-[var(--eai-border)]">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 bg-[var(--eai-border)]/40 rounded" />
                    <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                  </div>
                  <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                  <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                  <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                  <div className="h-6 w-16 bg-[var(--eai-border)]/40 rounded" />
                  <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                </div>
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="h-16 w-16 bg-[var(--eai-bg)] flex items-center justify-center rounded-2xl">
                <Receipt size={32} className="text-[var(--eai-text-secondary)] opacity-50" />
              </div>
              <div>
                <h3 className="text-h3 text-[var(--eai-text)]">No transactions found</h3>
                <p className="text-body text-[var(--eai-text-secondary)]">Your ledger will appear here once invoices are generated from the Manage Lifecycle view.</p>
              </div>
            </div>
          ) : (
            <>
            <table className="w-full border-collapse text-left">
              <thead className="bg-[var(--eai-bg)]/20 border-b border-[var(--eai-border)]">
                <tr>
                  <th className="px-6 py-4 text-label">Client</th>
                  <th className="px-6 py-4 text-label">Trademark</th>
                  <th className="px-6 py-4 text-label">Type / Purpose</th>
                  <th className="px-6 py-4 text-label">Date</th>
                  <th className="px-6 py-4 text-label">Amount</th>
                  <th className="px-6 py-4 text-label">Status</th>
                  <th className="px-6 py-4 text-label text-center">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--eai-border)]">
                {paginatedTransactions.map((tx, index) => (
                  <tr
                    key={tx.id}
                    className="group hover:bg-[var(--eai-bg)]/40 transition-colors cursor-pointer"
                    onClick={() => navigate(`/invoicing/${tx.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="text-body font-bold text-[var(--eai-text)]">{tx.clientName || 'Client'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-body font-medium text-[var(--eai-text)]">{tx.markName || '—'}</div>
                    </td>
                    <td className="px-6 py-5 text-body font-medium">{tx.type}</td>
                    <td className="px-6 py-5 text-body text-[var(--eai-text-secondary)] font-medium">{tx.date}</td>
                    <td className="px-6 py-5 text-body font-bold">{formatAmount(tx.amount, tx.currency)}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className={[
                          "inline-flex h-6 items-center px-2.5 rounded-none text-micro font-black border",
                          tx.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : 
                          tx.status === 'PARTIALLY_PAID' ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                          tx.status === 'OVERDUE' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                          "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        ].join(' ')}>{tx.status}</span>
                        {tx.status !== 'PAID' && (
                          <button
                            id={index === 0 ? 'record-payment-btn' : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(tx);
                              setPaymentData(prev => ({ ...prev, amount: tx.amount.toString() }));
                              setIsPaymentModalOpen(true);
                            }}
                            className="p-1 rounded-md hover:bg-emerald-50 text-emerald-600 transition-colors"
                            title="Record Payment"
                          >
                            <CheckCircle size={16} weight="bold" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-body font-medium text-[var(--eai-text-secondary)]">{tx.method}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(tx);
                          }}
                          className="p-2 rounded-xl hover:bg-white transition-colors text-[var(--eai-primary)] shadow-sm"
                          title="Download Invoice PDF"
                        >
                          <Download size={18} weight="bold" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length > 0 && (
              <div className="flex items-center justify-between border-t border-[var(--eai-border)] bg-[var(--eai-bg)]/20 px-6 py-4">
                <div className="text-body text-[var(--eai-text-secondary)]">
                  Showing <span className="font-bold text-[var(--eai-text)]">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-bold text-[var(--eai-text)]">{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> of{' '}
                  <span className="font-bold text-[var(--eai-text)]">{filteredTransactions.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--eai-border)] bg-white text-[var(--eai-text)] shadow-sm transition-all hover:bg-[var(--eai-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CaretLeft size={16} weight="bold" />
                  </button>
                  <div className="text-label text-[var(--eai-text-secondary)] px-2">
                    Page <span className="font-bold text-[var(--eai-text)]">{currentPage}</span> / <span className="font-bold text-[var(--eai-text)]">{totalPages}</span>
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--eai-border)] bg-white text-[var(--eai-text)] shadow-sm transition-all hover:bg-[var(--eai-bg)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CaretRight size={16} weight="bold" />
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>
      {/* Payment Recording Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="apple-card max-w-md border-none p-0 overflow-hidden flex flex-col max-h-[90vh] !translate-y-[-50%]">
          <DialogHeader className="p-6 bg-[var(--eai-bg)]/30 border-b border-[var(--eai-border)] shrink-0">
            <DialogTitle className="text-h3 flex items-center gap-2">
              <Bank size={20} className="text-[var(--eai-primary)]" weight="duotone" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-micro text-[var(--eai-text-secondary)]">Amount Received</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--eai-text-secondary)] font-bold">$</span>
                <Input 
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                  className="apple-input pl-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-micro text-[var(--eai-text-secondary)]">Payment Date</Label>
                <Input 
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                  className="apple-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-micro text-[var(--eai-text-secondary)]">Method</Label>
                <Select 
                  value={paymentData.paymentMethod}
                  onValueChange={(val) => setPaymentData({...paymentData, paymentMethod: val})}
                >
                  <SelectTrigger className="apple-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-micro text-[var(--eai-text-secondary)]">Reference Number</Label>
              <Input 
                value={paymentData.referenceNumber}
                onChange={(e) => setPaymentData({...paymentData, referenceNumber: e.target.value})}
                placeholder="Receipt # or Bank Ref"
                className="apple-input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-micro text-[var(--eai-text-secondary)]">Internal Notes</Label>
              <Textarea 
                value={paymentData.notes}
                onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                className="apple-input min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-[var(--eai-bg)]/30 border-t border-[var(--eai-border)] shrink-0">
            <button 
              onClick={() => setIsPaymentModalOpen(false)}
              className="apple-button-secondary rounded-xl"
            >
              Cancel
            </button>
            <button 
              onClick={handleRecordPayment}
              className="apple-button-primary rounded-xl"
            >
              Post Payment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Modal */}
      <Dialog open={isCreateInvoiceModalOpen} onOpenChange={setIsCreateInvoiceModalOpen}>
        <DialogContent className="apple-card max-w-2xl border-none p-0 overflow-hidden flex flex-col max-h-[90vh] !translate-y-[-50%]">
          <DialogHeader className="p-6 bg-[var(--eai-bg)]/30 border-b border-[var(--eai-border)] shrink-0">
            <DialogTitle className="text-h3 flex items-center gap-2">
              <Receipt size={20} className="text-[var(--eai-primary)]" weight="duotone" />
              Create New Invoice
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-micro text-[var(--eai-text-secondary)]">Client *</Label>
                <Select 
                  value={newInvoice.clientId}
                  onValueChange={(val) => setNewInvoice({...newInvoice, clientId: val})}
                >
                  <SelectTrigger className="apple-input">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-micro text-[var(--eai-text-secondary)]">Currency</Label>
                <Select 
                  value={newInvoice.currency}
                  onValueChange={(val) => setNewInvoice({...newInvoice, currency: val})}
                >
                  <SelectTrigger className="apple-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollars</SelectItem>
                    <SelectItem value="ETB">ETB - Ethiopian Birr</SelectItem>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-micro text-[var(--eai-text-secondary)]">Due Date</Label>
                <Input 
                  type="date"
                  value={newInvoice.dueDate}
                  onChange={(e) => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                  className="apple-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-micro text-[var(--eai-text-secondary)]">Total Amount</Label>
                <div className="apple-input bg-[var(--eai-bg)] flex items-center h-10 px-3">
                  <span className="text-[var(--eai-text-secondary)] font-bold mr-2">
                    {newInvoice.currency === 'ETB' ? 'ETB' : newInvoice.currency === 'KES' ? 'KES' : '$'}
                  </span>
                  <span className="text-[var(--eai-text)] font-bold">{totalInvoiceAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[var(--eai-text-secondary)]">Line Items *</Label>
                <button
                  onClick={addLineItem}
                  className="text-micro text-[var(--eai-primary)] hover:underline flex items-center gap-1"
                >
                  <Plus size={14} weight="bold" />
                  Add Item
                </button>
              </div>
              
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start p-4 bg-[var(--eai-bg)]/30 rounded-lg border border-[var(--eai-border)]">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-micro text-[var(--eai-text-secondary)]">Fee Type *</Label>
                          <Select 
                            value={item.category}
                            onValueChange={(val) => updateLineItem(index, 'category', val)}
                          >
                            <SelectTrigger className="apple-input">
                              <SelectValue placeholder="Select a fee..." />
                            </SelectTrigger>
                            <SelectContent>
                              {EIPO_FEES.map((fee) => (
                                <SelectItem key={fee.code} value={fee.code}>
                                  {fee.description} ({fee.amount.toLocaleString()} ETB)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-micro text-[var(--eai-text-secondary)]">Amount ({newInvoice.currency})</Label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--eai-text-secondary)] font-bold text-base pointer-events-none">
                              {newInvoice.currency === 'ETB' ? 'ETB' : newInvoice.currency === 'KES' ? 'KES' : '$'}
                            </span>
                            <Input 
                              type="number"
                              placeholder="0.00"
                              value={item.amount}
                              onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                              className="apple-input !pl-14 text-right font-bold text-lg"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-micro text-[var(--eai-text-secondary)]">Description</Label>
                        <Input 
                          placeholder="Description will auto-fill when you select a fee type"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="apple-input bg-white/50"
                        />
                      </div>
                    </div>
                    {lineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(index)}
                        className="mt-7 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <Trash size={18} weight="bold" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-micro text-[var(--eai-text-secondary)]">Notes (Optional)</Label>
              <Textarea 
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice({...newInvoice, notes: e.target.value})}
                placeholder="Internal notes or additional information..."
                className="apple-input min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-[var(--eai-bg)]/30 border-t border-[var(--eai-border)] shrink-0">
            <button 
              onClick={() => setIsCreateInvoiceModalOpen(false)}
              className="apple-button-secondary rounded-xl"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateInvoice}
              disabled={creatingInvoice}
              className="apple-button-primary rounded-xl disabled:opacity-50 flex items-center gap-2"
            >
              {creatingInvoice ? 'Creating...' : 'Create Invoice'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
