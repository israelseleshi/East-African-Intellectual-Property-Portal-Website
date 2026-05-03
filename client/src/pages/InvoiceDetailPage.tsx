import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle,
  PencilSimple,
  FloppyDisk,
  Trash,
  Plus,
  X,
  CaretLeft,
  DownloadSimple,
  Buildings,
  Calendar,
  CurrencyDollar,
  Receipt,
  Notebook,
  Wallet,
  ClockCounterClockwise,
  CreditCard,
  FileText,
  Eye
} from '@phosphor-icons/react'
import { financialsApi } from '@/api/financials'
import { useSettingsStore } from '@/store/settingsStore'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DatePicker } from '@/components/ui/date-picker'
// Invoice design is now fixed to 'classic' — no dynamic design selection

type InvoiceItem = {
  id?: string
  case_id?: string | null
  description: string
  category: string
  amount: number
}

type InvoiceDetail = {
  id: string
  invoice_number: string
  client_name: string
  mark_name?: string | null
  status: string
  issue_date?: string
  due_date?: string
  currency?: string
  total_amount: number
  paid_amount?: number
  outstanding_amount?: number
  notes?: string | null
  items: InvoiceItem[]
}

const formatAmount = (value: number, currency = 'USD') => {
  const symbols: Record<string, string> = { USD: '$', EUR: 'EUR ', GBP: 'GBP ', ETB: 'ETB ', KES: 'KES ' }
  const symbol = symbols[currency] || `${currency} `
  return `${symbol}${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromTrash = searchParams.get('fromTrash') === 'true'
  // always use Classic layout

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const [editData, setEditData] = useState({
    due_date: '',
    currency: 'USD',
    status: 'DRAFT',
    notes: ''
  })
  const [editItems, setEditItems] = useState<InvoiceItem[]>([])

  const fetchInvoice = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await financialsApi.getInvoice(id, fromTrash)
      setInvoice(data)
      setEditData({
        due_date: data.due_date ? String(data.due_date).split('T')[0] : '',
        currency: data.currency || 'USD',
        status: data.status || 'DRAFT',
        notes: data.notes || ''
      })
      setEditItems(
        (data.items || []).map((item: any) => ({
          id: item.id,
          case_id: item.case_id || null,
          description: item.description || '',
          category: item.category || 'OFFICIAL_FEE',
          amount: Number(item.amount || 0)
        }))
      )
    } catch (error) {
      toast.error('Error', { description: 'Failed to load invoice details.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const editTotal = useMemo(
    () => editItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [editItems]
  )

  const addItem = () => {
    setEditItems((prev) => [...prev, { description: '', category: 'OFFICIAL_FEE', amount: 0 }])
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setEditItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index))
  }

  const { companyInfo, fetchCompanySettings } = useSettingsStore()
  
  const handlePreview = async () => {
    if (!invoice) return
    try {
      setLoading(true)
      await fetchCompanySettings()
      
      const { generateProfessionalInvoice } = await import('@/utils/generateProfessionalInvoice')
      
      const items = (invoice.items || []).map(item => ({
        description: item.description || 'Service',
        quantity: 1,
        price: Number(item.amount || 0),
      }))

      const pdfBytesResult = await generateProfessionalInvoice({
        invoiceNumber: invoice.invoice_number || invoice.id,
        issueDate: invoice.issue_date || new Date().toISOString(),
        dueDate: invoice.due_date,
        clientName: invoice.client_name,
        clientAddress: invoice.notes || undefined, // Using notes as address for now if client address is missing
        items: items,
        currency: invoice.currency || 'USD',
        notes: invoice.notes || undefined,
        status: invoice.status,
        logoUrl: companyInfo.logoUrl
      })

      const blob = new Blob([pdfBytesResult], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      setIsPreviewOpen(true)
    } catch (error) {
      console.error('Failed to generate preview:', error)
      toast.error('Could not generate invoice preview.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!invoice) return
    try {
      setLoading(true)
      await fetchCompanySettings()
      
      const { generateProfessionalInvoice } = await import('@/utils/generateProfessionalInvoice')
      
      const items = (invoice.items || []).map(item => ({
        description: item.description || 'Service',
        quantity: 1,
        price: Number(item.amount || 0),
      }))

      const pdfBytesResult = await generateProfessionalInvoice({
        invoiceNumber: invoice.invoice_number || invoice.id,
        issueDate: invoice.issue_date || new Date().toISOString(),
        dueDate: invoice.due_date,
        clientName: invoice.client_name,
        clientAddress: invoice.notes || undefined,
        items: items,
        currency: invoice.currency || 'USD',
        notes: invoice.notes || undefined,
        status: invoice.status,
        logoUrl: companyInfo.logoUrl
      })

      const blob = new Blob([pdfBytesResult], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice_${invoice.invoice_number || invoice.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      toast.success('PDF downloaded successfully!')
    } catch (error) {
      console.error('Failed to generate professional invoice:', error)
      toast.error('Could not generate invoice PDF.')
    }
  }

  const handleSave = async () => {
    if (!invoice) return
    if (editItems.length === 0) {
      toast.error('Validation Error', { description: 'At least one line item is required.' })
      return
    }

    try {
      setSaving(true)
      await financialsApi.updateInvoice(invoice.id, {
        dueDate: editData.due_date,
        currency: editData.currency,
        status: editData.status,
        notes: editData.notes,
        items: editItems.map((item) => ({
          caseId: item.case_id || undefined,
          description: item.description,
          category: item.category,
          amount: Number(item.amount || 0)
        }))
      })
      toast.success('Saved', { description: 'Invoice updated successfully.' })
      setIsEditing(false)
      fetchInvoice()
    } catch (error) {
      console.error('Failed to save invoice:', error)
      toast.error('Error', { description: 'Failed to save invoice.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice) return
    try {
      setDeleting(true)
      await financialsApi.deleteInvoice(invoice.id)
      toast.success('Deleted', { description: 'Invoice deleted successfully.' })
      navigate('/billing')
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      toast.error('Error', { description: 'Failed to delete invoice.' })
    } finally {
      setDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-[#E8E8ED] text-foreground min-h-screen">
        <div className="space-y-4">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-12 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Invoice Not Found</h2>
            <p className="text-muted-foreground">The invoice you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/billing')}>
              <CaretLeft size={16} /> Back to Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const paidAmount = Number(invoice.paid_amount || 0)
  const outstandingAmount = Math.max(Number(invoice.outstanding_amount ?? (invoice.total_amount - paidAmount)), 0)
  const currency = isEditing ? editData.currency : invoice.currency

  const BadgeStatus = ({ status }: { status: string }) => (
    <Badge 
      className="px-3 py-0.5 rounded-full"
      variant={
        status === 'PAID' ? 'default' : 
        status === 'PARTIALLY_PAID' ? 'secondary' :
        status === 'OVERDUE' ? 'destructive' : 'outline'
      }
    >
      {status}
    </Badge>
  )

  const SummaryFields = [
    { label: 'Issue Date', value: invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '—', icon: Calendar },
    { label: 'Due Date', value: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—', icon: ClockCounterClockwise },
    { label: 'Client', value: invoice.client_name, icon: Buildings },
    { label: 'Trademark', value: invoice.mark_name || '—', icon: FileText },
    { label: 'Total Amount', value: formatAmount(invoice.total_amount, currency), icon: CurrencyDollar },
    { label: 'Paid Amount', value: formatAmount(paidAmount, currency), icon: CreditCard, className: 'text-green-600 font-bold' },
    { label: 'Outstanding', value: formatAmount(outstandingAmount, currency), icon: Wallet, className: 'text-red-500 font-bold' },
  ]

  const ItemsTable = ({ editing = false }: { editing?: boolean }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className={cn("border-b", editing ? "bg-muted/50" : "bg-muted/20")}>
          <tr>
            <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Description</th>
            <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider">Category</th>
            <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider">Amount</th>
            {editing && <th className="px-4 py-3 w-12"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(editing ? editItems : invoice.items).map((item, index) => (
            <tr key={index} className="hover:bg-muted/5 group transition-colors">
              <td className="px-4 py-3">
                {editing ? (
                  <Input
                    value={editItems[index]?.description || ''}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="h-8 text-sm"
                  />
                ) : (
                  <div className="font-semibold text-foreground">{item.description}</div>
                )}
              </td>
              <td className="px-4 py-3">
                {editing ? (
                  <Select 
                    value={editItems[index]?.description || ''} 
                    onValueChange={(value) => {
                      const selectedFee = EIPO_FEES.find(fee => fee.description === value)
                      updateItem(index, 'description', value)
                      updateItem(index, 'category', 'OFFICIAL_FEE')
                      if (selectedFee) {
                        updateItem(index, 'amount', selectedFee.amount)
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-[200px]"><SelectValue placeholder="Select fee type" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {EIPO_FEES.map(fee => (
                        <SelectItem key={fee.code} value={fee.description}>{fee.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="text-[10px] font-bold tracking-tight px-2 py-0 h-5">
                    {item.category}
                  </Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right font-sans font-bold">
                {editing ? (
                  <Input
                    type="number"
                    value={editItems[index]?.amount ?? 0}
                    onChange={(e) => updateItem(index, 'amount', Number(e.target.value || 0))}
                    className="text-right h-8 text-sm"
                  />
                ) : (
                  formatAmount(item.amount, currency)
                )}
              </td>
              {editing && (
                <td className="px-4 py-3">
                  {editItems.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash size={14} />
                    </Button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const Actions = (
    <div className="flex items-center gap-3">
      {!isEditing ? (
        <>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} disabled={fromTrash} title={fromTrash ? 'Cannot edit deleted items' : undefined}>
            <PencilSimple size={16} className="mr-2" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(true)} className="text-destructive hover:text-destructive" disabled={fromTrash}>
            <Trash size={16} className="mr-2" /> Delete
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePreview}>
            <Eye size={16} />
            Preview
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
            <DownloadSimple size={16} />
            Download PDF
          </Button>
        </>
      ) : (
        <>
          <Button variant="outline" size="sm" onClick={() => {
            setIsEditing(false)
            setEditItems(invoice.items || [])
            setEditData({
              due_date: invoice.due_date ? String(invoice.due_date).split('T')[0] : '',
              currency: invoice.currency || 'USD',
              status: invoice.status || 'DRAFT',
              notes: invoice.notes || ''
            })
          }}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <FloppyDisk size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      )}
    </div>
  )

  // Variation 1: Classic (The default)
  const ClassicLayout = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border shadow-sm overflow-hidden bg-card">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle><Typography.h3>Line Items</Typography.h3></CardTitle>
                <Typography.muted>Breakdown of charges and fees</Typography.muted>
              </div>
              {isEditing && (
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus size={14} className="mr-2" /> Add Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ItemsTable editing={isEditing} />
          </CardContent>
        </Card>

        {isEditing && (
          <Card className="bg-muted/5 border-dashed">
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label>Notes for Client</Label>
                <Textarea 
                  value={editData.notes} 
                  onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Will appear on the invoice PDF..."
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card className="border-border/50 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-1.5"><Label>Status</Label>
                    <Select value={editData.status} onValueChange={(v) => setEditData(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label>Due Date</Label>
                    <DatePicker 
                      date={editData.due_date ? new Date(editData.due_date) : undefined} 
                      onDateChange={d => setEditData(p => ({ ...p, due_date: d ? d.toISOString().split('T')[0] : '' }))} 
                      allowFuture={true}
                    />
                  </div>
                  <div className="space-y-1.5"><Label>Currency</Label>
                    <Select value={editData.currency} onValueChange={v => setEditData(p => ({ ...p, currency: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="ETB">ETB</SelectItem><SelectItem value="KES">KES</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {SummaryFields.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-0 grow">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <f.icon size={16} /> <span>{f.label}</span>
                      </div>
                      <span className={cn("font-medium", f.className)}>{f.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {!isEditing && (
              <div className="pt-4 border-t border-border space-y-2 text-foreground">
                <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Client Notes</Label>
                <p className="text-xs italic text-muted-foreground leading-relaxed">{invoice.notes || 'No specific notes for this invoice.'}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const DashboardLayout = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground uppercase font-bold">Total Billable</CardTitle></CardHeader><CardContent className="p-4 pt-0 font-sans text-2xl font-bold text-foreground">{formatAmount(invoice.total_amount, currency)}</CardContent></Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground uppercase font-bold">Total Paid</CardTitle></CardHeader><CardContent className="p-4 pt-0 font-sans text-2xl font-bold text-emerald-600">{formatAmount(paidAmount, currency)}</CardContent></Card>
        <Card className="bg-destructive/5 border-destructive/20"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground uppercase font-bold">Outstanding</CardTitle></CardHeader><CardContent className="p-4 pt-0 font-sans text-2xl font-bold text-destructive">{formatAmount(outstandingAmount, currency)}</CardContent></Card>
        <Card className="bg-muted/40"><CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground uppercase font-bold">Invoice Status</CardTitle></CardHeader><CardContent className="p-4 pt-0"><BadgeStatus status={invoice.status}/></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-muted/10 border-b py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground">Detailed Line Items</CardTitle>
            {isEditing && <Button size="sm" variant="outline" onClick={addItem}><Plus size={12} className="mr-1" /> Add</Button>}
          </CardHeader>
          <CardContent className="p-0"><ItemsTable editing={isEditing} /></CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="border-b bg-muted/5 py-3"><CardTitle className="text-sm font-bold text-foreground">Associated Metadata</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {SummaryFields.filter(f => !f.label.includes('Amount')).map((f, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted/30 rounded-lg text-primary group-hover:bg-primary/10 transition-colors"><f.icon size={18} /></div>
                    <span className="font-semibold text-muted-foreground">{f.label}</span>
                  </div>
                  <span className="text-foreground font-medium">{f.value}</span>
                </div>
              ))}
            </div>
            {invoice.notes && (
              <div className="p-4 bg-muted/10 m-4 rounded-xl border border-border/20 italic text-sm text-muted-foreground">
                <Notebook size={14} className="inline mr-2 mb-1" /> {invoice.notes}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const MinimalistLayout = (
    <div className="max-w-4xl mx-auto space-y-12 py-8 px-4 border-x border-dashed border-border/30 bg-card/10 rounded-3xl">
      <div className="flex justify-between items-start border-b border-border/50 pb-8">
        <div>
          <Badge variant="outline" className="mb-4">{invoice.status}</Badge>
          <Typography.h1a>{invoice.invoice_number}</Typography.h1a>
          <Typography.lead>{invoice.client_name}</Typography.lead>
        </div>
        <div className="text-right space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Issued On</p>
          <p className="text-sm font-semibold text-foreground">{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '?'}</p>
          <div className="pt-4">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Due Date</p>
             <p className="text-sm font-semibold text-primary">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '?'}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground px-4">Billing Profile</h3>
        <ItemsTable editing={isEditing} />
      </div>

      <div className="flex flex-col md:flex-row justify-between pt-12 border-t border-border/50 gap-8">
        <div className="flex-1 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Additional Notes</h4>
          <p className="text-sm leading-relaxed text-muted-foreground font-medium">{invoice.notes || 'Standard terms and conditions apply. Professional fees are based on prevailing rates at the time of filing.'}</p>
        </div>
        <div className="md:w-72 bg-muted/10 p-6 rounded-2xl border border-border/20 space-y-4">
          <div className="flex justify-between text-sm py-1 border-b border-border/10"><span>Subtotal</span><span className="font-sans text-foreground font-bold">{formatAmount(invoice.total_amount, currency)}</span></div>
          <div className="flex justify-between text-sm py-1 border-b border-border/10 text-emerald-600"><span>Allocated Payments</span><span className="font-sans">-{formatAmount(paidAmount, currency)}</span></div>
          <div className="flex justify-between pt-2">
            <span className="text-sm font-bold uppercase tracking-widest text-foreground">Balance Due</span>
            <span className="text-2xl font-black text-foreground drop-shadow-sm">{formatAmount(outstandingAmount, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const DoubleSidebarLayout = (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
      <div className="flex-1 w-full space-y-6 shrink-0">
        <Card className="border shadow-lg drop-shadow-sm overflow-hidden rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/10">
            <div>
              <CardTitle className="text-xl text-foreground">Invoiced Items</CardTitle>
              <CardDescription>Professional and official fees records</CardDescription>
            </div>
            {isEditing && <Button variant="ghost" className="border-2 border-dashed h-9 px-4" onClick={addItem}><Plus className="mr-2" size={14}/> Line</Button>}
          </CardHeader>
          <CardContent className="p-0">
            <ItemsTable editing={isEditing} />
          </CardContent>
        </Card>
        
        {invoice.notes && (
          <div className="p-8 border-2 border-dashed border-border/50 rounded-3xl flex gap-6 items-start">
            <div className="p-4 bg-primary/10 rounded-full shrink-0"><Receipt size={24} className="text-primary" /></div>
            <div className="space-y-2">
               <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Official Remarks</h4>
               <p className="text-muted-foreground italic leading-relaxed text-sm">"{invoice.notes}"</p>
            </div>
          </div>
        )}
      </div>

      <div className="xl:w-96 w-full space-y-6 xl:sticky xl:top-24">
         <Card className="bg-card shadow-xl rounded-3xl overflow-hidden ring-1 ring-border/30">
            <div className="h-2 w-full bg-primary" />
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase text-muted-foreground text-foreground">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="p-6 bg-muted/20 rounded-2xl border border-border/10">
                  <p className="text-sm font-bold text-muted-foreground mb-1">Status</p>
                  <BadgeStatus status={invoice.status} />
                  <Separator className="my-4 opacity-30" />
                  <div className="space-y-4">
                     {SummaryFields.filter(f => !f.label.includes('Amount')).map((f, i) => (
                       <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span className="font-bold text-foreground">{f.value}</span>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-3 px-1">
                  <div className="flex justify-between items-baseline text-sm">
                    <span className="text-muted-foreground font-medium text-foreground">Gross Total</span>
                    <span className="font-sans text-lg font-bold text-foreground">{formatAmount(invoice.total_amount, currency)}</span>
                  </div>
                  <div className="flex justify-between items-baseline text-sm">
                    <span className="text-muted-foreground font-medium text-foreground">Applied Payments</span>
                    <span className="font-sans text-emerald-500 font-bold">{formatAmount(paidAmount, currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-black uppercase tracking-tighter text-foreground">Pending</span>
                    <span className="text-3xl font-black text-destructive tracking-tighter">{formatAmount(outstandingAmount, currency)}</span>
                  </div>
               </div>
               
               <Button className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform">
                  Process Payment
               </Button>
            </CardContent>
         </Card>
      </div>
    </div>
  )

  const CompactLayout = (
    <Card className="bg-card shadow-sm rounded-lg overflow-hidden border">
        <div className="bg-muted/10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-px border-b">
           {SummaryFields.map((f, i) => (
             <div key={i} className="bg-card p-4 flex flex-col items-center justify-center text-center gap-1 border-r last:border-0 grow">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest grow">{f.label}</span>
                <span className={cn("text-xs font-bold truncate w-full", f.className)}>{f.value}</span>
             </div>
           ))}
        </div>
        <CardContent className="p-0">
          <div className="p-1 px-4 bg-muted/5 flex items-center justify-between border-b">
             <span className="text-[10px] font-bold text-muted-foreground text-foreground">Line Item Inventory</span>
             <Badge variant="outline" className="text-[9px] h-4 py-0 font-bold uppercase">{invoice.items.length} items</Badge>
          </div>
          <ItemsTable editing={isEditing} />
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-start bg-muted/5">
             <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase text-foreground">Manifest Notes</span>
                <p className="text-xs leading-relaxed text-muted-foreground font-medium border-l-2 border-primary/20 pl-4 py-1 italic">{invoice.notes || 'No administrative notes appended to this file.'}</p>
             </div>
             <div className="bg-card p-4 rounded-lg border border-border/50 divide-y divide-border/30">
                <div className="flex justify-between py-2"><span className="text-xs text-muted-foreground text-foreground">Subtotal</span><span className="text-xs font-sans font-bold text-foreground">{formatAmount(invoice.total_amount, currency)}</span></div>
                <div className="flex justify-between py-2"><span className="text-xs text-muted-foreground text-foreground">Receipted</span><span className="text-xs font-sans font-bold text-emerald-600">{formatAmount(paidAmount, currency)}</span></div>
                <div className="flex justify-between py-3"><span className="text-xs font-bold uppercase tracking-widest text-foreground">Carry Forward</span><span className="text-lg font-black font-sans text-destructive">{formatAmount(outstandingAmount, currency)}</span></div>
             </div>
          </div>
        </CardContent>
    </Card>
  )

  const CurrentLayout = () => ClassicLayout

  return (
    <div className="w-full p-4 md:p-8 space-y-6 bg-[#E8E8ED] text-foreground min-h-screen" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-2">
        <div className="flex flex-col gap-6">
          <Button variant="outline" onClick={() => navigate('/billing')} className="w-fit h-9 px-4 group bg-white">
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Ledger
          </Button>
          <div>
            <div className="mb-1">
               <Badge className="bg-primary/10 text-primary uppercase text-[10px] font-black tracking-widest px-3 py-1 mb-3 inline-flex items-center border-none">Invoice Doc</Badge>
            </div>
<Typography.h1>{invoice.invoice_number}</Typography.h1>
            <Typography.lead className="flex items-center gap-2">
              <Buildings size={20} className="text-primary/70" /> {invoice.client_name} 
              {invoice.mark_name && <span className="opacity-40">•</span>}
              {invoice.mark_name && <span className="text-foreground/80">{invoice.mark_name}</span>}
            </Typography.lead>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-start">
           {Actions}
        </div>
      </header>

      <Separator className="opacity-40" />

      <div className="animate-in fade-in duration-500">
        <CurrentLayout />
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <Typography.p className="py-4">
            Are you sure you want to delete this invoice? This action cannot be undone.
          </Typography.p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={(open) => {
        setIsPreviewOpen(open)
        if (!open && pdfUrl) {
          URL.revokeObjectURL(pdfUrl)
          setPdfUrl(null)
        }
      }}>
        <DialogContent className="max-w-fit h-[95vh] p-0 overflow-hidden flex flex-col border-none bg-transparent shadow-none">
          <DialogHeader className="p-4 border-b bg-background rounded-t-lg">
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-[#525659] overflow-auto flex justify-center p-4">
            {pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=0&view=FitH`}
                className="w-[850px] h-full shadow-2xl bg-white"
                title="Invoice Preview"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Typography.p>Loading preview...</Typography.p>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-background rounded-b-lg">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
            <Button onClick={handleDownload}>
              <DownloadSimple className="mr-2" size={16} />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
