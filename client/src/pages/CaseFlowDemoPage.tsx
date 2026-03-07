import { useState } from 'react';
import { Play, ArrowClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CaseStageTracker from '@/components/CaseStageTracker';
import type { CaseFlowStage, Jurisdiction } from '@/shared/database';

// Demo case that simulates progressing through all 10 stages
const DEMO_CASE = {
  id: 'demo-case-001',
  mark_name: 'DEMO: Abebe Bekele Trademark',
  jurisdiction: 'ET' as Jurisdiction,
  client_name: 'Abebe Bekele'
};

export default function CaseFlowDemoPage() {
  const [currentStage, setCurrentStage] = useState<CaseFlowStage>('DATA_COLLECTION');
  const [deadlines, setDeadlines] = useState({
    formal_exam_deadline: undefined as string | undefined,
    opposition_period_end: undefined as string | undefined,
    certificate_requested_date: undefined as string | undefined,
    certificate_issued_date: undefined as string | undefined,
    renewal_due_date: undefined as string | undefined,
    renewal_on_time_deadline: undefined as string | undefined,
    renewal_penalty_deadline: undefined as string | undefined,
  });
  const [stageHistory, setStageHistory] = useState<Array<{stage: CaseFlowStage, date: string, deadlines: Record<string, string | undefined>}>>([
    { stage: 'DATA_COLLECTION', date: new Date().toISOString(), deadlines: {} }
  ]);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleStageChange = async (newStage: CaseFlowStage) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const now = new Date();
    const newDeadlines = { ...deadlines };
    
    // Calculate deadlines based on new stage
    switch (newStage) {
      case 'FILED': {
        const formalDeadline = new Date(now);
        formalDeadline.setDate(formalDeadline.getDate() + 30);
        newDeadlines.formal_exam_deadline = formalDeadline.toISOString();
        break;
      }
        
      case 'FORMAL_EXAM': {
        const formalRespDeadline = new Date(now);
        formalRespDeadline.setDate(formalRespDeadline.getDate() + 30);
        newDeadlines.formal_exam_deadline = formalRespDeadline.toISOString();
        break;
      }
        
      case 'PUBLISHED': {
        const oppDeadline = new Date(now);
        oppDeadline.setDate(oppDeadline.getDate() + 60); // Ethiopia: 60 days
        newDeadlines.opposition_period_end = oppDeadline.toISOString();
        
        const certReqDeadline = new Date(now);
        certReqDeadline.setDate(certReqDeadline.getDate() + 20);
        newDeadlines.certificate_requested_date = certReqDeadline.toISOString();
        break;
      }
        
      case 'CERTIFICATE_REQUEST': {
        const certIssuedExpected = new Date(now);
        certIssuedExpected.setDate(certIssuedExpected.getDate() + 30);
        break;
      }
        
      case 'CERTIFICATE_ISSUED':
        newDeadlines.certificate_issued_date = now.toISOString();
        break;
        
      case 'REGISTERED': {
        const renewalDate = new Date(now);
        renewalDate.setFullYear(renewalDate.getFullYear() + 7);
        newDeadlines.renewal_due_date = renewalDate.toISOString();
        break;
      }
        
      case 'RENEWAL_DUE': {
        const onTimeDeadline = new Date(now);
        onTimeDeadline.setDate(onTimeDeadline.getDate() + 30);
        newDeadlines.renewal_on_time_deadline = onTimeDeadline.toISOString();
        
        const penaltyDeadline = new Date(now);
        penaltyDeadline.setDate(penaltyDeadline.getDate() + 180);
        newDeadlines.renewal_penalty_deadline = penaltyDeadline.toISOString();
        break;
      }
    }
    
    setCurrentStage(newStage);
    setDeadlines(newDeadlines);
    setStageHistory(prev => [...prev, { 
      stage: newStage, 
      date: now.toISOString(),
      deadlines: { ...newDeadlines }
    }]);
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    resetDemo();
    
    const stages: CaseFlowStage[] = [
      'DATA_COLLECTION',
      'READY_TO_FILE',
      'FILED',
      'FORMAL_EXAM',
      'SUBSTANTIVE_EXAM',
      'PUBLISHED',
      'CERTIFICATE_REQUEST',
      'CERTIFICATE_ISSUED',
      'REGISTERED',
      'RENEWAL_DUE'
    ];
    
    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await handleStageChange(stage);
    }
    
    setIsSimulating(false);
  };

  const resetDemo = () => {
    setCurrentStage('DATA_COLLECTION');
    setDeadlines({
      formal_exam_deadline: undefined,
      opposition_period_end: undefined,
      certificate_requested_date: undefined,
      certificate_issued_date: undefined,
      renewal_due_date: undefined,
      renewal_on_time_deadline: undefined,
      renewal_penalty_deadline: undefined,
    });
    setStageHistory([{ stage: 'DATA_COLLECTION', date: new Date().toISOString(), deadlines: {} }]);
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[var(--eai-text)]">
            Case Flow Demo
          </h1>
          <p className="text-[14px] text-[var(--eai-text-secondary)] mt-1">
            Simulating all 10 stages of the trademark lifecycle
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runSimulation}
            disabled={isSimulating}
            className="apple-button-primary flex items-center gap-2"
          >
            <Play size={18} weight="fill" />
            {isSimulating ? 'Simulating...' : 'Run Auto Simulation'}
          </Button>
          <Button
            onClick={resetDemo}
            disabled={isSimulating}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowClockwise size={18} />
            Reset
          </Button>
        </div>
      </header>

      {/* Demo Info Card */}
      <Card className="apple-card border-l-4 border-l-[var(--eai-primary)]">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center bg-[var(--eai-primary)]/10 text-[var(--eai-primary)]">
              <span className="text-[20px] font-bold">TM</span>
            </div>
            <div>
              <div className="text-[16px] font-bold text-[var(--eai-text)]">
                {DEMO_CASE.mark_name}
              </div>
              <div className="text-[13px] text-[var(--eai-text-secondary)]">
                Client: {DEMO_CASE.client_name} • Jurisdiction: Ethiopia (ET)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Stage Tracker */}
      <CaseStageTracker
        currentStage={currentStage}
        jurisdiction={DEMO_CASE.jurisdiction}
        deadlines={deadlines}
        onStageChange={handleStageChange}
        isEditable={!isSimulating}
      />

      {/* Stage History Timeline */}
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="text-[16px] font-bold tracking-tight">
            Stage History Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stageHistory.map((entry, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-6 w-6 items-center justify-center bg-[var(--eai-primary)] text-white text-[11px] font-bold">
                    {index + 1}
                  </div>
                  {index < stageHistory.length - 1 && (
                    <div className="h-8 w-px bg-[var(--eai-border)]" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[var(--eai-text)]">
                      {entry.stage.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-[var(--eai-text-secondary)]">
                      {new Date(entry.date).toLocaleString()}
                    </span>
                  </div>
                  {Object.entries(entry.deadlines).filter(([, v]) => v).length > 0 && (
                    <div className="mt-1 text-[12px] text-[var(--eai-text-secondary)]">
                      Deadlines calculated: {Object.entries(entry.deadlines).filter(([, v]) => v).map(([k]) => k.replace(/_/g, ' ')).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="apple-card bg-[var(--eai-bg)]/50">
        <CardContent className="p-4">
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[var(--eai-text-secondary)] mb-3">
            Stage Legend
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-[var(--eai-primary)]" />
              <span>Current Stage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-[#34C759]" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#FF3B30] font-bold">RED</span>
              <span>Critical (≤7 days)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#FF9500] font-bold">ORANGE</span>
              <span>Warning (≤30 days)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
