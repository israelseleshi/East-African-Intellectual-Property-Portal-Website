import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  PencilSimple,
  FloppyDisk,
  Trash,
  Plus,
  X
} from '@phosphor-icons/react'
import { financialsApi } from '@/api/financials'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

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

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)

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
      console.log('[InvoiceDetailPage] fetchInvoice - Fetching invoice details for ID:', id);
      const data = await financialsApi.getInvoice(id)
      console.log('[InvoiceDetailPage] fetchInvoice - Invoice loaded successfully, invoice_number:', data.invoice_number);
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
      addToast({ title: 'Error', description: 'Failed to load invoice details.', type: 'error' })
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

  const handleSave = async () => {
    if (!invoice) return
    if (editItems.length === 0) {
      addToast({ title: 'Validation Error', description: 'At least one line item is required.', type: 'error' })
      return
    }

    try {
      setSaving(true)
      console.log('[InvoiceDetailPage] handleSave - Starting save for invoice ID:', invoice.id, 'with data:', { dueDate: editData.due_date, currency: editData.currency, status: editData.status, items: editItems });
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
      console.log('[InvoiceDetailPage] handleSave - API call succeeded for invoice ID:', invoice.id);
      addToast({ title: 'Saved', description: 'Invoice updated successfully.', type: 'success' })
      setIsEditing(false)
      await fetchInvoice()
      console.log('[InvoiceDetailPage] handleSave - Save successful, re-fetched invoice data');
    } catch (error) {
      console.error('[InvoiceDetailPage] handleSave - Failed to save invoice:', error);
      addToast({ title: 'Error', description: 'Failed to save invoice.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!invoice) return
    try {
      setDeleting(true)
      console.log('[InvoiceDetailPage] handleDelete - Starting delete for invoice ID:', invoice.id);
      await financialsApi.deleteInvoice(invoice.id)
      console.log('[InvoiceDetailPage] handleDelete - API call succeeded for invoice ID:', invoice.id);
      addToast({ title: 'Deleted', description: 'Invoice deleted successfully.', type: 'success' })
      console.log('[InvoiceDetailPage] handleDelete - Delete successful, navigating to /invoicing');
      navigate('/invoicing')
    } catch (error) {
      console.error('[InvoiceDetailPage] handleDelete - Failed to delete invoice:', error);
      addToast({ title: 'Error', description: 'Failed to delete invoice.', type: 'error' })
    } finally {
      setDeleting(false)
      setIsDeleteOpen(false)
    }
  }

  if (loading) {
    return <div className="apple-card p-8">Loading invoice details...</div>
  }

  if (!invoice) {
    return (
      <div className="apple-card p-8 space-y-4">
        <p className="text-body">Invoice not found.</p>
        <Button onClick={() => navigate('/invoicing')} className="apple-button-secondary">Back to Invoicing</Button>
      </div>
    )
  }

  const paidAmount = Number(invoice.paid_amount || 0)
  const outstandingAmount = Math.max(Number(invoice.outstanding_amount ?? (invoice.total_amount - paidAmount)), 0)

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/invoicing')}
            className="text-label text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} weight="bold" /> Back to Billing
          </button>
          <h1 className="text-h1 text-[var(--eai-text)]">Invoice {invoice.invoice_number}</h1>
          <p className="text-body text-[var(--eai-text-secondary)]">{invoice.client_name} {invoice.mark_name ? `• ${invoice.mark_name}` : ''}</p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button className="apple-button-secondary" onClick={() => setIsEditing(true)}>
                <PencilSimple size={16} weight="bold" className="mr-2" /> Edit
              </Button>
              <Button className="apple-button-secondary text-red-600" onClick={() => setIsDeleteOpen(true)}>
                <Trash size={16} weight="bold" className="mr-2" /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button className="apple-button-secondary" onClick={() => {
                setIsEditing(false)
                if (invoice) {
                  setEditItems(invoice.items || [])
                  setEditData({
                    due_date: invoice.due_date ? String(invoice.due_date).split('T')[0] : '',
                    currency: invoice.currency || 'USD',
                    status: invoice.status || 'DRAFT',
                    notes: invoice.notes || ''
                  })
                }
              }}>
                <X size={16} weight="bold" className="mr-2" /> Cancel
              </Button>
              <Button className="apple-button-primary" disabled={saving} onClick={handleSave}>
                <FloppyDisk size={16} weight="bold" className="mr-2" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="apple-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(isEditing ? editItems : invoice.items).map((item, index) => (
              <div key={item.id || `${item.description}-${index}`} className="grid grid-cols-12 gap-3 items-end p-3 rounded-xl border border-[var(--eai-border)]">
                <div className="col-span-6">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Description</Label>
                  {isEditing ? (
                    <Input
                      value={editItems[index]?.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-medium mt-1">{item.description}</div>
                  )}
                </div>
                <div className="col-span-3">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Category</Label>
                  {isEditing ? (
                    <Select value={editItems[index]?.category || 'OFFICIAL_FEE'} onValueChange={(value) => updateItem(index, 'category', value)}>
                      <SelectTrigger className="apple-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OFFICIAL_FEE">Official Fee</SelectItem>
                        <SelectItem value="PROFESSIONAL_FEE">Professional Fee</SelectItem>
                        <SelectItem value="DISBURSEMENT">Disbursement</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-body mt-1">{item.category}</div>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-micro text-[var(--eai-text-secondary)]">Amount</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editItems[index]?.amount ?? 0}
                      onChange={(e) => updateItem(index, 'amount', Number(e.target.value || 0))}
                      className="apple-input"
                    />
                  ) : (
                    <div className="text-body font-bold mt-1">{formatAmount(item.amount, invoice.currency)}</div>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  {isEditing && editItems.length > 1 && (
                    <button
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove item"
                    >
                      <Trash size={16} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isEditing && (
              <Button className="apple-button-secondary" onClick={addItem}>
                <Plus size={16} weight="bold" className="mr-2" /> Add Line Item
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="apple-card">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-micro text-[var(--eai-text-secondary)]">Status</Label>
              {isEditing ? (
                <Select value={editData.status} onValueChange={(value) => setEditData((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger className="apple-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="inline-flex h-6 items-center px-2.5 rounded-none text-micro font-black border bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {invoice.status}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-micro text-[var(--eai-text-secondary)]">Due Date</Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.due_date}
                  onChange={(e) => setEditData((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="apple-input"
                />
              ) : (
                <div className="text-body">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-micro text-[var(--eai-text-secondary)]">Currency</Label>
              {isEditing ? (
                <Select value={editData.currency} onValueChange={(value) => setEditData((prev) => ({ ...prev, currency: value }))}>
                  <SelectTrigger className="apple-input"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="ETB">ETB</SelectItem>
                    <SelectItem value="KES">KES</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-body">{invoice.currency || 'USD'}</div>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--eai-border)] space-y-2">
              <div className="flex justify-between text-label">
                <span>Total</span>
                <span className="font-bold">{formatAmount(isEditing ? editTotal : invoice.total_amount, isEditing ? editData.currency : invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-label">
                <span>Paid</span>
                <span className="font-bold text-emerald-600">{formatAmount(paidAmount, isEditing ? editData.currency : invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-label">
                <span>Outstanding</span>
                <span className="font-bold text-red-600">{formatAmount(isEditing ? Math.max(editTotal - paidAmount, 0) : outstandingAmount, isEditing ? editData.currency : invoice.currency)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-micro text-[var(--eai-text-secondary)]">Notes</Label>
              {isEditing ? (
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="apple-input min-h-[90px]"
                />
              ) : (
                <div className="text-body text-[var(--eai-text-secondary)]">{invoice.notes || 'No notes provided.'}</div>
              )}
            </div>

            <Button
              className="apple-button-secondary w-full"
              onClick={() => navigate('/invoicing')}
            >
              <CheckCircle size={16} weight="bold" className="mr-2" /> Back to Ledger
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="apple-card max-w-md border-none p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-[var(--eai-bg)]/30 border-b border-[var(--eai-border)]">
            <DialogTitle className="text-h3">Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="p-6 text-body text-[var(--eai-text-secondary)]">
            Are you sure you want to delete invoice <span className="font-bold text-[var(--eai-text)]">{invoice.invoice_number}</span>? This action cannot be undone.
          </div>
          <DialogFooter className="p-6 bg-[var(--eai-bg)]/30 border-t border-[var(--eai-border)]">
            <Button className="apple-button-secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button className="apple-button-secondary text-red-600" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
