import { useCallback, useState, useEffect } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Share2 as ShareFat, Copy, Mail as Envelope, MessageCircle as WhatsappLogo, RotateCcw as ClockCounterClockwise } from 'lucide-react'
import { toast } from 'sonner'

const RECENT_SHARES_KEY = 'eaip_recent_shares'

interface RecentShare {
  id: string
  label: string
  timestamp: number
}

function loadRecentShares(): RecentShare[] {
  try {
    const raw = localStorage.getItem(RECENT_SHARES_KEY)
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
    localStorage.setItem(RECENT_SHARES_KEY, JSON.stringify(updated))
  } catch {
    // silently ignore
  }
}

function markLabel(t: { markName?: string; mark_name?: string }): string {
  return t.markName || t.mark_name || '—'
}

function buildShareText(row: any): string {
  const name = markLabel(row)
  const filing = row.filing_number || row.filingNumber || ''
  const jur = row.jurisdiction || 'ET'
  const status = row.status || 'DRAFT'
  const url = `${window.location.origin}/trademarks/${row.id}`

  const isExpiring = status === 'EXPIRING' || status === 'RENEWAL'
  const isRegistered = status === 'REGISTERED'

  let text = ''
  if (isExpiring) {
    text = `⏰ URGENT: ${name} is expiring — action needed!\n`
  } else if (isRegistered) {
    text = `✅ Registered: ${name}\n`
  } else {
    text = `${name}\n`
  }

  if (filing) text += `Filing #: ${filing}\n`
  text += `Jurisdiction: ${jur}\n`
  text += `Status: ${status}\n`
  text += `\n${url}`
  return text
}

interface SharePopoverProps {
  row: any
  onOpenChange?: (open: boolean) => void
}

export function SharePopover({ row, onOpenChange }: SharePopoverProps) {
  const [open, setOpen] = useState(false)
  const [recentShares, setRecentShares] = useState<RecentShare[]>([])

  useEffect(() => {
    if (open) setRecentShares(loadRecentShares())
  }, [open])

  const handleCopyLink = useCallback(async () => {
    const text = buildShareText(row)
    try {
      await navigator.clipboard.writeText(text)
      saveRecentShare({ id: row.id, label: markLabel(row), timestamp: Date.now() })
      toast.success('Copied to clipboard', {
        description: markLabel(row),
      })
    } catch {
      toast.error('Failed to copy')
    }
    setOpen(false)
  }, [row])

  const handleEmail = useCallback(() => {
    const name = markLabel(row)
    const text = buildShareText(row)
    const subject = encodeURIComponent(`Trademark: ${name}`)
    const body = encodeURIComponent(text)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
    saveRecentShare({ id: row.id, label: name, timestamp: Date.now() })
    setOpen(false)
  }, [row])

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(buildShareText(row))
    window.open(`https://wa.me/?text=${text}`, '_blank')
    saveRecentShare({ id: row.id, label: markLabel(row), timestamp: Date.now() })
    setOpen(false)
  }, [row])

  const handleOSShare = useCallback(async () => {
    const name = markLabel(row)
    const url = `${window.location.origin}/trademarks/${row.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url })
        saveRecentShare({ id: row.id, label: name, timestamp: Date.now() })
      } catch {
        // user cancelled
      }
    } else {
      await handleCopyLink()
    }
    setOpen(false)
  }, [row, handleCopyLink])

  const handleReshare = useCallback((share: RecentShare) => {
    const url = `${window.location.origin}/trademarks/${share.id}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard', { description: share.label })
    setOpen(false)
  }, [])

  return (
    <Popover open={open} onOpenChange={v => { setOpen(v); onOpenChange?.(v) }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" onClick={e => e.stopPropagation()} title="Share">
          <ShareFat size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4} className="w-56 p-2">
        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
          Share &quot;{markLabel(row)}&quot;
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
