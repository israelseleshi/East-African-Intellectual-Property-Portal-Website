import { Transaction } from '@/shared/database'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoiceService } from '../utils/api'
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
  Bank
} from '@phosphor-icons/react'

import { useSearchParams } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export default function BillingPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
   searchParams.get('tour') === 'true'

  const [currency] = useState<'USD' | 'ETB'>('USD')
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: ''
  })
  
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

  

  const handleTourCallback = (data: { status: string }) => {
    const { status } = data
    if (['finished', 'skipped'].includes(status)) {
      searchParams.delete('tour')
      setSearchParams(searchParams)
    }
  }

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
        method: inv.payment_method || inv.method || 'Bank Transfer'
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

  const formatAmount = (val: number) => {
    if (currency === 'ETB') {
      return (val * 120).toLocaleString() + ' ETB'
    }
    return '$' + val.toLocaleString()
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

      const marginLeft = 48
      let y = 790

      page.drawText('INVOICE', {
        x: marginLeft,
        y,
        size: 26,
        font: boldFont,
        color: rgb(0.08, 0.16, 0.32)
      })
      y -= 38

      const rows: Array<[string, string]> = [
        ['Invoice No', tx.invoiceNumber || tx.id],
        ['Client', tx.clientName || 'Client'],
        ['Matter', tx.markName || 'Trademark'],
        ['Purpose (Stage)', tx.type || 'INVOICE'],
        ['Issue Date', tx.issueDate ? new Date(tx.issueDate).toLocaleDateString() : tx.date],
        ['Due Date', tx.dueDate ? new Date(tx.dueDate).toLocaleDateString() : '—'],
        ['Status', tx.status || 'DRAFT'],
        ['Amount', `${tx.currency || 'ETB'} ${Number(tx.amount || 0).toLocaleString()}`],
        ['Payment Method', tx.method || 'Bank Transfer']
      ]

      rows.forEach(([label, value]) => {
        page.drawText(`${label}:`, {
          x: marginLeft,
          y,
          size: 11,
          font: boldFont,
          color: rgb(0.12, 0.12, 0.12)
        })
        page.drawText(value, {
          x: marginLeft + 130,
          y,
          size: 11,
          font: regularFont,
          color: rgb(0.15, 0.15, 0.15)
        })
        y -= 22
      })

      if (tx.notes) {
        y -= 6
        page.drawText('Notes:', {
          x: marginLeft,
          y,
          size: 11,
          font: boldFont,
          color: rgb(0.12, 0.12, 0.12)
        })
        y -= 18
        page.drawText(tx.notes.slice(0, 140), {
          x: marginLeft,
          y,
          size: 10,
          font: regularFont,
          color: rgb(0.2, 0.2, 0.2)
        })
      }

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
        <h1 className="text-h1 text-[var(--eai-text)]">Billing & Ledger</h1>
        <p className="text-body text-[var(--eai-text-secondary)] font-medium">Professional invoicing and financial fee management.</p>
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
        <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4 flex items-center justify-between">
          <h2 className="text-h3">Transaction History</h2>
          <button
            onClick={() => addToast({ title: 'Funnel clicked', type: 'info' })}
            className="flex items-center gap-2 text-label hover:text-[var(--eai-text)] transition-colors"
          >
            <Funnel size={16} weight="bold" />
            Funnel
          </button>
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
          ) : transactions.length === 0 ? (
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
            <table className="w-full border-collapse text-left">
              <thead className="bg-[var(--eai-bg)]/20 border-b border-[var(--eai-border)]">
                <tr>
                  <th className="px-6 py-4 text-label">Mark / Client</th>
                  <th className="px-6 py-4 text-label">Type / Purpose</th>
                  <th className="px-6 py-4 text-label">Date</th>
                  <th className="px-6 py-4 text-label">Amount</th>
                  <th className="px-6 py-4 text-label">Status</th>
                  <th className="px-6 py-4 text-label text-center">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--eai-border)]">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="group hover:bg-[var(--eai-bg)]/40 transition-colors cursor-pointer"
                    onClick={() => tx.markId && navigate(`/trademarks/${tx.markId}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="text-body font-bold text-[var(--eai-text)]">{tx.markName}</div>
                      <div className="text-micro text-[var(--eai-text-secondary)]">Client</div>
                      <div className="text-micro text-[var(--eai-text-secondary)]">{tx.clientName || 'Global Legal Ltd.'}</div>
                    </td>
                    <td className="px-6 py-5 text-body font-medium">{tx.type}</td>
                    <td className="px-6 py-5 text-body text-[var(--eai-text-secondary)] font-medium">{tx.date}</td>
                    <td className="px-6 py-5 text-body font-bold">{formatAmount(tx.amount)}</td>
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
          )}
        </div>
      </div>
      {/* Payment Recording Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="apple-card max-w-md border-none p-0 overflow-hidden flex flex-col max-h-[90vh]">
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
    </div>
  )
}
