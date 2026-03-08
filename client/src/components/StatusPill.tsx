import type { TrademarkStatus } from '@/shared/database'

type Props = {
  status: TrademarkStatus
}

function label(status: TrademarkStatus) {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'FILED':
      return 'Filed'
    case 'FORMAL_EXAM':
      return 'Formal Exam'
    case 'SUBSTANTIVE_EXAM':
      return 'Substantive'
    case 'PUBLISHED':
      return 'Published'
    case 'REGISTERED':
      return 'Registered'
    case 'EXPIRING':
      return 'Expiring'
    case 'RENEWAL':
      return 'Renewal'
    case 'AMENDMENT_PENDING':
      return 'Amendment'
    case 'OPPOSED':
      return 'Opposed'
    case 'ABANDONED':
      return 'Abandoned'
    case 'WITHDRAWN':
      return 'Withdrawn'
    default:
      return status
  }
}

function color(status: TrademarkStatus) {
  switch (status) {
    case 'REGISTERED':
      return 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/20'
    case 'EXPIRING':
    case 'RENEWAL':
    case 'AMENDMENT_PENDING':
      return 'bg-[#FF9500]/10 text-[#FF9500] border-[#FF9500]/20'
    case 'OPPOSED':
    case 'ABANDONED':
    case 'WITHDRAWN':
      return 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20'
    case 'PUBLISHED':
    case 'FORMAL_EXAM':
    case 'SUBSTANTIVE_EXAM':
    case 'FILED':
      return 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20'
    default:
      return 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
  }
}

export default function StatusPill({ status }: Props) {
  return (
    <span
      className={[
        'inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-bold tracking-tight',
        color(status)
      ].join(' ')}
    >
      {label(status)}
    </span>
  )
}
