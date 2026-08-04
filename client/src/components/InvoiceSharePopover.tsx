import { useCallback, useState, useEffect } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Share2 as ShareFat, Copy, Mail as Envelope, MessageCircle as WhatsappLogo, RotateCcw as ClockCounterClockwise } from 'lucide-react'
import { toast } from 'sonner'

const RECENT_INVOICE_SHARES_KEY = 'eaip_recent_invoice_shares'

interface RecentShare {
  id: string
  label: string
  timestamp: number
}

function loadRecentShares(): RecentShare[] {
  try {
    const raw = localStorage.getItem(RECENT_INVOICE_SHARES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentShare[]
  } catch {
    return []
  }
}

function saveRecentShare(share: RecentShare): void {
  try {
    const existing = loadRecentShares()
    const filtered = existing.filter(s => s.id !== share.id)
    const updated = [share, ...filtered].slice(0, 5)
    localStorage.setItem(RECENT_INVOICE_SHARES_KEY, JSON.stringify(updated))
  } catch {
    // silently ignore
  }
}

function formatAmount(val: number, currency?: string): string {
  if (val == null || isNaN(val)) return '—'
  const code = currency || 'USD'
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', ETB: 'ETB ', KES: 'KES ' }
  const sym = symbols[code] || `${code} `
  return sym + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function dueDateLabel(row: any): string {
  const dd = row.dueDate || row.due_date
  if (!dd) return ''
  const d = new Date(dd)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function invoiceNumber(row: any): string {
  return row.invoiceNumber || row.invoice_number || row.id || '—'
}

function buildShareText(row: any): string {
  const invNo = invoiceNumber(row)
  const amount = formatAmount(row.amount, row.currency)
  const client = row.clientName || row.client_name || 'Client'
  const mark = row.markName || row.mark_name || ''
  const status = row.status || 'UNPAID'
  const due = dueDateLabel(row)
  const method = row.method || ''

  let intro = ''
  let detail = ''

  if (status === 'PAID') {
    intro = `✅ Invoice ${invNo} — ${amount} — PAID`
    detail = `Status: PAID${method ? ` via ${method}` : ''}`
  } else if (status === 'OVERDUE') {
    intro = `⚠️ Invoice ${invNo} — ${amount} — OVERDUE`
    detail = `Status: OVERDUE — was due ${due || 'N/A'}`
  } else if (status === 'PARTIALLY_PAID') {
    intro = `📄 Invoice ${invNo} — ${amount} — Partially Paid`
    detail = `Status: Partially Paid — balance outstanding`
  } else {
    intro = `📄 Invoice ${invNo} — ${amount} — ${status}`
    detail = `Status: ${status}${due ? ` — Due ${due}` : ''}`
  }

  let text = `${intro}\n${detail}`
  if (client) text += `\nClient: ${client}`
  if (mark) text += `\nTrademark: ${mark}`
  return text
}

interface InvoiceSharePopoverProps {
  row: any
  onOpenChange?: (open: boolean) => void
}

export function InvoiceSharePopover({ row, onOpenChange }: InvoiceSharePopoverProps) {
  const [open, setOpen] = useState(false)
  const [recentShares, setRecentShares] = useState<RecentShare[]>([])

  useEffect(() => {
    if (open) setRecentShares(loadRecentShares())
  }, [open])

  const handleCopyLink = useCallback(async () => {
    const text = buildShareText(row)
    try {
      await navigator.clipboard.writeText(text)
      saveRecentShare({ id: row.id, label: invoiceNumber(row), timestamp: Date.now() })
      toast.success('Copied to clipboard', { description: invoiceNumber(row) })
    } catch {
      toast.error('Failed to copy')
    }
    setOpen(false)
  }, [row])

  const handleEmail = useCallback(() => {
    const invNo = invoiceNumber(row)
    const text = buildShareText(row)
    const subject = encodeURIComponent(`Invoice ${invNo}`)
    const body = encodeURIComponent(text)
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank')
    saveRecentShare({ id: row.id, label: invNo, timestamp: Date.now() })
    setOpen(false)
  }, [row])

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(buildShareText(row))
    window.open(`https://wa.me/?text=${text}`, '_blank')
    saveRecentShare({ id: row.id, label: invoiceNumber(row), timestamp: Date.now() })
    setOpen(false)
  }, [row])

  const handleOSShare = useCallback(async () => {
    const invNo = invoiceNumber(row)
    const url = `${window.location.origin}/billing/${row.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${invNo}`, url })
        saveRecentShare({ id: row.id, label: invNo, timestamp: Date.now() })
      } catch {
        // user cancelled
      }
    } else {
      await handleCopyLink()
    }
    setOpen(false)
  }, [row, handleCopyLink])

  const handleReshare = useCallback((share: RecentShare) => {
    const url = `${window.location.origin}/billing/${share.id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard', { description: share.label })
    setOpen(false)
  }, [])

  const status = row.status || 'UNPAID'
  const statusBadgeVariant = status === 'PAID' ? 'default' : status === 'OVERDUE' ? 'destructive' : 'outline'
  const statusBadgeClass = status === 'PAID' ? 'bg-green-500' : ''

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); onOpenChange?.(v) }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()} title="Share Invoice">
          <ShareFat size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4} className="w-64 p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-xs font-semibold text-muted-foreground">
            Share "{invoiceNumber(row)}"
          </span>
          <Badge variant={statusBadgeVariant as any} className={`text-[10px] px-1.5 py-0 ${statusBadgeClass}`}>
            {status === 'PARTIALLY_PAID' ? 'Partial' : status}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground px-2 pb-1.5">
          {formatAmount(row.amount, row.currency)} &middot; {row.clientName || row.client_name || 'Client'}
        </div>
        <div className="space-y-0.5">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors"
          >
            <Copy size={16} className="text-muted-foreground" />
            <span>Copy Link</span>
          </button>
          <button
            onClick={handleEmail}
            className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors"
          >
            <Envelope size={16} className="text-muted-foreground" />
            <span>Email</span>
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors"
          >
            <WhatsappLogo size={16} className="text-muted-foreground" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleOSShare}
            className="flex items-center gap-3 w-full px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors"
          >
            <ShareFat size={16} className="text-muted-foreground" />
            <span>More…</span>
          </button>
        </div>
        {recentShares.length > 0 && (
          <>
            <div className="border-t my-1.5" />
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1 flex items-center gap-1.5">
              <ClockCounterClockwise size={12} />
              Recent
            </div>
            <div className="space-y-0.5">
              {recentShares.map(share => (
                <button
                  key={share.id}
                  onClick={() => handleReshare(share)}
                  className="flex items-center gap-3 w-full px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors text-muted-foreground"
                >
                  <ShareFat size={14} />
                  <span className="truncate">{share.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
