import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { deriveAlertInfo, getSeverityStyle } from '@/utils/alertHelpers'

interface DeadlineAlertPillProps {
  row: Record<string, unknown>
}

export function DeadlineAlertPill({ row }: DeadlineAlertPillProps) {
  const info = deriveAlertInfo(row)
  if (info.severity === 'none') return null
  const style = getSeverityStyle(info.severity)
  const days = info.daysRemaining

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text} hover:opacity-90 transition-opacity`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
          {days !== undefined && (
            <span>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 rounded-xl border-none shadow-premium"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
            <p className="font-semibold text-sm">{style.label} Alert</p>
          </div>
          {info.message && <p className="text-sm text-muted-foreground">{info.message}</p>}
          {info.dueDate && (
            <p className="text-xs text-muted-foreground">
              Due: {new Date(info.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
