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
    // ... no changes here
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
    if (days <= 7) return 'text-[#FF3B30] animate-pulse';
    if (days <= 30) return 'text-[#FF9500]';
    return 'text-[#34C759]';
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
    <Card className="apple-card">
      <CardHeader>
        <CardTitle className="text-[18px] font-bold tracking-tight flex items-center gap-2">
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
        {/* Current Stage Banner */}
        <div className="bg-[var(--eai-primary)]/10 border border-[var(--eai-primary)]/20 p-4">
          <div className="text-[11px] font-bold tracking-wider text-[var(--eai-primary)] mb-1">
            Current stage
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              const StageIcon = STAGES[currentIndex]?.icon || FileText;
              return (
                <div className="flex h-10 w-10 items-center justify-center bg-[var(--eai-primary)] text-white">
                  <StageIcon size={20} weight="duotone" />
                </div>
              );
            })()}
            <div>
              <div className="text-[16px] font-bold text-[var(--eai-text)]">
                {STAGES[currentIndex]?.label}
              </div>
              <div className="text-[13px] text-[var(--eai-text-secondary)]">
                {STAGES[currentIndex]?.description}
              </div>
            </div>
          </div>
          {getStageDeadline(currentStage) && (
            <div className={`mt-3 text-[13px] font-medium flex items-center gap-2 ${getUrgencyColor(getStageDeadline(currentStage)!)}`}>
              <Calendar size={14} />
              Deadline: {new Date(getStageDeadline(currentStage)!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="text-[11px]">
                ({Math.ceil((new Date(getStageDeadline(currentStage)!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left)
              </span>
            </div>
          )}
          {/* Filing form UI was here */}
        </div>

        {/* Horizontal Timeline (Wave UI) */}
        <div className="relative pt-12 pb-8 overflow-x-auto no-scrollbar">
          <div className="absolute top-[72px] left-0 right-0 h-1 bg-[var(--eai-border)]" />
          <div className="flex justify-between relative min-w-[800px] px-8">
            {STAGES.map((stage, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = index === currentIndex;
              const deadline = getStageDeadline(stage.key);

              return (
                <div key={stage.key} className="flex flex-col items-center relative z-10 w-24">
                  {/* The Wave Icon */}
                  <div
                    className={`h-10 w-10 flex items-center justify-center rounded-full border-4 transition-all duration-500 scale-100 mb-4 ${isCurrent
                      ? 'border-[var(--eai-primary)] bg-[var(--eai-surface)] text-[var(--eai-primary)] shadow-lg shadow-[var(--eai-primary)]/20'
                      : isCompleted
                        ? 'border-[#34C759] bg-[#34C759] text-white'
                        : 'border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-muted)]'
                      }`}
                  >
                    {isCompleted ? <CheckCircle weight="bold" size={18} /> : <stage.icon size={18} />}
                  </div>

                  {/* Stage Label */}
                  <div className={`text-[10px] font-black tracking-tighter text-center line-clamp-2 ${isCurrent ? 'text-[var(--eai-primary)]' : 'text-[var(--eai-muted)]'}`}>
                    {stage.label}
                  </div>

                  {/* Deadline Indicator */}
                  {deadline && isCurrent && (
                    <div className={`absolute -top-10 whitespace-nowrap text-[10px] font-bold px-2 py-1 bg-[var(--eai-surface)] border border-current rounded-sm ${getUrgencyColor(deadline)}`}>
                      {new Date(deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Stage Cards (Vertical) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isNext = index === currentIndex + 1;
            
            // Show the stage if it's completed, current, or the immediate next one
            if (!isCurrent && !isCompleted && !isNext) return null;

            const Icon = stage.icon;
            const deadline = getStageDeadline(stage.key);

            return (
              <div
                key={stage.key}
                className={`p-4 border-2 transition-all ${isCurrent
                  ? 'border-[var(--eai-primary)] bg-[var(--eai-surface)] shadow-md'
                  : isCompleted
                    ? 'border-[#34C759]/20 bg-[var(--eai-bg)]/30'
                    : 'border-dashed border-[var(--eai-border)] opacity-60'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`h-8 w-8 flex items-center justify-center ${isCompleted ? 'text-[#34C759]' : 'text-[var(--eai-primary)]'}`}>
                    {isCompleted ? <CheckCircle size={20} weight="bold" /> : <Icon size={20} />}
                  </div>
                  {(isCurrent || (isNext && isEditable)) && (
                    <Button
                      onClick={() => isCurrent ? handleAdvanceClick() : onStageChange(stage.key)}
                      disabled={isAdvancing}
                      className="apple-button-primary h-7 px-3 text-[10px]"
                    >
                      {isAdvancing ? '...' : (isCurrent ? (stage.actionLabel || 'Next Stage') : `Start ${stage.label}`)}
                    </Button>
                  )}
                </div>

                <div className={`text-[13px] font-bold ${isCurrent ? 'text-[var(--eai-text)]' : 'text-[var(--eai-text-secondary)]'}`}>
                  {stage.label}
                </div>
                <div className="text-[11px] text-[var(--eai-text-secondary)] mt-1">
                  {stage.description}
                </div>

                {deadline && (isCurrent || isCompleted) && (
                  <div className={`text-[11px] mt-2 font-bold flex items-center gap-1 ${getUrgencyColor(deadline)}`}>
                    <Calendar size={12} />
                    {new Date(deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Special Actions */}
        <div className="mt-8 border-t border-[var(--eai-border)] pt-6">
          <h4 className="text-[12px] font-black tracking-widest text-[var(--eai-text-secondary)] mb-4">Special Actions & Exceptions</h4>
          <div className="flex flex-wrap gap-2">
             {SPECIAL_ACTIONS.map((action, index) => {
                const colorClasses = [
                  'bg-[#FF9500]/10 border-[#FF9500]/30 text-[#FF9500] hover:bg-[#FF9500]/20', // Orange for Office Action
                  'bg-[#34C759]/10 border-[#34C759]/30 text-[#34C759] hover:bg-[#34C759]/20', // Green for Renewal
                  'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30] hover:bg-[#FF3B30]/20'  // Red for Withdraw
                ];
                return (
                  <button
                    key={action.key}
                    onClick={() => onStageChange(action.key)}
                    className={`flex items-center gap-2 px-4 py-2 border text-[12px] font-bold transition-colors ${colorClasses[index]}`}
                  >
                    <action.icon size={16} />
                    {action.label}
                  </button>
                );
             })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
