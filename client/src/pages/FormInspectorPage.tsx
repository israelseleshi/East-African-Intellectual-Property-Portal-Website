import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { trademarkService, clientService } from '../utils/api';
import { useToast } from '../components/ui/toast';
import { useApi } from '../hooks/useApi';
import {
  RefreshCcw,
  Download,
  Settings,
  Briefcase,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Eye,
  Loader2,
  AlertCircle
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
import { AgentSection } from './FormAutomation/sections/AgentSection';
import { DisclaimerSection } from './FormAutomation/sections/DisclaimerSection';
import { ChecklistSection } from './FormAutomation/sections/ChecklistSection';
import { RenewalSection } from './FormAutomation/sections/RenewalSection';
import { EipaFormData, Client, FormType } from './FormAutomation/types';
import { getPdfFields, fillPdfForm } from '../utils/pdfUtils';

export default function FormInspectorPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tourParam = searchParams.get('tour');
  const startTour = tourParam === 'true';
  const startJurisdictionTour = tourParam === 'jurisdiction';
  const startFeeTour = tourParam === 'fees';

  const location = useLocation();
  const [formType, setFormType] = useState<FormType>(
    location.pathname.includes('renewal-form') ? 'RENEWAL' : 'APPLICATION'
  );

  // Sync state with URL if it changes (e.g. browser back/forward)
  useEffect(() => {
    const newType = location.pathname.includes('renewal-form') ? 'RENEWAL' : 'APPLICATION';
    if (newType !== formType) {
      setFormType(newType);
    }
  }, [location.pathname, formType]);

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
    // Renewal Initial State
    renewal_auth_app_no: '',
    renewal_auth_filing_date: '',
    renewal_auth_receipt_date: '',
    renewal_auth_approved_by: '',
    renewal_applicant_name: '',
    renewal_address_street: '',
    renewal_address_zone: '',
    renewal_city_name: '',
    renewal_state_name: '',
    renewal_zip_code: '',
    renewal_wereda: '',
    renewal_house_no: '',
    renewal_telephone: '',
    renewal_email: '',
    renewal_fax: '',
    renewal_po_box: '',
    renewal_nationality: '',
    renewal_residence_country: '',
    renewal_chk_female: false,
    renewal_chk_male: false,
    renewal_chk_company: false,
    renewal_agent_name: '',
    renewal_agent_address: '',
    renewal_agent_tel: '',
    renewal_chk_goods: false,
    renewal_chk_services: false,
    renewal_chk_collective: false,
    renewal_mark_logo: '',
    renewal_app_no: '',
    renewal_reg_no: '',
    renewal_reg_date: '',
    renewal_goods_services: '',
    renewal_nice_classes: '',
    renewal_signature: '',
    renewal_sign_day: '',
    renewal_sign_month: '',
    renewal_sign_year: '',
    agent_name: 'East African IP',
    agent_subcity: 'Yeka',
    agent_wereda: '02',
    agent_telephone: '0939423012',
    agent_email: 'info@eastafricanip.com',
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

  // Live Preview States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showPreview, setShowPreview] = useState(true);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear preview when form type changes to force regeneration
  useEffect(() => {
    setPreviewUrl(null);
    setPreviewError(null);
    setPreviewLoading(true);
    // Immediate regeneration when form type changes
    generatePreview();
  }, [formType]);

  // Generate live preview
  const generatePreview = useCallback(async () => {
    if (!showPreview) return;
    
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
      console.log(`[Preview] Generating for ${pdfFile}, formType=${formType}`);
      
      const pdfBytes = await fillPdfForm(pdfFile, formData as unknown as Record<string, unknown>, false);
      
      if (pdfBytes && pdfBytes.length > 0) {
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        console.log(`[Preview] Generated URL: ${url.substring(0, 50)}...`);
        
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        throw new Error('Generated PDF is empty');
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setPreviewError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [formData, formType, showPreview]);

  // Debounced preview effect for form data changes only (not formType)
  useEffect(() => {
    // Skip the first render since formType effect handles initial load
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    previewTimeoutRef.current = setTimeout(() => {
      generatePreview();
    }, 400);

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, generatePreview]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  useEffect(() => {
    async function init() {
      try {
        const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
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
    if (!selectedClientId && !formData.applicant_name) {
      addToast({ title: 'Validation error', description: 'Please select an existing client or enter an applicant name', type: 'error' });
      return;
    }

    if (!formData.mark_description && formType === 'APPLICATION') {
      addToast({ title: 'Validation error', description: 'Mark description is required', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      let markType = 'WORD';
      if (formData.type_figur) markType = 'LOGO';
      if (formData.k_type_mi) markType = 'MIXED';
      if (formData.type_thre) markType = 'THREE_DIMENSION';

      const payload = {
        clientId: selectedClientId || undefined,
        applicantName: formType === 'RENEWAL' ? formData.renewal_applicant_name : formData.applicant_name,
        applicantNameAmharic: formData.applicant_name_amharic,
        applicantType: formData.chk_company || formData.renewal_chk_company ? 'COMPANY' : 'INDIVIDUAL',
        nationality: formType === 'RENEWAL' ? formData.renewal_nationality : formData.nationality,
        email: formType === 'RENEWAL' ? formData.renewal_email : formData.email,
        telephone: formType === 'RENEWAL' ? formData.renewal_telephone : formData.telephone,
        addressStreet: formType === 'RENEWAL' ? formData.renewal_address_street : formData.address_street,
        addressZone: formType === 'RENEWAL' ? formData.renewal_address_zone : formData.address_zone,
        wereda: formType === 'RENEWAL' ? formData.renewal_wereda : formData.wereda,
        city: formType === 'RENEWAL' ? formData.renewal_city_name : formData.city_name,
        houseNo: formType === 'RENEWAL' ? formData.renewal_house_no : formData.house_no,
        state: formType === 'RENEWAL' ? formData.renewal_state_name : formData.state_name,
        zipCode: formType === 'RENEWAL' ? formData.renewal_zip_code : formData.zip_code,
        poBox: formType === 'RENEWAL' ? formData.renewal_po_box : formData.po_box,
        markName: (formType === 'RENEWAL' ? formData.renewal_goods_services : formData.mark_description) || formData.applicant_name || 'New trademark application',
        markType,
        markDescription: formType === 'RENEWAL' ? formData.renewal_goods_services : formData.mark_description,
        colorIndication: formData.mark_color_indication || 'Black & White',
        priority: formData.priority_country ? 'YES' : 'NO',
        priorityCountry: formData.priority_country,
        markImage: markImageBase64,
        registrationNo: formType === 'RENEWAL' ? formData.renewal_reg_no : formData.registration_no,
        registrationDate: formType === 'RENEWAL' ? formData.renewal_reg_date : formData.registration_date,
        applicationNo: formType === 'RENEWAL' ? formData.renewal_app_no : formData.application_no,
        formType: formType,
        formVersion: formType === 'RENEWAL' ? 'EIPA_FORM_06' : 'EIPA_FORM_01',
        niceClasses: niceClasses.map((c: number) => ({ classNo: c, description: formType === 'RENEWAL' ? formData.renewal_goods_services : formData.goods_services_list })),
        jurisdiction: 'ET',
        eipaFormData: {
          ...formData,
          nice_classes_selected: niceClasses,
          nice_classes_mapped: niceClasses.map((c: number) => ({ classNo: c, description: formType === 'RENEWAL' ? formData.renewal_goods_services : formData.goods_services_list }))
        }
      };

      const response = await api.post('/forms/submit', payload);
      addToast({ 
        title: 'Success', 
        description: `${formType === 'RENEWAL' ? 'Renewal' : 'Application'} submitted! Filing number: ${response.filingNumber}`, 
        type: 'success' 
      });
      // Small delay for the user (and Cypress) to see the success message
      setTimeout(() => {
        navigate(`/trademarks/${response.caseId}`);
      }, 1500);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; details?: string } } };
      addToast({ title: 'Submission failed', description: err?.response?.data?.error || err?.response?.data?.details || 'Failed to submit application.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
      const pdfBytes = await fillPdfForm(pdfFile, formData as unknown as Record<string, unknown>, true);
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = formType === 'RENEWAL' ? 'Renewal_Form' : 'EIPA_Application_Form';
      link.download = `${fileName}_${formData.applicant_name || 'Draft'}.pdf`;
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
      {/* Tabs moved above the title */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg w-fit mb-6">
        <Link
          to="/eipa-forms/application-form"
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            formType === 'APPLICATION'
              ? 'bg-background shadow-md text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/30'
          }`}
        >
          Application Form
        </Link>
        <Link
          to="/eipa-forms/renewal-form"
          className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
            formType === 'RENEWAL'
              ? 'bg-background shadow-md text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/30'
          }`}
        >
          Renewal Form
        </Link>
      </div>

      <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 shrink-0 mb-8">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <h1 className="text-h1 text-[var(--eai-text)]">
            {formType === 'RENEWAL' ? 'Trademark Renewal' : 'Trademark Application'}
          </h1>
          <p className="text-body text-[var(--eai-text-secondary)]">
            {formType === 'RENEWAL' 
              ? 'Generate EIPA trademark renewal forms.' 
              : 'Generate EIPA trademark application forms.'}
          </p>
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
            className="apple-button-primary flex items-center gap-2 shadow-lg shadow-[var(--eai-primary)]/20 text-label text-white first-letter:uppercase"
          >
            {isSubmitting ? <RefreshCcw size={18} className="animate-spin" /> : <Briefcase size={18} />}
            <span>{isSubmitting ? 'Submitting...' : (formType === 'RENEWAL' ? 'Submit renewal' : 'Submit application')}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex gap-6">
        {/* Left Side: Form Controls */}
        <div className="flex-1 flex flex-col space-y-6 overflow-y-auto pr-4 custom-scrollbar pb-12 max-w-2xl" id="form-controls-section">

          <div className="space-y-6">
            {formType === 'APPLICATION' ? (
              <>
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
                <DisclaimerSection formData={formData} handleInputChange={handleInputChange} />
                <AgentSection formData={formData} handleInputChange={handleInputChange} />
                <ChecklistSection formData={formData} handleInputChange={handleInputChange} />
              </>
            ) : (
              <RenewalSection 
                formData={formData} 
                handleInputChange={handleInputChange} 
                clients={clients}
                selectedClientId={selectedClientId}
                handleClientSelect={handleClientSelect}
              />
            )}
          </div>
        </div>

        {/* Right Side: Premium PDF Live Preview */}
        <div className="w-[45%] min-w-[400px] flex flex-col bg-[var(--eai-surface)] rounded-2xl border border-[var(--eai-border)] overflow-hidden shadow-lg">
          {/* Preview Header with Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--eai-bg)] border-b border-[var(--eai-border)]">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[var(--eai-primary)]" />
              <span className="text-sm font-medium text-[var(--eai-text)]">
                {formType === 'RENEWAL' ? 'Renewal Form' : 'Application Form'} Preview
              </span>
              {previewLoading && (
                <Loader2 size={14} className="animate-spin text-[var(--eai-primary)] ml-2" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                className="p-2 rounded-lg hover:bg-[var(--eai-surface)] text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-medium text-[var(--eai-text-secondary)] w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                className="p-2 rounded-lg hover:bg-[var(--eai-surface)] text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <div className="w-px h-5 bg-[var(--eai-border)] mx-2" />
              <button
                onClick={() => generatePreview()}
                className="p-2 rounded-lg hover:bg-[var(--eai-surface)] text-[var(--eai-text-secondary)] hover:text-[var(--eai-primary)] transition-colors"
                title="Refresh Preview"
              >
                <RotateCw size={16} />
              </button>
              <button
                onClick={() => setShowPreview(prev => !prev)}
                className="p-2 rounded-lg hover:bg-[var(--eai-surface)] text-[var(--eai-text-secondary)] hover:text-[var(--eai-primary)] transition-colors"
                title={showPreview ? 'Hide Preview' : 'Show Preview'}
              >
                <Eye size={16} />
              </button>
            </div>
          </div>

          {/* PDF Preview Area */}
          <div className="flex-1 bg-[var(--eai-bg)] relative overflow-hidden">
            {showPreview ? (
              previewError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 p-6">
                  <AlertCircle size={40} className="mb-4 opacity-70" />
                  <p className="text-sm font-medium">Preview generation failed</p>
                  <p className="text-xs mt-2 opacity-70 text-center max-w-xs">{previewError}</p>
                  <button
                    onClick={() => generatePreview()}
                    className="mt-4 px-4 py-2 bg-[var(--eai-surface)] hover:bg-[var(--eai-border)] rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <RotateCw size={14} />
                    Retry
                  </button>
                </div>
              ) : previewUrl ? (
                <div 
                  className="w-full h-full flex items-center justify-center p-4 overflow-auto"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center top',
                    transition: 'transform 0.2s ease-out'
                  }}
                >
                  <iframe
                    src={`${previewUrl}#toolbar=1&navpanes=0`}
                    className="w-full h-full min-h-[600px] bg-white rounded-lg shadow-sm"
                    style={{ minWidth: '100%' }}
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--eai-text-secondary)]">
                  {previewLoading ? (
                    <>
                      <Loader2 size={40} className="animate-spin mb-4 text-[var(--eai-primary)]" />
                      <p className="text-sm">Generating preview...</p>
                      <p className="text-xs mt-2 opacity-50">{formType === 'RENEWAL' ? 'Loading renewal form...' : 'Loading application form...'}</p>
                    </>
                  ) : (
                    <>
                      <FileText size={48} className="mb-4 opacity-30" />
                      <p className="text-sm">Preview will appear here</p>
                      <p className="text-xs mt-2 opacity-50">Fill out the form to see live preview</p>
                    </>
                  )}
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--eai-text-secondary)]">
                <Eye size={40} className="mb-4 opacity-30" />
                <p className="text-sm">Preview hidden</p>
                <button
                  onClick={() => setShowPreview(true)}
                  className="mt-4 px-4 py-2 bg-[var(--eai-surface)] hover:bg-[var(--eai-border)] rounded-lg text-sm transition-colors"
                >
                  Show Preview
                </button>
              </div>
            )}
          </div>

          {/* Preview Footer */}
          <div className="px-4 py-2 bg-[var(--eai-bg)] border-t border-[var(--eai-border)] flex items-center justify-between">
            <span className="text-xs text-[var(--eai-text-secondary)]">
              Auto-updates when you type
            </span>
            <span className="text-xs text-[var(--eai-text-secondary)]">
              {formType === 'RENEWAL' ? 'EIPA Form 06' : 'EIPA Form 01'}
            </span>
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
              <h3 className="text-h3 flex items-center gap-2">
                <Settings className="text-[var(--eai-primary)]" size={20} />
                PDF field tags inspection
              </h3>
              <button onClick={() => setShowFields(false)} className="text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]">
                <XCircle size={24} />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-2">
              {Array.from(new Set(availableFields)).map(field => (
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

