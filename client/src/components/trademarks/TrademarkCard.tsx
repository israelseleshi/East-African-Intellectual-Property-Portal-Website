import { memo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'

const STATUS_NAMES: Record<string, string> = {
  ALL: 'All Statuses', DRAFT: 'Draft', FILED: 'Filed', FORMAL_EXAM: 'Formal Exam',
  SUBSTANTIVE_EXAM: 'Substantive', PUBLISHED: 'Published', REGISTERED: 'Registered',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500 text-white hover:bg-slate-600',
  FILED: 'bg-blue-500 text-white hover:bg-blue-600',
  FORMAL_EXAM: 'bg-yellow-500 text-black hover:bg-yellow-600',
  SUBSTANTIVE_EXAM: 'bg-orange-500 text-white hover:bg-orange-600',
  PUBLISHED: 'bg-purple-500 text-white hover:bg-purple-600',
  REGISTERED: 'bg-green-600 text-white hover:bg-green-700',
  REJECTED: 'bg-red-500 text-white hover:bg-red-600',
  ABANDONED: 'bg-gray-700 text-white hover:bg-gray-800',
}

interface TrademarkCardProps {
  caseData: Record<string, unknown>
  onNavigate: () => void
  markLabel: string
  MarkInfoThumbnail: React.ComponentType<{ markImage?: string; label: string }>
  jurisdiction?: string
  status?: string
  clientName?: string
  markImage?: string
}

export const TrademarkCard = memo(function TrademarkCard({
  onNavigate,
  markLabel: label,
  MarkInfoThumbnail: Thumb,
  jurisdiction,
  status,
  clientName,
  markImage,
}: TrademarkCardProps) {
  return (
    <Card className="p-6 cursor-pointer border-none shadow-sm hover:shadow-premium hover:-translate-y-1 transition-all duration-500 bg-white rounded-3xl group" onClick={onNavigate}>
      <div className="flex items-start gap-5">
        <div className="group-hover:scale-110 transition-transform duration-500">
          <Thumb markImage={markImage} label={label} />
        </div>
        <div className="flex-1 min-w-0">
          <Typography.h4 className="truncate font-bold tracking-tight text-primary group-hover:text-accent transition-colors text-lg">{label}</Typography.h4>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-muted/30 border-none font-bold text-[10px] px-2 py-0.5">{jurisdiction || 'ET'}</Badge>
            <Badge className={`${STATUS_COLORS[status || 'DRAFT'] || 'bg-primary'} border-none shadow-sm font-bold text-[10px] px-2 py-0.5 tracking-wider`}>
              {STATUS_NAMES[status || 'DRAFT'] || status || 'DRAFT'}
            </Badge>
          </div>
          <div className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{clientName || '—'}</div>
        </div>
      </div>
    </Card>
  )
})
