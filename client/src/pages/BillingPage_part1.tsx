import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoiceService, clientService } from '../utils/api'
import { financialsApi } from '@/api/financials'
import { useToast } from '../components/ui/toast'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
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
  CreditCard
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
  const { toast: addToast } = useToast()

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
  const itemsPerPage = 6

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
      addToast({ title: 'Error', message: 'Please select a client', type: 'error' });
      return;
    }

    const validItems = lineItems.filter(item => item.description && item.amount);
    if (validItems.length === 0) {
      addToast({ title: 'Error', message: 'Please add at least one line item', type: 'error' });
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

      addToast({
        title: 'Invoice Created',
        message: 'The invoice has been created successfully.',
        type: 'success'
      });

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
      addToast({ title: 'Error', message: 'Failed to create invoice.', type: 'error' });
    } finally {
      setCreatingInvoice(false);
    }
  }

  const totalInvoiceAmount = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  }, [lineItems])

  return (
    <div className="w-full space-y-8 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing & Invoicing</h1>
          <p className="text-muted-foreground text-sm">Manage invoices, payments and financial reports.</p>
        </div>
        <Button onClick={() => setIsCreateInvoiceModalOpen(true)}>
          <Plus className="mr-2" size={16} /> Create Invoice
        </Button>
      </div>

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
                />
              </div>
              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="h-10 px-3 flex items-center bg-muted rounded-md border font-bold">
                  {newInvoice.currency === 'ETB' ? 'ETB' : (newInvoice.currency === 'KES' ? 'KES' : '$')}
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
    </div>
  )
}
    try {
