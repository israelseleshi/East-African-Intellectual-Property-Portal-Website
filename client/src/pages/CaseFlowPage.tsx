import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  ClockClockwise, 
  ArrowLeft, 
  User, 
  MapPin, 
  CaretRight,
  ShieldCheck,
  CheckCircle,
  Archive,
  CloudArrowUp,
  Calendar,
  Clock
} from '@phosphor-icons/react';
import CaseStageTracker from '@/components/CaseStageTracker';
import { trademarkService } from '@/utils/api';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { CaseNotesTab } from '@/components/CaseNotesTab';
import { useApi } from '@/hooks/useApi';
import { fillPdfForm } from '@/utils/pdfUtils';
import type { Jurisdiction, CaseFlowStage } from '@/shared/database';

interface CaseHistoryEntry {
  id: string;
  action: string;
  created_at: string;
  new_data?: Record<string, unknown>;
}

interface CaseData {
  id: string;
  mark_name: string;
  filing_number?: string;
  flow_stage: CaseFlowStage;
  jurisdiction: Jurisdiction;
  client_name: string;
  formal_exam_deadline?: string;
  opposition_period_end?: string;
  certificate_requested_date?: string;
  certificate_issued_date?: string;
  renewal_due_date?: string;
  renewal_on_time_deadline?: string;
  renewal_penalty_deadline?: string;
  amendment_deadline?: string;
  next_action_date?: string;
  history?: CaseHistoryEntry[];
}

const JURISDICTION_NAMES: Record<string, string> = {
  ET: 'Ethiopia', KE: 'Kenya', ER: 'Eritrea', DJ: 'Djibouti',
  SO: 'Somalia', TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', BI: 'Burundi',
};

export default function CaseFlowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast: addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [currentStage, setCurrentStage] = useState<CaseFlowStage>('DATA_COLLECTION');
  const [isUpdating, setIsUpdating] = useState(false);
  const api = useApi();

  useEffect(() => {
    loadCase();
  }, [id]);

  const loadCase = async () => {
    if (!id) return;
    try {
      const data = await trademarkService.getCase(id);
      setCaseData(data);
      setCurrentStage(data.flow_stage || 'DATA_COLLECTION');
    } catch (_e) {
      console.error('Failed to load case', _e);
      const err = _e as { response?: { data?: { error?: string } } };
      addToast({
        title: 'Failed to load case',
        description: err?.response?.data?.error || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage: CaseFlowStage, data?: { triggerDate?: string; notes?: string; [key: string]: unknown }) => {
    if (!id || isUpdating) return;

    setIsUpdating(true);
    try {
      const { triggerDate, notes, ...extraData } = data || {};
      const res = await trademarkService.updateFlowStage(id, newStage, triggerDate, notes, extraData);
      addToast({
        title: 'Stage Updated',
        description: res.message,
      });
      await loadCase();
    } catch (_e) {
      const err = _e as { response?: { data?: { error?: string; details?: string } } };
      addToast({
        title: 'Failed to update stage',
        description: err?.response?.data?.error || err?.response?.data?.details || 'Please try again',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadForm = async () => {
    if (!id || !caseData) return;
    try {
      addToast({
        title: 'Generating Form',
        description: 'Preparing your filled PDF...',
      });

      const fullCaseData = await api.get(`/cases/${id}`);

      const fillData = {
        ...fullCaseData,
        applicant_name: fullCaseData.client?.name || fullCaseData.client_name,
        address_street: fullCaseData.client?.addressStreet || fullCaseData.client_address_street,
        city_name: fullCaseData.client?.city || fullCaseData.client_city,
        nationality: fullCaseData.client?.nationality || fullCaseData.client_nationality,
        email: fullCaseData.client?.email || fullCaseData.client_email,
        mark_description: fullCaseData.mark_name || fullCaseData.markName,
        filing_number: fullCaseData.filing_number || fullCaseData.filingNumber,
        registration_no: fullCaseData.registration_no || fullCaseData.registrationNo,
        jurisdiction: fullCaseData.jurisdiction,
      };

      const pdfUrl = '/application_form.pdf';
      const pdfBytes = await fillPdfForm(pdfUrl, fillData, true);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EIPA_FORM_01_${fillData.applicant_name || 'Trademark'}_${id.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast({
        title: 'Download Successful',
        description: 'PDF has been generated and downloaded.',
      });
    } catch (error) {
      console.error('PDF Fill error:', error);
      addToast({
        title: 'Download Failed',
        description: 'Could not generate the filled form.',
      });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Case Flow...</div>;
  if (!caseData) return <div className="p-8 text-center text-red-500">Case not found</div>;

  const deadlines = {
    formal_exam_deadline: caseData.formal_exam_deadline,
    opposition_period_end: caseData.opposition_period_end,
    certificate_requested_date: caseData.certificate_requested_date,
    certificate_issued_date: caseData.certificate_issued_date,
    renewal_due_date: caseData.renewal_due_date,
    renewal_on_time_deadline: caseData.renewal_on_time_deadline,
    renewal_penalty_deadline: caseData.renewal_penalty_deadline,
    amendment_deadline: caseData.amendment_deadline || caseData.next_action_date,
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/trademarks')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Case Lifecycle Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {caseData.mark_name} ({caseData.filing_number || 'Pending'})
          </p>
        </div>
      </header>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center bg-primary/10 text-primary">
                <span className="text-xl font-bold">TM</span>
              </div>
              <div>
                <div className="text-base font-bold">
                  {caseData.mark_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Client: {caseData.client_name} • Jurisdiction: {JURISDICTION_NAMES[caseData.jurisdiction] || caseData.jurisdiction}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold tracking-widest text-muted-foreground">Current status</div>
              <div className="text-lg font-black text-primary">{currentStage.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <CaseStageTracker
        currentStage={currentStage}
        jurisdiction={caseData.jurisdiction}
        deadlines={deadlines}
        onStageChange={handleStageChange}
        onDownloadForm={handleDownloadForm}
        isEditable={true}
      />

      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
              <ClockClockwise size={20} className="text-primary" />
              Lifecycle Audit Log
            </CardTitle>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
              {caseData.history?.length || 0} Entries
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-6">
              {caseData.history && caseData.history.length > 0 ? (
                <div className="relative space-y-0">
                  {/* Vertical Timeline line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                  
                  {caseData.history.map((entry, index) => {
                    const date = new Date(entry.created_at);
                    const isNewest = index === 0;
                    
                    return (
                      <div key={entry.id} className="relative pl-10 pb-8 group last:pb-0">
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-1 h-8 w-8 rounded-full border-4 flex items-center justify-center z-10 transition-colors
                          ${isNewest ? 'bg-primary border-primary/20 text-white shadow-sm' : 'bg-background border-border text-muted-foreground'}
                        `}>
                          {entry.action.includes('FILE') ? <CloudArrowUp size={14} /> : 
                           entry.action.includes('SUBMIT') ? <ShieldCheck size={14} /> :
                           entry.action.includes('UPDATE') ? <FileText size={14} /> :
                           <CheckCircle size={14} />}
                        </div>
                        
                        <div className={`p-4 rounded-xl border transition-all hover:shadow-md
                          ${isNewest ? 'bg-primary/5 border-primary/20 bg-card shadow-sm' : 'bg-background border-border'}
                        `}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <h4 className={`text-sm font-bold uppercase tracking-tight ${isNewest ? 'text-primary' : 'text-foreground'}`}>
                              {entry.action.replace(/_/g, ' ')}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                              <Calendar size={12} />
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              <Separator orientation="vertical" className="h-2" />
                              <Clock size={12} />
                              {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          
                          {entry.new_data && (
                            <div className="mt-3 space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  let data = entry.new_data;
                                  if (typeof data === 'string') {
                                    try {
                                      data = JSON.parse(data);
                                    } catch (e) {
                                      return <span className="text-xs text-muted-foreground">{data}</span>;
                                    }
                                  }
                                  
                                  if (typeof data !== 'object' || data === null) return null;

                                  return Object.entries(data).map(([key, val]) => {
                                    if (!val || key === 'deadlines') return null;
                                    
                                    // Handle nested objects if any (like from the stringified example)
                                    let displayVal = val;
                                    if (typeof val === 'object' && val !== null) {
                                      displayVal = JSON.stringify(val);
                                    }

                                    return (
                                      <div key={key} className="flex items-center gap-1.5 bg-background border border-border px-2 py-1 rounded-md text-[11px]">
                                        <span className="font-bold text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                                        <span className="font-medium truncate max-w-[200px]">{String(displayVal)}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Archive size={48} className="text-muted-foreground/20 mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">No history recorded yet.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold tracking-tight">
              Case Notes & Communications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CaseNotesTab caseId={id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}