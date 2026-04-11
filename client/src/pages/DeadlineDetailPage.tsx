import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { ArrowLeft, Calendar, FileText, Clock, Info, CheckCircle, WarningCircle, Buildings } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { trademarkService } from '@/utils/api'
import { resolveMarkImageUrl } from '@/pages/TrademarkDetailInfoPage'

type DeadlineDetail = {
  id: string
  case_id: string
  type: string
  due_date: string
  description?: string
  status: string
  priority?: string
  mark_name?: string
  jurisdiction?: string
  client_name?: string
  mark_image?: string
  case_status?: string
}

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  OPPOSITION: 'Opposition', RENEWAL: 'Renewal', RESPONSE: 'Response', AMENDMENT: 'Amendment',
  APPEAL: 'Appeal', RESTORATION: 'Restoration', REVOCATION: 'Revocation', ASSIGNMENT: 'Assignment',
  LICENSE: 'License', CHANGE: 'Change of Details', DIVISION: 'Division', MERGER: 'Merger',
  TRANSFER: 'Transfer', GENERIC: 'Other'
};

const JURISDICTION_DATA: Record<string, { name: string; flag: string }> = {
  ET: { name: 'Ethiopia', flag: '🇪🇹' },
  KE: { name: 'Kenya', flag: '🇰🇪' },
  ER: { name: 'Eritrea', flag: '🇪🇷' },
  DJ: { name: 'Djibouti', flag: '🇩🇯' },
  SO: { name: 'Somalia', flag: '🇸🇴' },
  TZ: { name: 'Tanzania', flag: '🇹🇿' },
  UG: { name: 'Uganda', flag: '🇺🇬' },
  RW: { name: 'Rwanda', flag: '🇷🇼' },
  BI: { name: 'Burundi', flag: '🇧🇮' },
};

const CASE_LIFECYCLE = [
  { id: 'DRAFT', label: 'Draft' },
  { id: 'FILED', label: 'Filed' },
  { id: 'FORMAL_EXAM', label: 'Formal Exam' },
  { id: 'SUBSTANTIVE_EXAM', label: 'Substantive' },
  { id: 'PUBLISHED', label: 'Published' },
  { id: 'REGISTERED', label: 'Registered' }
]

export default function DeadlineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [deadline, setDeadline] = useState<DeadlineDetail | null>(null)

  useEffect(() => {
    async function fetchDetail() {
      if (!id) return
      try {
        setLoading(true)
        const cases = await trademarkService.getCases()
        let found: DeadlineDetail | null = null
        
        for (const c of cases) {
          const dl = (c.deadlines || []).find((d: any) => d.id === id)
          if (dl) {
            found = {
              ...dl,
              case_id: c.id,
              mark_name: c.mark_name || c.markName,
              jurisdiction: c.jurisdiction,
              client_name: c.client_name,
              mark_image: c.mark_image,
              case_status: c.status
            }
            break
          }
        }
        setDeadline(found)
      } catch (err) {
        console.error('Failed to fetch deadline detail:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id])

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>
  if (!deadline) return <div className="p-8 text-center">Deadline not found</div>

  const daysLeft = Math.ceil((new Date(deadline.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const isOverdue = daysLeft < 0

  const strategicContexts: Record<string, string> = {
    OPPOSITION: `The opposition period for "${deadline.mark_name}" is a critical window for third parties to challenge the registration. Missing this deadline means the case will proceed to registration without further opportunity for formal challenge.`,
    RENEWAL: `Maintenance of "${deadline.mark_name}" requires timely renewal. If the renewal date is missed, the trademark may lapse, losing its protection in ${deadline.jurisdiction} and requiring a restoration process with potential surcharges.`,
    RESPONSE: `A response to an office action or examination report is required. Failure to submit a timely response will result in the application for "${deadline.mark_name}" being abandoned by the registry.`,
    AMENDMENT: `Filing an amendment for "${deadline.mark_name}" allows for correction of details or narrowing of the specification to overcome objections. This deadline ensures the application remains compliant with the examiner's requirements.`,
    GENERIC: deadline.description || `This milestone is essential for the continued protection and progression of the trademark "${deadline.mark_name}" within the ${deadline.jurisdiction} legal framework.`
  }

  const currentContext = strategicContexts[deadline.type.toUpperCase()] || strategicContexts.GENERIC

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <header className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate('/deadlines')} className="rounded-full shadow-sm">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Deadline Intelligence</h1>
          <p className="text-muted-foreground text-sm">Detailed analysis for {deadline.mark_name}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-border shadow-md overflow-hidden bg-card">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl font-bold">{DEADLINE_TYPE_LABELS[deadline.type.toUpperCase()] || deadline.type}</CardTitle>
                <CardDescription>Critical Action Required</CardDescription>
              </div>
              <Badge variant={isOverdue ? 'destructive' : 'default'} className="px-4 py-1 rounded-full">
                {isOverdue ? 'Overdue' : 'Active'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="flex items-center gap-8">
              <div className={`p-4 rounded-3xl ${isOverdue ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'}`}>
                <Calendar size={48} weight="duotone" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Action Due By</p>
                <p className="text-4xl font-black tracking-tighter text-foreground">
                  {new Date(deadline.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className={`text-sm font-bold ${isOverdue ? 'text-red-500' : 'text-primary'}`}>
                  {isOverdue ? `${Math.abs(daysLeft)} days past due` : `${daysLeft} days remaining to file`}
                </p>
              </div>
            </div>

            <div className="p-6 bg-muted/30 rounded-2xl border border-dashed">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Info size={18} weight="bold" />
                <span className="text-sm font-bold uppercase tracking-wider">Strategic Context</span>
              </div>
              <p className="text-foreground leading-relaxed italic text-sm">
                {currentContext}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Lifecycle Perspective</h3>
              <div className="relative flex justify-between items-center px-2">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 -z-10" />
                {CASE_LIFECYCLE.map((step, idx) => {
                  const isCurrent = deadline.case_status === step.id
                  const isPast = idx < CASE_LIFECYCLE.findIndex(s => s.id === deadline.case_status)
                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2">
                      <div className={`h-4 w-4 rounded-full border-2 bg-background transition-all duration-500 ${isCurrent ? 'h-6 w-6 border-primary ring-4 ring-primary/20 scale-125' : isPast ? 'border-green-600 bg-green-600' : 'border-muted'}`} />
                      <span className={`text-[10px] font-bold uppercase ${isCurrent ? 'text-primary' : isPast ? 'text-green-600' : 'text-muted-foreground'}`}>{step.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trademark Entity</p>
                <h3 className="font-black text-2xl tracking-tight leading-tight">{deadline.mark_name}</h3>
                <p className="text-base text-muted-foreground font-semibold">{deadline.client_name}</p>
              </div>
              <Button className="w-full font-bold h-12 rounded-xl text-base shadow-sm hover:shadow-md transition-all" onClick={() => navigate(`/trademarks/${deadline.case_id}`)}>
                View Full Case Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border-none shadow-inner">
            <CardContent className="p-6 space-y-4">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm text-xl">
                   {JURISDICTION_DATA[deadline.jurisdiction || 'ET']?.flag || '🌍'}
                 </div>
                 <div>
                   <p className="text-[10px] font-bold uppercase text-muted-foreground">Jurisdiction</p>
                   <p className="text-sm font-black">{JURISDICTION_DATA[deadline.jurisdiction || 'ET']?.name || deadline.jurisdiction}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                   <WarningCircle size={18} className="text-primary" />
                 </div>
                 <div>
                   <p className="text-[10px] font-bold uppercase text-muted-foreground">Urgency</p>
                   <p className="text-sm font-bold">{isOverdue ? 'High (Past Due)' : daysLeft < 30 ? 'High' : 'Medium'}</p>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
