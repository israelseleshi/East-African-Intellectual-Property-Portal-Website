import { useState } from 'react';
import { FileText, CheckCircle, ShieldCheck, Globe, Award as Certificate, Clock, AlertTriangle as Warning, XCircle, Calendar, Hourglass, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CaseFlowStage, Jurisdiction } from '@/shared/database';
import { JURISDICTION_CONFIG } from '@/shared/database';

import { StageActionModal } from './StageActionModal';

interface StageChangeData {
  triggerDate?: string;
  notes?: string;
  [key: string]: unknown;
}

interface CaseStageTrackerProps {
  currentStage: CaseFlowStage;
  jurisdiction: Jurisdiction;
  deadlines: {
    formal_exam_deadline?: string;
    opposition_period_end?: string;
    certificate_requested_date?: string;
    certificate_issued_date?: string;
    renewal_due_date?: string;
    renewal_on_time_deadline?: string;
    renewal_penalty_deadline?: string;
    amendment_deadline?: string;
  };
  onStageChange: (newStage: CaseFlowStage, data?: StageChangeData) => void;
  onDownloadForm?: () => void;
  isEditable?: boolean;
}

const STAGES: { key: CaseFlowStage; label: string; description: string; icon: typeof FileText; actionLabel?: string }[] = [
  { key: 'DATA_COLLECTION', label: 'Data Collection', description: 'Gathering client and mark information', icon: FileText, actionLabel: 'Collected' },
  { key: 'FILED', label: 'Filed', description: 'Application submitted to registry', icon: FileText, actionLabel: 'Proceed to Exam' },
  { key: 'FORMAL_EXAM', label: 'Formal Exam', description: 'Paperwork review by registry', icon: ShieldCheck, actionLabel: 'Pass Formalities' },
  { key: 'SUBSTANTIVE_EXAM', label: 'Substantive Exam', description: 'Uniqueness review (20 days)', icon: ShieldCheck, actionLabel: 'Record Result' },
  { key: 'PUBLISHED', label: 'Published', description: 'Opposition window (60 days)', icon: Globe, actionLabel: 'End Opposition' },
  { key: 'CERTIFICATE_REQUEST', label: 'Cert. Request', description: 'Requesting physical certificate (20 days)', icon: Hourglass, actionLabel: 'Issue Certificate' },
  { key: 'CERTIFICATE_ISSUED', label: 'Cert. Issued', description: 'Certificate received from registry', icon: Certificate, actionLabel: 'Finalize Registration' },
  { key: 'REGISTERED', label: 'Registered', description: 'Mark officially protected', icon: CheckCircle, actionLabel: 'Start Renewal Watch' },
  { key: 'RENEWAL_DUE', label: 'Renewal Period', description: '7-year maintenance cycle', icon: Clock, actionLabel: 'Process Renewal' }
];

const SPECIAL_ACTIONS: { key: CaseFlowStage; label: string; icon: typeof Warning | typeof Clock | typeof XCircle }[] = [
  { key: 'AMENDMENT_PENDING', label: 'Respond to Office Action', icon: Warning },
  { key: 'RENEWAL_ON_TIME', label: 'Renew On Time', icon: CheckCircle },
  { key: 'RENEWAL_PENALTY', label: 'Renew with Penalty', icon: Clock },
  { key: 'DEAD_WITHDRAWN', label: 'Withdraw/Abandon Case', icon: XCircle }
];

export default function CaseStageTracker({
  currentStage,
  jurisdiction,
  deadlines,
  onStageChange,
  onDownloadForm,
  isEditable = true
}: CaseStageTrackerProps) {
  const [showModal, setShowModal] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const currentIndex = STAGES.findIndex(s => s.key === currentStage);
  const config = JURISDICTION_CONFIG[jurisdiction];

  const getStageDeadline = (stage: CaseFlowStage): string | null => {
    switch (stage) {
      case 'FORMAL_EXAM':
        return deadlines.formal_exam_deadline || null;
      case 'AMENDMENT_PENDING':
        return deadlines.amendment_deadline || null;
      case 'PUBLISHED':
        return deadlines.opposition_period_end || null;
      case 'CERTIFICATE_REQUEST':
        return deadlines.certificate_requested_date || null;
      case 'CERTIFICATE_ISSUED':
        return deadlines.certificate_issued_date || null;
      case 'RENEWAL_DUE':
      case 'RENEWAL_ON_TIME':
        return deadlines.renewal_on_time_deadline || null;
      case 'RENEWAL_PENALTY':
        return deadlines.renewal_penalty_deadline || null;
      default:
        return null;
    }
  };

  const getUrgencyColor = (deadlineStr: string): string => {
    const days = Math.ceil((new Date(deadlineStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return 'text-red-600 bg-red-50 border-red-200 animate-pulse';
    if (days <= 30) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const handleAdvanceClick = () => {
    if (currentIndex < STAGES.length - 1) {
      setShowModal(true);
    }
  };

  const handleConfirmAdvance = (data: StageChangeData) => {
    if (currentIndex < STAGES.length - 1) {
      setIsAdvancing(true);
      onStageChange(STAGES[currentIndex + 1].key, data);
      setTimeout(() => setIsAdvancing(false), 500);
    }
  };

  return (
    <Card className="shadow-premium border-none rounded-3xl overflow-hidden bg-white">
      <CardHeader className="bg-muted/30 border-b border-border/50 py-6 px-8">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-black tracking-tight flex items-center gap-3">
            <Clock size={24} className="text-primary" />
            Case Flow Timeline
          </CardTitle>
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary font-black uppercase tracking-widest text-[10px]">
            {currentIndex + 1} / {STAGES.length} Stages
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-10">
        {showModal && (
          <StageActionModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handleConfirmAdvance}
            currentStage={currentStage}
            nextStage={STAGES[currentIndex + 1]?.key}
          />
        )}
        
        {/* Active Stage Card */}
        <div className="relative overflow-hidden bg-primary/5 border border-primary/20 rounded-2xl p-8 group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
            {(() => {
              const StageIcon = STAGES[currentIndex]?.icon || FileText;
              return <StageIcon size={120} />;
            })()}
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {(() => {
                const StageIcon = STAGES[currentIndex]?.icon || FileText;
                return (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-500">
                    <StageIcon size={32} />
                  </div>
                );
              })()}
              <div>
                <div className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-1">Active lifecycle stage</div>
                <Typography.h3 className="text-2xl font-black tracking-tight mb-1 text-primary">
                  {STAGES[currentIndex]?.label}
                </Typography.h3>
                <div className="text-sm font-medium text-muted-foreground/80">
                  {STAGES[currentIndex]?.description}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              {getStageDeadline(currentStage) && (
                <div className={cn(
                  "px-4 py-2.5 rounded-xl border text-sm font-black flex items-center gap-3 shadow-sm",
                  getUrgencyColor(getStageDeadline(currentStage)!)
                )}>
                  <Calendar size={18} />
                  <div>
                    <div className="text-[9px] uppercase tracking-wider opacity-70">Regulatory Deadline</div>
                    {new Date(getStageDeadline(currentStage)!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <span className="ml-2 opacity-70 font-bold">
                      ({Math.ceil((new Date(getStageDeadline(currentStage)!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days)
                    </span>
                  </div>
                </div>
              )}
              
              {isEditable && currentIndex < STAGES.length - 1 && (
                <Button 
                  onClick={handleAdvanceClick} 
                  disabled={isAdvancing}
                  className="h-12 px-6 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  {STAGES[currentIndex]?.actionLabel || 'Advance Stage'}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Visual Progress Line */}
        <div className="relative py-12 px-4 bg-muted/20 rounded-3xl border border-border/50">
          <div className="absolute top-[84px] left-10 right-10 h-1 bg-border/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
              style={{ width: `${(currentIndex / (STAGES.length - 1)) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between relative min-w-[800px] px-1">
            {STAGES.map((stage, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const deadline = getStageDeadline(stage.key);

              return (
                <div key={stage.key} className="flex flex-col items-center relative z-10 w-24">
                  <div
                    className={cn(
                      "h-12 w-12 flex items-center justify-center rounded-2xl border-4 transition-all duration-700 mb-4 shadow-sm",
                      isCurrent
                        ? "border-primary bg-white text-primary shadow-lg shadow-primary/20 scale-125 z-20"
                        : isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                          : "border-border bg-white text-muted-foreground/40"
                    )}
                  >
                    {isCompleted ? <CheckCircle size={24} /> : <stage.icon size={24} />}
                  </div>

                  <div className={cn(
                    "text-[10px] font-black tracking-tight text-center leading-tight uppercase",
                    isCurrent ? "text-primary scale-110" : isCompleted ? "text-foreground" : "text-muted-foreground/60"
                  )}>
                    {stage.label}
                  </div>
                  
                  {isCurrent && (
                    <div className="absolute -bottom-6 flex items-center gap-1">
                      <div className="h-1 w-1 rounded-full bg-primary animate-ping" />
                      <div className="text-[8px] font-black text-primary tracking-widest uppercase">Live</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage Grid Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isNext = index === currentIndex + 1;
            
            if (!isCurrent && !isCompleted && !isNext) return null;

            const Icon = stage.icon;
            const deadline = getStageDeadline(stage.key);

            return (
              <div
                key={stage.key}
                className={cn(
                  "group p-6 rounded-2xl border-2 transition-all duration-500 overflow-hidden relative",
                  isCurrent
                    ? "border-primary bg-white shadow-premium ring-4 ring-primary/5"
                    : isCompleted
                      ? "border-emerald-500/10 bg-emerald-50/20 grayscale-[0.5] opacity-80"
                      : "border-dashed border-border/60 bg-muted/10 opacity-60"
                )}
              >
                {isCompleted && (
                  <div className="absolute top-0 right-0 p-4">
                    <CheckCircle size={48} className="text-emerald-500/10" />
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-6">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-sm",
                    isCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                  )}>
                    {isCompleted ? <CheckCircle size={28} /> : <Icon size={28} />}
                  </div>
                  {(isCurrent || (isNext && isEditable)) && (
                    <Button
                      onClick={() => isCurrent ? handleAdvanceClick() : onStageChange(stage.key)}
                      disabled={isAdvancing}
                      size="sm"
                      variant={isCurrent ? "default" : "outline"}
                      className={cn(
                        "rounded-lg font-black text-[10px] uppercase tracking-wider h-9",
                        isCurrent ? "shadow-md shadow-primary/20" : "border-border/50 hover:bg-white"
                      )}
                    >
                      {isAdvancing ? '...' : (isCurrent ? (stage.actionLabel || 'Proceed') : `Start Phase`)}
                    </Button>
                  )}
                </div>

                <div>
                  <div className={cn(
                    "text-sm font-black tracking-tight uppercase mb-1",
                    isCurrent ? "text-primary" : "text-foreground"
                  )}>
                    {stage.label}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground leading-relaxed">
                    {stage.description}
                  </div>
                </div>

                {deadline && (isCurrent || isCompleted) && (
                  <div className={cn(
                    "mt-4 pt-4 border-t border-border/40 flex items-center gap-2 text-[11px] font-black uppercase tracking-tighter",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}>
                    <Calendar size={14} />
                    Target: {new Date(deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Special Actions */}
        <div className="mt-12 pt-10 border-t border-border/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-8 w-1 bg-primary rounded-full" />
            <h4 className="text-[10px] font-black tracking-[0.3em] text-muted-foreground uppercase">Lifecycle Exceptions & Manual Actions</h4>
          </div>
          <div className="flex flex-wrap gap-3">
             {SPECIAL_ACTIONS.map((action, index) => {
               const variants = [
                 'border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:border-orange-300',
                 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300',
                 'border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 hover:border-sky-300',
                 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300'
               ];
               return (
                 <Button
                   key={action.key}
                   variant="outline"
                   onClick={() => onStageChange(action.key)}
                   className={cn(
                     "h-11 px-5 border rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5",
                     variants[index % variants.length]
                   )}
                 >
                   <action.icon size={18} className="mr-2" />
                   {action.label}
                 </Button>
               );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
