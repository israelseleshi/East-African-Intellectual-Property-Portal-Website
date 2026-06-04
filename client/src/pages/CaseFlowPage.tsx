import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Typography } from '@/components/ui/typography';
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
  Clock,
  Briefcase
} from '@phosphor-icons/react';
import CaseStageTracker from '@/components/CaseStageTracker';
import { trademarkService } from '@/utils/api';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { CaseNotesTab } from '@/components/CaseNotesTab';
import { useApi } from '@/hooks/useApi';
import { fillPdfForm } from '@/utils/pdfUtils';
import { cn } from '@/lib/utils';
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
  SO: 'Somalia', TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', BI: 'Burundi', SD: 'Sudan', SS: 'South Sudan',
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

      const resolvedImage = fullCaseData.mark_image || fullCaseData.markImage || ''

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
        mark_image: resolvedImage,
        image_field: resolvedImage,
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
    <div className="space-y-8 p-10 max-w-7xl mx-auto animate-in fade-in duration-700">
      <header className="flex items-center gap-6">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => navigate('/trademarks')}
          className="rounded-full h-12 w-12 border-border shadow-sm hover:shadow-md transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={22} weight="bold" />
        </Button>
        <div>
          <Typography.h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            Case Lifecycle
            <Badge variant="outline" className="ml-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
              Management
            </Badge>
          </Typography.h1>
          <div className="flex items-center gap-2 mt-1.5">
            <Typography.muted className="text-base font-medium">
              {caseData.mark_name}
            </Typography.muted>
            <Separator orientation="vertical" className="h-3 mx-1" />
            <span className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded text-muted-foreground">
              {caseData.filing_number || 'REGISTRATION PENDING'}
            </span>
          </div>
        </div>
      </header>

      <Card className="border-none shadow-premium rounded-3xl overflow-hidden bg-white/50 backdrop-blur-sm group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner transition-transform group-hover:scale-110 duration-500">
                <Briefcase size={32} weight="duotone" />
              </div>
              <div>
                <Typography.h3 className="text-xl font-black tracking-tight">
                  {caseData.mark_name}
                </Typography.h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User size={16} weight="duotone" className="text-primary" />
                    {caseData.client_name}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin size={16} weight="duotone" className="text-primary" />
                    {JURISDICTION_NAMES[caseData.jurisdiction] || caseData.jurisdiction}
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-auto p-4 md:p-6 bg-muted/30 rounded-2xl border border-border/50 text-right">
              <div className="text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase mb-1">Current Lifecycle Status</div>
              <div className="text-2xl font-black text-primary drop-shadow-sm">
                {currentStage.replace(/_/g, ' ')}
              </div>
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

      <Card className="shadow-premium border-none rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-muted/30 border-b border-border/50 py-6 px-8">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-3">
              <ClockClockwise size={24} weight="duotone" className="text-primary" />
              Lifecycle Audit Log
            </CardTitle>
            <Badge variant="secondary" className="px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider">
              {caseData.history?.length || 0} Events Logged
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="p-10">
              {caseData.history && caseData.history.length > 0 ? (
                <div className="relative space-y-0">
                  {/* Vertical Timeline line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-primary/20 via-border to-transparent" />
                  
                  {caseData.history.map((entry, index) => {
                    const date = new Date(entry.created_at);
                    const isNewest = index === 0;
                    
                    return (
                      <div key={entry.id} className="relative pl-14 pb-12 group last:pb-0">
                        {/* Timeline dot */}
                        <div className={cn(
                          "absolute left-0 top-1 h-10 w-10 rounded-xl border-4 flex items-center justify-center z-10 transition-all duration-500",
                          isNewest 
                            ? "bg-primary border-primary/20 text-white shadow-lg shadow-primary/30 scale-110" 
                            : "bg-white border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary"
                        )}>
                          {entry.action.includes('FILE') ? <CloudArrowUp size={18} weight="duotone" /> : 
                           entry.action.includes('SUBMIT') ? <ShieldCheck size={18} weight="duotone" /> :
                           entry.action.includes('UPDATE') ? <FileText size={18} weight="duotone" /> :
                           <CheckCircle size={18} weight="duotone" />}
                        </div>
                        
                        <div className={cn(
                          "p-6 rounded-2xl border transition-all duration-300",
                          isNewest 
                            ? "bg-primary/5 border-primary/20 shadow-sm" 
                            : "bg-white border-border/50 hover:border-primary/30 hover:shadow-md"
                        )}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                              <h4 className={cn(
                                "text-sm font-black uppercase tracking-widest",
                                isNewest ? "text-primary" : "text-foreground"
                              )}>
                                {entry.action.replace(/_/g, ' ')}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1 font-medium">
                                Action recorded on systemic ledger
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full border border-border/30 shadow-sm">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={14} weight="duotone" className="text-primary" />
                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <Separator orientation="vertical" className="h-3" />
                              <div className="flex items-center gap-1.5">
                                <Clock size={14} weight="duotone" className="text-primary" />
                                {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          
                          {entry.new_data && (
                            <div className="mt-4 pt-4 border-t border-border/50">
                              <div className="flex flex-wrap gap-2">
                                {(() => {
                                  let data = entry.new_data;
                                  if (typeof data === 'string') {
                                    try {
                                      data = JSON.parse(data);
                                    } catch (e) {
                                      return <span className="text-xs text-muted-foreground">{String(data)}</span>;
                                    }
                                  }
                                  
                                  if (typeof data !== 'object' || data === null) return null;

                                  return Object.entries(data).map(([key, val]) => {
                                    if (!val || key === 'deadlines') return null;
                                    
                                    let displayVal = val;
                                    if (typeof val === 'object' && val !== null) {
                                      displayVal = JSON.stringify(val);
                                    }

                                    return (
                                      <div key={key} className="flex items-center gap-2 bg-muted/40 border border-border/50 px-3 py-1.5 rounded-lg text-[11px] group/item transition-colors hover:bg-white hover:border-primary/20">
                                        <span className="font-black text-muted-foreground uppercase tracking-tighter">{key.replace(/_/g, ' ')}:</span>
                                        <span className="font-bold text-foreground truncate max-w-[250px]">{String(displayVal)}</span>
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
                <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/10 rounded-3xl border border-dashed border-border">
                  <Archive size={64} weight="duotone" className="text-muted-foreground/20 mb-6" />
                  <Typography.h3 className="text-muted-foreground">No history recorded yet</Typography.h3>
                  <Typography.muted>The lifecycle of this case is currently in its initial phase.</Typography.muted>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {id && (
        <Card className="shadow-premium border-none rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-muted/30 border-b border-border/50 py-6 px-8">
            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-3">
              <FileText size={24} weight="duotone" className="text-primary" />
              Case Notes & Communications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <CaseNotesTab caseId={id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
