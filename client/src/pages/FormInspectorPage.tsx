import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { trademarkService } from '../utils/api';
import { useToast } from '../components/ui/toast';
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
import Joyride, { Step } from 'react-joyride';

import { useFormAutomation } from '../hooks/useFormAutomation';
import { FormHeader } from './FormAutomation/components/FormHeader';
import { PdfPreviewPanel } from './FormAutomation/components/PdfPreviewPanel';
import { JurisdictionSpecificFields } from './FormAutomation/components/JurisdictionSpecificFields';
import { fillPdfForm } from '../utils/pdfUtils';

export default function FormInspectorPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tourParam = searchParams.get('tour');
  const startTour = tourParam === 'true';
  const startJurisdictionTour = tourParam === 'jurisdiction';
  const startFeeTour = tourParam === 'fees';

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
    previewUrl,
    previewLoading,
    previewError,
    zoom,
    setZoom,
    showPreview,
    setShowPreview,
    generatePreview
  } = useFormAutomation();

  const tourSteps: Step[] = [
    {
      target: '#form-controls-section',
      content: 'Welcome to EIPA Form Automation! This tool helps you generate professional trademark applications for Ethiopia.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#applicant-section',
      content: "Section I: Enter the applicant's full legal name and type. For Ethiopian filings, use the company name as registered with the Ministry of Trade.",
      placement: 'right' as const,
    },
    {
      target: '#address-section',
      content: 'Section II: Enter the complete address. For Ethiopia: include Subcity (e.g., Bole), Wereda (district), and House Number.',
      placement: 'right' as const,
    },
    {
      target: '#contact-section',
      content: 'Section III: Provide valid contact details. The email will be used for official correspondence from EIPA.',
      placement: 'right' as const,
    },
    {
      target: '#mark-specification-section',
      content: 'Section IV: Define your trademark. Select mark type (Goods, Service, or Collective), mark form (Word, Figurative, Mixed, or 3D), and provide a detailed description.',
      placement: 'right' as const,
    },
    {
      target: '#nice-classification',
      content: 'Nice Classification: Select relevant international classes for your goods/services. You can select multiple classes.',
      placement: 'right' as const,
    },
    {
      target: '#goods-services',
      content: 'List specific goods/services for each selected Nice class. Be precise as this defines your trademark protection scope.',
      placement: 'right' as const,
    },
    {
      target: '#priority-section',
      content: 'Section V: Priority Claims. If filing within 6 months of a first filing in another country, claim priority here.',
      placement: 'right' as const,
    },
    {
      target: '#checklist-section',
      content: 'Section VII: Document Checklist. Verify all required documents: Power of Attorney, Payment Proof, 3 copies of mark, and Priority docs if applicable.',
      placement: 'right' as const,
    },
    {
      target: '#inspect-tags-button',
      content: 'Advanced Feature: Inspect PDF field tags for troubleshooting or when working with custom PDF templates.',
      placement: 'bottom' as const,
    },
    {
      target: '#download-pdf-button',
      content: 'Download: Save the completed PDF for printing, signing, and physical submission to EIPA.',
      placement: 'bottom' as const,
    },
    {
      target: '#submit-button',
      content: 'Submit: Save the trademark to your docket and create a case record for tracking throughout the registration process.',
      placement: 'bottom' as const,
    },
  ];

  const jurisdictionTourSteps: Step[] = [
    {
      target: '#jurisdiction-info-card',
      content: 'Welcome to Jurisdiction Management! This tour explains how jurisdiction rules affect deadlines, fees, and filing requirements.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#address-section',
      content: 'Ethiopia (ET): 60-day opposition period, 7-year renewal, ETB currency. Required fields: Subcity, Wereda, House Number.',
      placement: 'right' as const,
    },
    {
      target: '#nationality-field',
      content: 'Kenya (KE): 60-day opposition period, 10-year renewal, KES currency. Different address format required.',
      placement: 'top' as const,
    },
    {
      target: '#submit-button',
      content: 'When you submit, the system automatically calculates deadlines based on the selected jurisdiction rules.',
      placement: 'bottom' as const,
    },
  ];

  const feeCalculatorTourSteps: Step[] = [
    {
      target: '#fee-estimate-card',
      content: 'Welcome to the Fee Calculator! This shows estimated costs by jurisdiction and case stage.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '#address-section',
      content: 'Official Fees (Government): Filing fees, publication fees, registration fees - vary by jurisdiction.',
      placement: 'right' as const,
    },
    {
      target: '#mark-specification-section',
      content: 'Professional Fees: Your legal service charges. Multi-class applications incur additional fees per class.',
      placement: 'right' as const,
    },
    {
      target: '#submit-button',
      content: 'Total estimate combines Official + Professional fees. Use this for client quotes.',
      placement: 'bottom' as const,
    },
  ];

  const getActiveSteps = () => {
    if (startJurisdictionTour) return jurisdictionTourSteps;
    if (startFeeTour) return feeCalculatorTourSteps;
    return tourSteps;
  };

  const shouldRunTour = startTour || startJurisdictionTour || startFeeTour;

  const handleTourCallback = (data: { status: string }) => {
    const { status } = data;
    if (['finished', 'skipped'].includes(status)) {
      searchParams.delete('tour');
      setSearchParams(searchParams);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        niceClasses,
        markImage: markImageBase64,
        clientId: selectedClientId,
        status: 'DRAFT',
      };

      const response = await trademarkService.createCase(payload);
      addToast({
        title: 'Success',
        description: 'Trademark case created successfully.',
        type: 'success',
      });
      navigate(`/trademarks/${response.data.id}`);
    } catch (error) {
      console.error('Submission error:', error);
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create case',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
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
        type: 'error',
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
        applicant_name: selectedClient.name,
        applicant_name_amharic: selectedClient.local_name || '',
        address_street: selectedClient.address_street || '',
        address_zone: selectedClient.address_zone || '',
        wereda: selectedClient.wereda || '',
        city_name: selectedClient.city || '',
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
        renewal_address_street: selectedClient.address_street || '',
        renewal_address_zone: selectedClient.address_zone || '',
        renewal_city_name: selectedClient.city || '',
        renewal_zip_code: selectedClient.zip_code || '',
        renewal_wereda: selectedClient.wereda || '',
        renewal_house_no: selectedClient.house_no || '',
        renewal_telephone: selectedClient.telephone || '',
        renewal_email: selectedClient.email || '',
        renewal_fax: selectedClient.fax || '',
        renewal_nationality: selectedClient.nationality || '',
        renewal_residence_country: selectedClient.residence_country || '',
        renewal_chk_company: selectedClient.type === 'COMPANY',
        renewal_chk_male: selectedClient.type === 'INDIVIDUAL',
        renewal_chk_female: false,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--eai-bg)] pb-20">
      <Joyride
        steps={getActiveSteps()}
        run={shouldRunTour}
        continuous
        showProgress
        showSkipButton
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: 'var(--eai-primary)',
            zIndex: 1000,
          },
        }}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex gap-2 p-1 bg-[var(--eai-surface)] rounded-lg w-fit mb-8 border border-[var(--eai-border)]">
          <Link
            to="/eipa-forms/application-form"
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              formType === 'APPLICATION'
                ? 'bg-[var(--eai-bg)] shadow-md text-[var(--eai-text)] border border-[var(--eai-border)]'
                : 'text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] hover:bg-[var(--eai-bg)]/30'
            }`}
          >
            Application Form
          </Link>
          <Link
            to="/eipa-forms/renewal-form"
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
              formType === 'RENEWAL'
                ? 'bg-[var(--eai-bg)] shadow-md text-[var(--eai-text)] border border-[var(--eai-border)]'
                : 'text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] hover:bg-[var(--eai-bg)]/30'
            }`}
          >
            Renewal Form
          </Link>
        </div>

        <FormHeader
          formType={formType}
          isSubmitting={isSubmitting}
          onRefresh={generatePreview}
          onDownload={handleDownloadPdf}
          onToggleFields={() => setShowFields(!showFields)}
          onSubmit={handleSubmit}
          showFields={showFields}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-7 space-y-8" id="form-controls-section">
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
              showFields={showFields}
              availableFields={availableFields}
            />
          </div>

          {/* Right Column: Live Preview */}
          <div className="lg:col-span-5">
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
              <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--eai-text)]">
                <Settings className="text-[var(--eai-primary)]" size={20} />
                PDF Field Tags Inspection
              </h3>
              <button onClick={() => setShowFields(false)} className="text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]">
                <XCircle size={24} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-2">
              {Array.from(new Set(availableFields)).map(field => (
                <div key={field} className="px-3 py-2 bg-[var(--eai-bg)] rounded-xl border border-[var(--eai-border)] text-[10px] font-mono truncate hover:border-[var(--eai-primary)] transition-colors cursor-help text-[var(--eai-text-secondary)]" title={field}>
                  {field}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

