import { useState } from 'react';
import {
  FileText,
  CheckCircle,
  ShieldCheck,
  Globe,
  Certificate,
  Clock,
  Warning,
  XCircle,
  Calendar,
  Hourglass
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  { key: 'DATA_COLLECTION', label: 'Data Collection', description: 'Gathering client and mark information', icon: FileText, actionLabel: 'Record Filing' },
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
    if (days <= 7) return 'text-red-500 animate-pulse';
    if (days <= 30) return 'text-orange-500';
    return 'text-green-500';
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Clock size={20} weight="duotone" />
          Case Flow Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showModal && (
          <StageActionModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handleConfirmAdvance}
            currentStage={currentStage}
            nextStage={STAGES[currentIndex + 1]?.key}
          />
        )}
        <div className="bg-primary/10 border border-primary/20 p-4">
          <div className="text-xs font-bold tracking-wider text-primary mb-1">
            Current stage
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              const StageIcon = STAGES[currentIndex]?.icon || FileText;
              return (
                <div className="flex h-10 w-10 items-center justify-center bg-primary text-white">
                  <StageIcon size={20} weight="duotone" />
                </div>
              );
            })()}
            <div>
              <div className="text-base font-bold">
                {STAGES[currentIndex]?.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {STAGES[currentIndex]?.description}
              </div>
            </div>
          </div>
          {getStageDeadline(currentStage) && (
            <div className={`mt-3 text-sm font-medium flex items-center gap-2 ${getUrgencyColor(getStageDeadline(currentStage)!)}`}>
              <Calendar size={14} />
              Deadline: {new Date(getStageDeadline(currentStage)!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="text-xs">
                ({Math.ceil((new Date(getStageDeadline(currentStage)!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left)
              </span>
            </div>
          )}
        </div>

        <div className="relative pt-12 pb-8 overflow-x-auto">
          <div className="absolute top-[72px] left-0 right-0 h-1 bg-border" />
          <div className="flex justify-center relative min-w-[800px] px-8">
            {STAGES.map((stage, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const deadline = getStageDeadline(stage.key);

              return (
                <div key={stage.key} className="flex flex-col items-center justify-center relative z-10 w-20 mx-1">
                  <div
                    className={`h-10 w-10 flex items-center justify-center rounded-full border-4 transition-all duration-500 scale-100 mb-4 ${isCurrent
                      ? 'border-primary bg-background text-primary shadow-lg shadow-primary/20'
                      : isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-border bg-background text-muted-foreground'
                      }`}
                  >
                    {isCompleted ? <CheckCircle weight="bold" size={18} /> : <stage.icon size={18} />}
                  </div>

                  <div className={`text-xs font-black tracking-tighter text-center line-clamp-2 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {stage.label}
                  </div>

                  {deadline && isCurrent && (
                    <div className={`absolute -top-10 whitespace-nowrap text-xs font-bold px-2 py-1 bg-background border border-current rounded-sm ${getUrgencyColor(deadline)}`}>
                      {new Date(deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                className={`p-4 border-2 transition-all ${isCurrent
                  ? 'border-primary bg-background shadow-md'
                  : isCompleted
                    ? 'border-green-500/20 bg-background/30'
                    : 'border-dashed border-border opacity-60'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`h-8 w-8 flex items-center justify-center ${isCompleted ? 'text-green-500' : 'text-primary'}`}>
                    {isCompleted ? <CheckCircle size={20} weight="bold" /> : <Icon size={20} />}
                  </div>
                  {(isCurrent || (isNext && isEditable)) && (
                    <Button
                      onClick={() => isCurrent ? handleAdvanceClick() : onStageChange(stage.key)}
                      disabled={isAdvancing}
                      size="sm"
                    >
                      {isAdvancing ? '...' : (isCurrent ? (stage.actionLabel || 'Next Stage') : `Start ${stage.label}`)}
                    </Button>
                  )}
                </div>

                <div className={`text-sm font-bold ${isCurrent ? '' : 'text-muted-foreground'}`}>
                  {stage.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stage.description}
                </div>

                {deadline && (isCurrent || isCompleted) && (
                  <div className={`text-xs mt-2 font-bold flex items-center gap-1 ${getUrgencyColor(deadline)}`}>
                    <Calendar size={12} />
                    {new Date(deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <h4 className="text-xs font-black tracking-widest text-muted-foreground mb-4">Special Actions & Exceptions</h4>
          <div className="flex flex-wrap gap-2">
             {SPECIAL_ACTIONS.map((action, index) => {
               const colorClasses = [
                 'bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20',
                 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20',
                 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
               ];
               return (
                 <Button
                   key={action.key}
                   variant="outline"
                   onClick={() => onStageChange(action.key)}
                   className={colorClasses[index]}
                 >
                   <action.icon size={16} />
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