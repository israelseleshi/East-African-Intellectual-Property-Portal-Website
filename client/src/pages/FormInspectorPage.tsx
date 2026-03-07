import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { trademarkService, clientService } from '../utils/api';
import { useToast } from '../components/ui/toast';
import { useApi } from '../hooks/useApi';
import {
  RefreshCcw,
  Download,
  Settings,
  Briefcase,
  XCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Joyride, { Step } from 'react-joyride';

// Local Components & Sections
import { ApplicantSection } from './FormAutomation/sections/ApplicantSection';
import { AddressSection } from './FormAutomation/sections/AddressSection';
import { ContactSection } from './FormAutomation/sections/ContactSection';
import { MarkSpecificationSection } from './FormAutomation/sections/MarkSpecificationSection';
import { NiceClassificationSection } from './FormAutomation/sections/NiceClassificationSection';
import { PrioritySection } from './FormAutomation/sections/PrioritySection';
import { RenewalSection } from './FormAutomation/sections/RenewalSection';
import { ChecklistSection } from './FormAutomation/sections/ChecklistSection';
import { EipaFormData, Client, FormType } from './FormAutomation/types';
import { getPdfFields } from '../utils/pdfUtils';

export default function FormInspectorPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tourParam = searchParams.get('tour');
  const startTour = tourParam === 'true';
  const startJurisdictionTour = tourParam === 'jurisdiction';
  const startFeeTour = tourParam === 'fees';

  const [formType, setFormType] = useState<FormType>('APPLICATION');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  const [formData, setFormData] = useState<EipaFormData>({
    applicant_name: '',
    applicant_name_amharic: '',
    address_street: '',
    address_zone: '',
    city_name: '',
    city_code: '',
    state_name: '',
    state_code: '',
    zip_code: '',
    wereda: '',
    house_no: '',
    telephone: '',
    email: '',
    fax: '',
    nationality: '',
    po_box: '',
    residence_country: '',
    chk_female: false,
    chk_male: false,
    chk_company: false,
    chk_goods: false,
    chk_services: false,
    chk_collective: false,
    type_figur: false,
    type_word: false,
    k_type_mi: false,
    type_thre: false,
    mark_description: '',
    mark_translation: '',
    mark_transliteration: '',
    mark_language_requiring_translation: '',
    mark_has_three_dim_features: '',
    mark_color_indication: '',
    mark_image: '',
    goods_services_list: '',
    disclaimer_text_amharic: '',
    disclaimer_text_english: '',
    priority_application_filing_date: '',
    priority_filing_date: '',
    priority_goods_services: '',
    priority_country: '',
    chk_priority_accompanies: false,
    chk_priority_submitted_later: false,
    registration_no: '',
    registration_date: '',
    application_no: '',
    chk_list_copies: false,
    chk_list_statutes: false,
    chk_list_poa: false,
    chk_list_priority_docs: false,
    chk_list_drawing: false,
    chk_list_payment: false,
    chk_list_other: false,
    other_documents_text: '',
    applicant_signature: '',
    applicant_sign_day_en: '',
    applicant_sign_month_en: '',
    applicant_sign_year_en: '',
  });

  const tourSteps: Step[] = [
    {
      target: '#form-controls-section',
      content: 'Welcome to EIPA Form Automation! This tool helps you generate professional trademark applications for Ethiopia.',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#applicant-section',
      content: 'Section I: Enter the applicant\'s full legal name and type. For Ethiopian filings, use the company name as registered with the Ministry of Trade.',
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

  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [showFields, setShowFields] = useState(false);
  const [niceClasses, setNiceClasses] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [markImageBase64, setMarkImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const api = useApi();

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await clientService.getClients({ limit: 1000 });
        setClients(response.data || []);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    }
    fetchClients();
  }, []);

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
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
        po_box: selectedClient.po_box || '',
        chk_company: selectedClient.type === 'COMPANY',
        chk_male: selectedClient.type === 'INDIVIDUAL',
        chk_female: false
      }));
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const pdfFile = formType === 'APPLICATION' ? '/application_form.pdf' : '/renewal_form.pdf';
        const fields = await getPdfFields(pdfFile);
        setAvailableFields(fields.map(f => f.name));
      } catch (e) {
        console.error('Failed to initialize Form Inspector', e);
      }
    }
    init();
  }, [formType]);

  const handleInputChange = (field: keyof EipaFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addToast({
          title: 'File too large',
          description: 'Image must be less than 2MB',
          type: 'error'
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setMarkImageBase64(base64String);
        handleInputChange('mark_image', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setMarkImageBase64(null);
    handleInputChange('mark_image', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!formData.applicant_name) {
      addToast({ title: 'Validation error', description: 'Applicant name is required', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      let markType = 'WORD';
      if (formData.type_figur) markType = 'LOGO';
      if (formData.k_type_mi) markType = 'MIXED';
      if (formData.type_thre) markType = 'THREE_DIMENSION';

      const payload = {
        applicantName: formData.applicant_name,
        applicantNameAmharic: formData.applicant_name_amharic,
        applicantType: formData.chk_company ? 'COMPANY' : 'INDIVIDUAL',
        nationality: formData.nationality,
        email: formData.email,
        telephone: formData.telephone,
        addressStreet: formData.address_street,
        addressZone: formData.address_zone,
        wereda: formData.wereda,
        city: formData.city_name,
        houseNo: formData.house_no,
        state: formData.state_name,
        zipCode: formData.zip_code,
        poBox: formData.po_box,
        markName: formData.mark_description || (formType === 'RENEWAL' ? `Renewal: ${formData.registration_no || 'Draft'}` : 'New trademark application'),
        markType,
        markDescription: formData.mark_description,
        colorIndication: formData.mark_color_indication || 'Black & White',
        priority: formData.priority_country ? 'YES' : 'NO',
        priorityCountry: formData.priority_country,
        markImage: markImageBase64,
        registrationNo: formData.registration_no,
        registrationDate: formData.registration_date,
        applicationNo: formData.application_no,
        formType,
        formVersion: formType === 'APPLICATION' ? 'EIPA_FORM_01' : 'EIPA_FORM_06',
        niceClasses: niceClasses.map((c: number) => ({ classNo: c, description: formData.goods_services_list })),
        jurisdiction: 'ET',
        eipaFormData: {
          ...formData,
          nice_classes_selected: niceClasses,
          nice_classes_mapped: niceClasses.map((c: number) => ({ classNo: c, description: formData.goods_services_list }))
        }
      };

      const response = await api.post('/forms/submit', payload);
      addToast({ title: 'Success', description: `Application submitted! Filing number: ${response.filingNumber}`, type: 'success' });
      navigate(`/trademarks/${response.caseId}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; details?: string } } };
      addToast({ title: 'Submission failed', description: err?.response?.data?.error || err?.response?.data?.details || 'Failed to submit application.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const pdfFile = formType === 'APPLICATION' ? '/application_form.pdf' : '/renewal_form.pdf';
      const { fillPdfForm } = await import('../utils/pdfUtils');
      const pdfBytes = await fillPdfForm(pdfFile, formData as unknown as Record<string, unknown>, true);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileLabel = formType === 'APPLICATION' ? 'Application' : 'Renewal';
      link.download = `EIPA_${fileLabel}_Form_${formData.applicant_name || 'Draft'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error', e);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <Joyride
        steps={getActiveSteps()}
        run={shouldRunTour || runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={(data: { status: string }) => {
          handleTourCallback(data);
          if (['finished', 'skipped'].includes(data.status)) {
            setRunTour(false);
          }
        }}
        styles={{
          options: {
            primaryColor: 'var(--eai-primary)',
            textColor: '#1C1C1E',
            zIndex: 10000,
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltipContainer: {
            textAlign: 'left',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
          buttonNext: { borderRadius: '0px', fontWeight: 'bold', fontSize: '13px' },
          buttonBack: { marginRight: '10px', fontWeight: 'bold', fontSize: '13px' },
          buttonSkip: { fontSize: '13px', fontWeight: 'bold' }
        }}
      />
      <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 shrink-0 mb-8">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <h1 className="text-h1 text-[var(--eai-text)]">Form Automation</h1>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => setFormType('APPLICATION')}
              className={`pb-2 px-4 text-label transition-all border-b-2 ${formType === 'APPLICATION' ? 'border-[var(--eai-primary)] text-[var(--eai-primary)]' : 'border-transparent text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]'}`}
            >
              Application form
            </button>
            <button
              onClick={() => setFormType('RENEWAL')}
              className={`pb-2 px-4 text-label transition-all border-b-2 ${formType === 'RENEWAL' ? 'border-[var(--eai-primary)] text-[var(--eai-primary)]' : 'border-transparent text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]'}`}
            >
              Renewal form
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            id="inspect-tags-button"
            onClick={() => setShowFields(!showFields)}
            className="flex items-center gap-2 text-label text-[var(--eai-text-secondary)] hover:text-[var(--eai-primary)] transition-colors px-3 py-2"
          >
            <Settings size={18} />
            <span className="hidden sm:inline">{showFields ? 'Hide tags' : 'Inspect tags'}</span>
          </button>
          <button
            id="download-pdf-button"
            onClick={handleDownload}
            className="apple-button-secondary flex items-center gap-2 text-label"
          >
            <Download size={18} />
            <span>Download PDF</span>
          </button>

          <button
            id="submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="apple-button-primary flex items-center gap-2 shadow-lg shadow-[var(--eai-primary)]/20 text-label text-white"
          >
            {isSubmitting ? <RefreshCcw size={18} className="animate-spin" /> : <Briefcase size={18} />}
            <span>{isSubmitting ? 'Submitting...' : 'Submit application'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <div className="flex flex-col space-y-6 overflow-y-auto pr-4 custom-scrollbar pb-12" id="form-controls-section">
          <ApplicantSection 
            formData={formData} 
            handleInputChange={handleInputChange} 
            clients={clients} 
            selectedClientId={selectedClientId} 
            handleClientSelect={handleClientSelect} 
          />
          <AddressSection formData={formData} handleInputChange={handleInputChange} />
          <ContactSection formData={formData} handleInputChange={handleInputChange} />
          <MarkSpecificationSection 
            formData={formData} 
            handleInputChange={handleInputChange} 
            markImageBase64={markImageBase64} 
            handleImageUpload={handleImageUpload} 
            removeImage={removeImage} 
            fileInputRef={fileInputRef} 
          />
          <NiceClassificationSection 
            formData={formData} 
            handleInputChange={handleInputChange} 
            niceClasses={niceClasses} 
            setNiceClasses={setNiceClasses} 
          />
          <PrioritySection formData={formData} handleInputChange={handleInputChange} />
          {formType === 'RENEWAL' && <RenewalSection formData={formData} handleInputChange={handleInputChange} />}
          <ChecklistSection formData={formData} handleInputChange={handleInputChange} />
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
              <h3 className="text-h3 flex items-center gap-2">
                <Settings className="text-[var(--eai-primary)]" size={20} />
                PDF field tags inspection
              </h3>
              <button onClick={() => setShowFields(false)} className="text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]">
                <XCircle size={24} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-2">
              {availableFields.map(field => (
                <div key={field} className="px-3 py-2 bg-[var(--eai-bg)] rounded-xl border border-[var(--eai-border)] text-micro font-mono truncate hover:border-[var(--eai-primary)] transition-colors cursor-help" title={field}>
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

