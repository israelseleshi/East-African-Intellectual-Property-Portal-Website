import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CaretLeft } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function CaseFlowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { dialog: confirmDialog } = useConfirm();
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
        type: 'error'
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
        type: 'success'
      });
      await loadCase();
    } catch (_e) {
      const err = _e as { response?: { data?: { error?: string; details?: string } } };
      addToast({
        title: 'Failed to update stage',
        description: err?.response?.data?.error || err?.response?.data?.details || 'Please try again',
        type: 'error'
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
        type: 'info'
      });

      // 1. Fetch EIPA form data for this case
      const fullCaseData = await api.get(`/cases/${id}`);

      // 2. Prepare data for filling
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

      // 3. Fill the PDF
      const pdfUrl = '/application_form.pdf';
      const pdfBytes = await fillPdfForm(pdfUrl, fillData, true);

      // 4. Download it
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
        type: 'success'
      });
    } catch (error) {
      console.error('PDF Fill error:', error);
      addToast({
        title: 'Download Failed',
        description: 'Could not generate the filled form.',
        type: 'error'
      });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Case Flow...</div>;
  if (!caseData) return <div className="p-8 text-center text-red-500">Case not found</div>;

  // Transform backend deadlines to component format
  // The component expects a flat object of deadlines
  // In a real app, you might need a mapping function here if the API returns an array
  // For now, assuming we can derive displayable deadlines from the deadlines table or latest history
  // Simplified: passing empty object as we rely on the component's internal logic or needing to fetch deadlines separately
  // TODO: Fetch deadlines endpoint and pass here. For now, rely on stage tracker's visual state.
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
      {confirmDialog}
      <header className="flex items-center gap-4">
        <button
          onClick={() => navigate('/trademarks')}
          className="flex h-10 w-10 items-center justify-center rounded-none border border-[var(--eai-border)] bg-[var(--eai-surface)] text-[var(--eai-text-secondary)] hover:bg-[var(--eai-bg)]"
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[var(--eai-text)]">
            Case Lifecycle Management
          </h1>
          <p className="text-[14px] text-[var(--eai-text-secondary)] mt-1">
            {caseData.mark_name} ({caseData.filing_number || 'Pending'})
          </p>
        </div>
      </header>

      {/* Info Card */}
      <Card className="apple-card border-l-4 border-l-[var(--eai-primary)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center bg-[var(--eai-primary)]/10 text-[var(--eai-primary)]">
                <span className="text-[20px] font-bold">TM</span>
              </div>
              <div>
                <div className="text-[16px] font-bold text-[var(--eai-text)]">
                  {caseData.mark_name}
                </div>
                <div className="text-[13px] text-[var(--eai-text-secondary)]">
                  Client: {caseData.client_name} • Jurisdiction: {caseData.jurisdiction === 'ET' ? 'Ethiopia' : 'Kenya'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold tracking-widest text-[var(--eai-text-secondary)]">Current status</div>
              <div className="text-[18px] font-black text-[var(--eai-primary)]">{currentStage.replace(/_/g, ' ')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Tracker */}
      <CaseStageTracker
        currentStage={currentStage}
        jurisdiction={caseData.jurisdiction}
        deadlines={deadlines}
        onStageChange={handleStageChange}
        onDownloadForm={handleDownloadForm}
        isEditable={true}
      />

      {/* History Log */}
      <Card className="apple-card">
        <CardHeader>
          <CardTitle className="text-[16px] font-bold tracking-tight">
            Lifecycle Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {caseData.history?.map((entry, index) => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-[var(--eai-primary)] mt-2" />
                  {index < (caseData.history?.length ?? 0) - 1 && (
                    <div className="h-full w-px bg-[var(--eai-border)] my-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[var(--eai-text)]">
                      {entry.action}
                    </span>
                    <span className="text-[11px] text-[var(--eai-text-secondary)]">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  {entry.new_data && (
                    <div className="text-[12px] text-[var(--eai-text-secondary)] font-mono mt-1">
                      {/* Simplified data view */}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!caseData.history || caseData.history.length === 0) && (
              <div className="text-center py-4 text-[var(--eai-muted)]">No history recorded yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Case Notes */}
      {id && (
        <Card className="apple-card">
          <CardHeader>
            <CardTitle className="text-[16px] font-bold tracking-tight">
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
