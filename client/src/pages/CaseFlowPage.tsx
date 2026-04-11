import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold tracking-tight">
            Lifecycle Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {caseData.history?.map((entry, index) => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  {index < (caseData.history?.length ?? 0) - 1 && (
                    <div className="h-full w-px bg-border my-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {entry.action}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  {entry.new_data && (
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!caseData.history || caseData.history.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">No history recorded yet.</div>
            )}
          </div>
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