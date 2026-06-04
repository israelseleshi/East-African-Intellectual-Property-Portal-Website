export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'none'

export interface AlertInfo {
  severity: AlertSeverity
  daysRemaining?: number
  dueDate?: string
  message?: string
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3, info: 4, none: 5,
}

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; text: string; ring: string; dot: string; label: string }> = {
  critical: { bg: 'bg-red-500', text: 'text-white', ring: 'ring-red-500/30', dot: 'bg-red-500', label: 'Critical' },
  high:     { bg: 'bg-orange-500', text: 'text-white', ring: 'ring-orange-500/30', dot: 'bg-orange-500', label: 'High' },
  medium:   { bg: 'bg-yellow-500', text: 'text-black', ring: 'ring-yellow-500/30', dot: 'bg-yellow-500', label: 'Medium' },
  low:      { bg: 'bg-blue-500', text: 'text-white', ring: 'ring-blue-500/30', dot: 'bg-blue-500', label: 'Low' },
  info:     { bg: 'bg-slate-500', text: 'text-white', ring: 'ring-slate-500/30', dot: 'bg-slate-500', label: 'Info' },
  none:     { bg: 'bg-muted', text: 'text-muted-foreground', ring: 'ring-muted/30', dot: 'bg-muted', label: 'No Alert' },
}

function getDaysUntil(value: unknown): number | undefined {
  if (!value) return undefined
  const date = new Date(value as string | number | Date)
  if (isNaN(date.getTime())) return undefined
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v) return v
  }
  return undefined
}

export function deriveAlertInfo(input: unknown): AlertInfo {
  if (!input || typeof input !== 'object') return { severity: 'none' }
  const c = input as Record<string, unknown>

  const expiry = pickString(c, 'expiry_date', 'expiryDate')
  const nextRenewal = pickString(c, 'next_renewal_date', 'nextRenewalDate')
  const nextAction = pickString(c, 'next_action_date', 'nextActionDate')

  let earliestDeadline: string | undefined
  const deadlinesRaw = c.deadlines
  if (Array.isArray(deadlinesRaw)) {
    for (const d of deadlinesRaw) {
      if (!d || typeof d !== 'object') continue
      const dd = d as Record<string, unknown>
      const status = String(dd.status ?? '').toUpperCase()
      if (status === 'COMPLETED' || status === 'SUPERSEDED') continue
      const dateStr = pickString(dd, 'due_date', 'dueDate')
      if (!dateStr) continue
      if (!earliestDeadline || new Date(dateStr) < new Date(earliestDeadline)) {
        earliestDeadline = dateStr
      }
    }
  }

  const candidates = [getDaysUntil(expiry), getDaysUntil(nextRenewal), getDaysUntil(earliestDeadline), getDaysUntil(nextAction)]
    .filter((d): d is number => typeof d === 'number')
  if (candidates.length === 0) return { severity: 'none' }
  const minDays = Math.min(...candidates)

  let severity: AlertSeverity = 'none'
  let message: string | undefined
  const abs = Math.abs(minDays)
  if (minDays < 0) {
    severity = 'critical'
    message = `Overdue by ${abs} day${abs === 1 ? '' : 's'}`
  } else if (minDays <= 7) {
    severity = 'critical'
    message = `${minDays} day${minDays === 1 ? '' : 's'} remaining`
  } else if (minDays <= 30) {
    severity = 'high'
    message = `${minDays} days remaining`
  } else if (minDays <= 90) {
    severity = 'medium'
    message = `${minDays} days remaining`
  } else if (minDays <= 180) {
    severity = 'low'
    message = `${minDays} days remaining`
  } else {
    severity = 'info'
    message = `${minDays} days remaining`
  }

  return { severity, daysRemaining: minDays, dueDate: earliestDeadline ?? expiry ?? nextRenewal, message }
}

export function getSeverityStyle(s: AlertSeverity) {
  return SEVERITY_STYLES[s] ?? SEVERITY_STYLES.none
}

export function rankSeverity(a: AlertSeverity, b: AlertSeverity): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b]
}
