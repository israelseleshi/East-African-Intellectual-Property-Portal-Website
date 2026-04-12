import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api, trademarkService } from '../utils/api';
import { useToast } from '../components/ui/toast';
import { Typography } from '@/components/ui/typography';
import {
  RefreshCcw,
  Briefcase,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Eye,
  Settings,
  Download,
  XCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { useFormAutomation } from '../hooks/useFormAutomation';
import { FormHeader } from './FormAutomation/components/FormHeader';
import { PdfPreviewPanel } from './FormAutomation/components/PdfPreviewPanel';
import { JurisdictionSpecificFields } from './FormAutomation/components/JurisdictionSpecificFields';
import { fillPdfForm } from '../utils/pdfUtils';

export default function FormInspectorPage() {
  const { toast: addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    formType,
    formData,
    setFormData,
    clients,
    selectedClientId,
    setSelectedClientId,
    isSubmitting,
    setIsSubmitting,
    availableFields,
    showFields,
    setShowFields,
    niceClasses,
    setNiceClasses,
    markImageBase64,
    setMarkImageBase64,
    markImageFile,
    setMarkImageFile,
    previewUrl,
    previewLoading,
    previewError,
    zoom,
    setZoom,
    showPreview,
    setShowPreview,
    generatePreview
  } = useFormAutomation();

  const uniqueDetectedFields = useMemo(() => Array.from(new Set(availableFields)).sort(), [availableFields]);
  
  const caseId = searchParams.get('caseId');
  
  useEffect(() => {
    if (caseId && formType === 'RENEWAL') {
      const loadCaseData = async () => {
        try {
          const caseData = await trademarkService.getCase(caseId) as any;
          if (caseData) {
            setSelectedClientId(caseData.client_id || caseData.client?.id || '');
            
            const eipaForm = caseData.eipaForm || {};
            const newFormData: Record<string, any> = {};
            
            Object.entries(eipaForm).forEach(([key, value]) => {
              if (
                key.startsWith('renewal_') ||
                key.startsWith('applicant_') ||
                key.startsWith('agent_') ||
                key.startsWith('address_') ||
                key.startsWith('nationality') ||
                key.startsWith('residence_') ||
                key.startsWith('city_') ||
                key.startsWith('state_') ||
                key.startsWith('zip_') ||
                key === 'wereda' ||
                key.startsWith('house_') ||
                key.startsWith('telephone') ||
                key === 'email' ||
                key === 'fax' ||
                key.startsWith('po_box') ||
                key.startsWith('chk_')
              ) {
                newFormData[key] = value;
              }
            });
            
            newFormData.renewal_app_no = caseData.filing_number || eipaForm.renewal_app_no || '';
            newFormData.renewal_reg_no = caseData.certificate_number || eipaForm.renewal_reg_no || '';
            newFormData.renewal_reg_date = caseData.registration_dt || eipaForm.renewal_reg_date || '';
            newFormData.mark_description = caseData.mark_name || eipaForm.mark_description || '';
            newFormData.mark_name = caseData.mark_name || '';
            newFormData.mark_image = caseData.mark_image || '';
            newFormData.markImage = caseData.mark_image || '';
            newFormData.mark_type = caseData.mark_type || eipaForm.mark_type || '';
            
            setFormData(prev => ({ ...prev, ...newFormData }));
            
            if (caseData.niceClasses) {
              setNiceClasses(caseData.niceClasses.map((c: number) => ({ classNo: c, description: '' })));
            }
            
            if (caseData.mark_image) {
              setMarkImageBase64(caseData.mark_image);
            }
          }
        } catch (error) {
          console.error('Failed to load case data:', error);
          addToast({
            title: 'Error',
            description: 'Failed to load case data for renewal',
            variant: 'destructive'
          });
        }
      };
      loadCaseData();
    }
  }, [caseId, formType]);

  const expectedTags = useMemo(() => {
    const keys = Object.keys(formData || {});

    // Keep the inspection panel readable by filtering to the active template's expected keys.
    if (formType === 'RENEWAL') {
      return keys.filter((k) => k.startsWith('renewal_') || k.startsWith('agent_')).sort();
    }

    // APPLICATION: include agent_ keys too since we track them in state
    return keys.filter((k) => !k.startsWith('renewal_')).sort();
  }, [formData, formType]);
  const missingTags = useMemo(() => {
    const detected = new Set(uniqueDetectedFields.map((f) => f.trim()));
    return expectedTags.filter((k) => !detected.has(k.trim()));
  }, [expectedTags, uniqueDetectedFields]);
  const unknownPdfTags = useMemo(() => {
    const expected = new Set(expectedTags.map((k) => k.trim()));
    return uniqueDetectedFields.filter((f) => !expected.has(f.trim()));
  }, [expectedTags, uniqueDetectedFields]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let uploadedMarkImagePath: string | null = markImageBase64;

      if (markImageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', markImageFile);
        uploadFormData.append('type', 'LOGO');

        const uploadResponse = await api.post('/documents/upload', uploadFormData);
        const filePath = uploadResponse?.data?.filePath;
        uploadedMarkImagePath = typeof filePath === 'string' ? filePath : null;
      }

      const normalizedFormData: Record<string, unknown> = { ...formData };
      if (
        typeof normalizedFormData.renewal_mark_logo === 'string'
        && normalizedFormData.renewal_mark_logo.startsWith('data:')
      ) {
        normalizedFormData.renewal_mark_logo = uploadedMarkImagePath || '';
      }

      const caseIdParam = searchParams.get('caseId');

      if (caseIdParam && formType === 'RENEWAL') {
        const renewalPayload = {
          renewal_app_no: normalizedFormData.renewal_app_no as string || undefined,
          renewal_reg_no: normalizedFormData.renewal_reg_no as string || undefined,
          renewal_reg_date: normalizedFormData.renewal_reg_date as string || undefined,
          renewal_sign_day: normalizedFormData.renewal_sign_day as string || undefined,
          renewal_sign_month: normalizedFormData.renewal_sign_month as string || undefined,
          renewal_sign_year: normalizedFormData.renewal_sign_year as string || undefined,
          remark: normalizedFormData.remark as string || undefined,
          clientInstructions: normalizedFormData.clientInstructions as string || undefined,
        };

        const response = await trademarkService.initiateRenewal(caseIdParam, renewalPayload) as { success?: boolean; message?: string };
        
        addToast({
          title: 'Success',
          description: response?.message || 'Renewal initiated successfully.',
        });
        navigate(`/trademarks/${caseIdParam}`);
      } else {
        const payload = {
          ...normalizedFormData,
          niceClasses,
          markImage: uploadedMarkImagePath,
          clientId: selectedClientId,
          status: formType === 'RENEWAL' ? 'RENEWAL' : 'DRAFT',
          flowStage: formType === 'RENEWAL' ? 'RENEWAL_DUE' : 'DATA_COLLECTION',
        };

        const response = await trademarkService.createCase(payload) as { id?: string; data?: { id?: string } };
        
        const newCaseId = response?.id || response?.data?.id;
        if (!newCaseId) {
          throw new Error('Case was created but no case id was returned by the API.');
        }

        addToast({
          title: 'Success',
          description: 'Trademark case created successfully.',
        });
        navigate(`/trademarks/${newCaseId}`);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create case',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
      // Pass true to flatten the PDF and make it non-editable
      const pdfBytes = await fillPdfForm(pdfFile, formData as unknown as Record<string, unknown>, true);

      if (pdfBytes) {
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = formType === 'RENEWAL' ? 'renewal_form.pdf' : 'application_form.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
      addToast({
        title: 'Download Failed',
        description: 'Could not generate the downloadable PDF.',
        variant: 'destructive'
      });
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        // Application fields
        applicant_name_english: selectedClient.name,
        applicant_name_amharic: selectedClient.local_name || '',
        address_street: selectedClient.address_street || '',
        address_zone: selectedClient.address_zone || '',
        wereda: selectedClient.wereda || '',
        city_name: selectedClient.city || '',
        city_code: (selectedClient as any).city_code || '',
        state_name: (selectedClient as any).state_name || '',
        state_code: (selectedClient as any).state_code || '',
        house_no: selectedClient.house_no || '',
        zip_code: selectedClient.zip_code || '',
        telephone: selectedClient.telephone || '',
        email: selectedClient.email || '',
        fax: selectedClient.fax || '',
        nationality: selectedClient.nationality || '',
        residence_country: selectedClient.residence_country || '',
        po_box: selectedClient.po_box || '',
        chk_company: selectedClient.type === 'COMPANY',
        chk_male: selectedClient.type === 'INDIVIDUAL',
        chk_female: false,

        // Renewal fields
        renewal_applicant_name: selectedClient.name,
        renewal_applicant_name_amharic: selectedClient.local_name || '',
        renewal_address_street: selectedClient.address_street || '',
        renewal_address_zone: selectedClient.address_zone || '',
        renewal_city_name: selectedClient.city || '',
        renewal_city_code: (selectedClient as any).city_code || '',
        renewal_state_name: (selectedClient as any).state_name || '',
        renewal_state_code: (selectedClient as any).state_code || '',
        renewal_zip_code: selectedClient.zip_code || '',
        renewal_wereda: selectedClient.wereda || '',
        renewal_house_no: selectedClient.house_no || '',
        renewal_telephone: selectedClient.telephone || '',
        renewal_email: selectedClient.email || '',
        renewal_fax: selectedClient.fax || '',
        renewal_po_box: selectedClient.po_box || '',
        renewal_nationality: selectedClient.nationality || '',
        renewal_residence_country: selectedClient.residence_country || '',
        renewal_chk_company: selectedClient.type === 'COMPANY',
        renewal_chk_male: selectedClient.type === 'INDIVIDUAL',
        renewal_chk_female: false,

      }));
    }
  };

  return (
    <div className="min-h-screen bg-[#E8E8ED] pb-20">
      <div className="w-full mx-auto pt-8 px-4 md:px-8">

        <FormHeader
          formType={formType}
          isSubmitting={isSubmitting}
          onRefresh={generatePreview}
          onDownload={handleDownloadPdf}
          onToggleFields={() => setShowFields(!showFields)}
          onSubmit={handleSubmit}
          showFields={showFields}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-7 space-y-8 overflow-y-auto" id="form-controls-section">
            <JurisdictionSpecificFields
              formType={formType}
              formData={formData}
              setFormData={setFormData}
              clients={clients}
              selectedClientId={selectedClientId}
              onClientChange={handleClientSelect}
              onNiceClassesChange={setNiceClasses}
              niceClasses={niceClasses}
              markImageBase64={markImageBase64}
              onImageChange={setMarkImageBase64}
              onImageFileChange={setMarkImageFile}
              showFields={showFields}
              availableFields={availableFields}
            />
          </div>

          {/* Right Column: Live Preview */}
          <div className="lg:col-span-5 h-full">
            <PdfPreviewPanel
              showPreview={showPreview}
              previewLoading={previewLoading}
              previewError={previewError}
              previewUrl={previewUrl}
              zoom={zoom}
              onZoomIn={() => setZoom(prev => Math.min(prev + 0.1, 2))}
              onZoomOut={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
              onResetZoom={() => setZoom(1)}
              onTogglePreview={() => setShowPreview(!showPreview)}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFields && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-[var(--eai-surface)]/95 backdrop-blur-xl border border-[var(--eai-border)] rounded-3xl shadow-2xl z-50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <Typography.h3a className="flex items-center gap-2 text-[var(--eai-text)]">
                <Settings className="text-[var(--eai-primary)]" size={20} />
                PDF Field Tags Inspection
              </Typography.h3a>
              <button onClick={() => setShowFields(false)} className="text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]">
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-[var(--eai-text-secondary)]">
              <span className="px-2 py-1 rounded-lg border border-[var(--eai-border)] bg-[var(--eai-bg)]">
                Detected in PDF: <span className="font-bold text-[var(--eai-text)]">{uniqueDetectedFields.length}</span>
              </span>
              <span className="px-2 py-1 rounded-lg border border-[var(--eai-border)] bg-[var(--eai-bg)]">
                Expected (form model): <span className="font-bold text-[var(--eai-text)]">{expectedTags.length}</span>
              </span>
              <span className="px-2 py-1 rounded-lg border border-[var(--eai-border)] bg-[var(--eai-bg)]">
                Missing from PDF: <span className="font-bold text-[var(--eai-critical)]">{missingTags.length}</span>
              </span>
            </div>

            {/* Agent Section Notice */}
            <div className="mb-3 px-3 py-2 rounded-xl border border-amber-400/30 bg-amber-400/10 text-[11px] text-amber-300 flex items-start gap-2">
              <span className="mt-0.5 text-amber-400">⚠</span>
              <span>
                <strong>Agent Section fields</strong> (Name, Country, City, Sub-City, etc.) are printed on the physical PDF form but are <strong>not interactive AcroForm fields</strong> — they are static text. This is a limitation of the original EIPA PDF template. To make them fillable, the PDF must be edited in Adobe Acrobat Pro to add form fields. The Inspect Tags button only detects interactive AcroForm fields.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[340px] overflow-y-auto custom-scrollbar p-2">
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-widest text-[var(--eai-text-secondary)] opacity-70">Detected PDF Tags</div>
                {uniqueDetectedFields.length === 0 ? (
                  <div className="text-sm text-[var(--eai-text-secondary)] p-2">
                    No tags detected yet. If this persists, click Refresh or ensure the PDF templates are reachable.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {uniqueDetectedFields.map((field) => (
                      <div
                        key={`detected-${field}`}
                        className="px-3 py-2 bg-[var(--eai-bg)] rounded-xl border border-[var(--eai-border)] text-[10px] font-mono truncate hover:border-[var(--eai-primary)] transition-colors cursor-help text-[var(--eai-text-secondary)]"
                        title={field}
                      >
                        {field}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-widest text-[var(--eai-text-secondary)] opacity-70">Missing From PDF</div>
                {missingTags.length === 0 ? (
                  <div className="text-sm text-[var(--eai-text-secondary)] p-2">All form keys exist as PDF fields.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {missingTags.map((field) => (
                      <div
                        key={`missing-${field}`}
                        className="px-3 py-2 bg-[var(--eai-critical)]/10 rounded-xl border border-[var(--eai-critical)]/20 text-[10px] font-mono truncate cursor-help text-[var(--eai-critical)]"
                        title={field}
                      >
                        {field}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-widest text-[var(--eai-text-secondary)] opacity-70">PDF Tags Not Used</div>
                {unknownPdfTags.length === 0 ? (
                  <div className="text-sm text-[var(--eai-text-secondary)] p-2">Every PDF field maps to a form key.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {unknownPdfTags.map((field) => (
                      <div
                        key={`unknown-${field}`}
                        className="px-3 py-2 bg-[var(--eai-warn)]/10 rounded-xl border border-[var(--eai-warn)]/20 text-[10px] font-mono truncate cursor-help text-[var(--eai-text-secondary)]"
                        title={field}
                      >
                        {field}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

