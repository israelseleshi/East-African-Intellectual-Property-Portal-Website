import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { trademarkService } from '../utils/api';
import NiceClassPicker from '../components/NiceClassPicker';
import { useToast } from '../components/ui/toast';
import { useApi } from '../hooks/useApi';
import {
  FileText,
  Tag,
  RefreshCcw,
  Download,
  Eye,
  EyeOff,
  Settings,
  User,
  MapPin,
  Phone,
  Briefcase,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPdfFields, fillPdfForm } from '../utils/pdfUtils';
import Joyride, { Step } from 'react-joyride'

// Mirror the reference repo's FormData structure
interface EipaFormData {
  // Common Fields
  applicant_name: string;
  applicant_name_amharic: string;
  address_street: string;
  address_zone: string;
  city_name: string;
  city_code: string;
  state_name: string;
  state_code: string;
  zip_code: string;
  wereda: string;
  house_no: string;
  telephone: string;
  email: string;
  fax: string;
  nationality: string;
  po_box: string;
  residence_country: string;
  chk_female: boolean;
  chk_male: boolean;
  chk_company: boolean;
  chk_goods: boolean;
  chk_services: boolean;
  chk_collective: boolean;
  type_figur: boolean;
  type_word: boolean;
  k_type_mi: boolean;
  type_thre: boolean;
  mark_description: string;
  mark_translation: string;
  mark_transliteration: string;
  mark_language_requiring_translation: string;
  mark_has_three_dim_features: string;
  mark_color_indication: string;
  mark_image: string;
  goods_services_list: string;
  disclaimer_text_amharic: string;
  disclaimer_text_english: string;

  // Application Specific
  priority_application_filing_date: string;
  priority_filing_date: string;
  priority_goods_services: string;
  priority_country: string;
  chk_priority_accompanies: boolean;
  chk_priority_submitted_later: boolean;

  // Renewal Specific
  registration_no: string;
  registration_date: string;
  application_no: string;

  // Checklist
  chk_list_copies: boolean;
  chk_list_statutes: boolean;
  chk_list_poa: boolean;
  chk_list_priority_docs: boolean;
  chk_list_drawing: boolean;
  chk_list_payment: boolean;
  chk_list_other: boolean;
  other_documents_text: string;

  // Signature
  applicant_signature: string;
  applicant_sign_day_en: string;
  applicant_sign_month_en: string;
  applicant_sign_year_en: string;
}

type FormType = 'APPLICATION' | 'RENEWAL';

export default function FormInspectorPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tourParam = searchParams.get('tour')
  const startTour = tourParam === 'true'
  const startJurisdictionTour = tourParam === 'jurisdiction'
  const startFeeTour = tourParam === 'fees'

  const tourSteps: Step[] = [
    {
      target: '#form-controls-section',
      content: 'Welcome to EIPA Form Automation! This tool helps you generate professional trademark applications for Ethiopia. All changes sync to the PDF in real-time.',
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
      target: '#pdf-preview-section',
      content: 'Live Preview: See exactly how your official EIPA Form 01 will appear. The PDF updates automatically as you type.',
      placement: 'left' as const,
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
  ]

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
  ]

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
  ]

  const getActiveSteps = () => {
    if (startJurisdictionTour) return jurisdictionTourSteps
    if (startFeeTour) return feeCalculatorTourSteps
    return tourSteps
  }

  const shouldRunTour = startTour || startJurisdictionTour || startFeeTour

  const handleTourCallback = (data: { status: string }) => {
    const { status } = data
    if (['finished', 'skipped'].includes(status)) {
      searchParams.delete('tour')
      setSearchParams(searchParams)
    }
  }

  const [formType, setFormType] = useState<FormType>('APPLICATION');
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

  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [showFields, setShowFields] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [niceClasses, setNiceClasses] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const api = useApi(); // Initialize hook at top level

  // Load available fields and cases on mount
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

  // Handle Input Changes
  const handleInputChange = (field: keyof EipaFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.applicant_name) {
      addToast({
        title: 'Validation Error',
        description: 'Applicant Name is required',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine Mark Type based on checkboxes
      let markType = 'WORD'; // Default
      if (formData.type_figur) markType = 'LOGO';
      if (formData.k_type_mi) markType = 'MIXED';
      if (formData.type_thre) markType = 'THREE_DIMENSION';

      // Prepare payload with form data only (no PDF)
      const payload = {
        // Applicant Info
        applicantName: formData.applicant_name,
        applicantNameAmharic: formData.applicant_name_amharic,
        applicantType: formData.chk_company ? 'COMPANY' : 'INDIVIDUAL',
        nationality: formData.nationality,
        email: formData.email,
        telephone: formData.telephone,
        addressStreet: formData.address_street,
        addressZone: formData.address_zone,
        wereda: formData.wereda,
        city: formData.city_name, // API expects 'city'
        houseNo: formData.house_no,
        state: formData.state_name, // API expects 'state'
        zipCode: formData.zip_code,
        poBox: formData.po_box,

        // Mark Info
        markName: formData.mark_description || (formType === 'RENEWAL' ? `Renewal: ${formData.registration_no || 'Draft'}` : 'New Trademark Application'),
        markType,
        markDescription: formData.mark_description,
        colorIndication: formData.mark_color_indication || 'Black & White',
        priority: formData.priority_country ? 'YES' : 'NO',
        priorityCountry: formData.priority_country,

        // Renewal info
        registrationNo: formData.registration_no,
        registrationDate: formData.registration_date,
        applicationNo: formData.application_no,
        formType,
        formVersion: formType === 'APPLICATION' ? 'EIPA_FORM_01' : 'EIPA_FORM_06',

        // Nice Classes
        niceClasses: niceClasses.map((c: number) => ({
          classNo: c,
          description: formData.goods_services_list
        })),

        // No PDF - will be generated later
        jurisdiction: 'ET',

        // Persist full EIPA payload for the trademark detail page
        eipaFormData: {
          ...formData,
          nice_classes_selected: niceClasses,
          nice_classes_mapped: niceClasses.map((c: number) => ({
            classNo: c,
            description: formData.goods_services_list
          }))
        }
      };

      // Submit to API (JSON data only)
      console.log('Submitting payload:', payload);
      console.log('Applicant Name:', payload.applicantName);
      console.log('Mark Name:', payload.markName);
      const response = await api.post('/forms/submit', payload);

      addToast({
        title: 'Success',
        description: `Application submitted! Filing Number: ${response.filingNumber}`,
        type: 'success'
      });

      // Navigate to the new trademark case
      navigate(`/trademarks/${response.caseId}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; details?: string } } };
      console.error('Submission failed', error);
      addToast({
        title: 'Submission Failed',
        description: err?.response?.data?.error || err?.response?.data?.details || 'Failed to submit application. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debounced Preview Generation
  useEffect(() => {
    if (!showPreview) return;

    // Skip heavy generation if we are in a testing environment and typing fast
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setIsGenerating(true);
      try {
        const pdfFile = formType === 'APPLICATION' ? '/application_form.pdf' : '/renewal_form.pdf';
        const pdfBytes = await fillPdfForm(pdfFile, formData as unknown as Record<string, unknown>, false);
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (error) {
        console.error('Preview error:', error);
      } finally {
        setIsGenerating(false);
      }
    }, 400); // Optimized refresh rate (400ms instead of 1500ms)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [formData, showPreview, formType]);

  const handleDownload = async () => {
    try {
      const pdfFile = formType === 'APPLICATION' ? '/application_form.pdf' : '/renewal_form.pdf';
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
          buttonNext: {
            borderRadius: '0px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonBack: {
            marginRight: '10px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonSkip: {
            fontSize: '13px',
            fontWeight: 'bold',
          }
        }}
      />
      <header className="flex items-end justify-between shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1 text-[var(--eai-text)]">Form Automation</h1>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => setFormType('APPLICATION')}
              className={`pb-2 px-4 text-label uppercase transition-all border-b-2 ${formType === 'APPLICATION' ? 'border-[var(--eai-primary)] text-[var(--eai-primary)]' : 'border-transparent text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]'}`}
            >
              Application Form
            </button>
            <button
              onClick={() => setFormType('RENEWAL')}
              className={`pb-2 px-4 text-label uppercase transition-all border-b-2 ${formType === 'RENEWAL' ? 'border-[var(--eai-primary)] text-[var(--eai-primary)]' : 'border-transparent text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]'}`}
            >
              Renewal Form
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            id="inspect-tags-button"
            onClick={() => setShowFields(!showFields)}
            className="flex items-center gap-2 text-label text-[var(--eai-text-secondary)] hover:text-[var(--eai-primary)] transition-colors uppercase"
          >
            <Settings size={18} />
            <span>{showFields ? 'Hide Tags' : 'Inspect Tags'}</span>
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="apple-button-secondary flex items-center gap-2 text-label uppercase"
          >
            {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
            <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
          </button>

          <div className="h-6 w-px bg-[var(--eai-border)] mx-1" />

          <button
            id="download-pdf-button"
            onClick={handleDownload}
            className="apple-button-secondary flex items-center gap-2 text-label uppercase"
          >
            <Download size={18} />
            <span>Download PDF</span>
          </button>

          <button
            id="submit-button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="apple-button-primary flex items-center gap-2 shadow-lg shadow-[var(--eai-primary)]/20 text-label uppercase text-white"
          >
            {isSubmitting ? <RefreshCcw size={18} className="animate-spin" /> : <Briefcase size={18} />}
            <span>{isSubmitting ? 'Submitting...' : 'Submit Application'}</span>
          </button>
        </div>
      </header>

      <div className={`grid gap-8 flex-1 min-h-0 mt-8 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`} style={{ height: 'calc(100vh - 180px)' }}>
        {/* Left Side: Professional Form */}
        <div className="flex flex-col space-y-6 overflow-y-auto pr-4 custom-scrollbar pb-12" id="form-controls-section">
          {/* Section I: Applicant */}
          <section className="apple-card p-6 space-y-6" id="applicant-section">
            <div className="flex items-center gap-2 border-b border-[var(--eai-border)] pb-4">
              <User className="text-[var(--eai-primary)]" size={20} />
              <h2 className="text-h3">I. Applicant Information</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Full Name (English)</label>
                <input
                  value={formData.applicant_name}
                  onChange={(e) => handleInputChange('applicant_name', e.target.value)}
                  className="apple-input"
                  placeholder="Enter full legal name in English"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">ሙሉ ስም (Amharic)</label>
                <input
                  value={formData.applicant_name_amharic}
                  onChange={(e) => handleInputChange('applicant_name_amharic', e.target.value)}
                  className="apple-input font-amharic"
                  placeholder="ሙሉ ስም እዚህ ያስገቡ"
                />
              </div>

              <div className="flex gap-6">
                {[
                  { id: 'chk_female', label: 'Female' },
                  { id: 'chk_male', label: 'Male' },
                  { id: 'chk_company', label: 'Company' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData[opt.id as keyof EipaFormData] as boolean}
                      onChange={(e) => handleInputChange(opt.id as keyof EipaFormData, e.target.checked)}
                      className="h-5 w-5 rounded-xl border-[var(--eai-border)] text-[var(--eai-primary)] focus:ring-[var(--eai-primary)]"
                    />
                    <span className="text-body group-hover:text-[var(--eai-primary)] transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Section II: Address */}
          <section className="apple-card p-6 space-y-6" id="address-section">
            <div className="flex items-center gap-2 border-b border-[var(--eai-border)] pb-4">
              <MapPin className="text-[var(--eai-primary)]" size={20} />
              <h2 className="text-h3">II. Address Details</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Street Address</label>
                <input
                  value={formData.address_street}
                  onChange={(e) => handleInputChange('address_street', e.target.value)}
                  className="apple-input"
                  placeholder="Enter street address"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Zone / Subcity</label>
                <input
                  value={formData.address_zone}
                  onChange={(e) => handleInputChange('address_zone', e.target.value)}
                  className="apple-input"
                  placeholder="Enter zone or subcity"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Wereda</label>
                <input
                  value={formData.wereda}
                  onChange={(e) => handleInputChange('wereda', e.target.value)}
                  className="apple-input"
                  placeholder="Enter wereda/district"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">City Name</label>
                <input
                  value={formData.city_name}
                  onChange={(e) => handleInputChange('city_name', e.target.value)}
                  className="apple-input"
                  placeholder="Enter city name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">House Number</label>
                <input
                  value={formData.house_no}
                  onChange={(e) => handleInputChange('house_no', e.target.value)}
                  className="apple-input"
                  placeholder="Enter house no."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">State / Region Name</label>
                <input
                  value={formData.state_name}
                  onChange={(e) => handleInputChange('state_name', e.target.value)}
                  className="apple-input"
                  placeholder="Enter state or region"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">State Code</label>
                <input
                  value={formData.state_code}
                  onChange={(e) => handleInputChange('state_code', e.target.value)}
                  className="apple-input"
                  placeholder="State code"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">City Code</label>
                <input
                  value={formData.city_code}
                  onChange={(e) => handleInputChange('city_code', e.target.value)}
                  className="apple-input"
                  placeholder="Enter city code"
                />
              </div>
            </div>
          </section>

          {/* Section III: Contact */}
          <section className="apple-card p-6 space-y-6" id="contact-section">
            <div className="flex items-center gap-2 border-b border-[var(--eai-border)] pb-4">
              <Phone className="text-[var(--eai-primary)]" size={20} />
              <h2 className="text-h3">III. Contact Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Telephone</label>
                <input
                  value={formData.telephone}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  className="apple-input"
                  placeholder="Enter telephone number"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Email Address</label>
                <input
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="apple-input"
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Fax Number</label>
                <input
                  value={formData.fax}
                  onChange={(e) => handleInputChange('fax', e.target.value)}
                  className="apple-input"
                  placeholder="Enter fax (optional)"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">P.O. Box</label>
                <input
                  value={formData.po_box}
                  onChange={(e) => handleInputChange('po_box', e.target.value)}
                  className="apple-input"
                  placeholder="Enter P.O. Box"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Nationality</label>
                <select
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  className="apple-input"
                >
                  <option value="">Select nationality</option>
                  <option value="Ethiopia">🇪🇹 Ethiopia</option>
                  <option value="Kenya">🇰🇪 Kenya</option>
                  <option value="Eritrea">🇪🇷 Eritrea</option>
                  <option value="Djibouti">🇩🇯 Djibouti</option>
                  <option value="Somalia">🇸🇴 Somalia</option>
                  <option value="Somaliland">🇸🇴 Somaliland</option>
                  <option value="Tanzania">🇹🇿 Tanzania</option>
                  <option value="Uganda">🇺🇬 Uganda</option>
                  <option value="Rwanda">🇷🇼 Rwanda</option>
                  <option value="Burundi">🇧🇮 Burundi</option>
                  <option value="Sudan">🇸🇩 Sudan</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">ZIP / Postal Code</label>
                <input
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  className="apple-input"
                  placeholder="Enter postal code"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Residence Country (Section I)</label>
                <input
                  value={formData.residence_country}
                  onChange={(e) => handleInputChange('residence_country', e.target.value)}
                  className="apple-input"
                  placeholder="Principal place of business"
                />
              </div>
            </div>
          </section>

          {/* Section IV: Mark Details */}
          <section className="apple-card p-6 space-y-6" id="mark-specification-section">
            <div className="flex items-center gap-2 border-b border-[var(--eai-border)] pb-4">
              <Briefcase className="text-[var(--eai-primary)]" size={20} />
              <h2 className="text-h3">IV. Mark Specification</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'chk_goods', label: 'Goods Mark' },
                  { id: 'chk_services', label: 'Service Mark' },
                  { id: 'chk_collective', label: 'Collective Mark' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData[opt.id as keyof EipaFormData] as boolean}
                      onChange={(e) => handleInputChange(opt.id as keyof EipaFormData, e.target.checked)}
                      className="h-5 w-5 rounded-xl border-[var(--eai-border)] text-[var(--eai-primary)] focus:ring-[var(--eai-primary)]"
                    />
                    <span className="text-body group-hover:text-[var(--eai-primary)] transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--eai-border)]">
                {[
                  { id: 'type_word', label: 'Type - Word' },
                  { id: 'type_figur', label: 'Type - Figurative' },
                  { id: 'k_type_mi', label: 'Type - Mixed' },
                  { id: 'type_thre', label: 'Type - 3D' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData[opt.id as keyof EipaFormData] as boolean}
                      onChange={(e) => handleInputChange(opt.id as keyof EipaFormData, e.target.checked)}
                      className="h-5 w-5 rounded-xl border-[var(--eai-border)] text-[var(--eai-primary)] focus:ring-[var(--eai-primary)]"
                    />
                    <span className="text-body group-hover:text-[var(--eai-primary)] transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-label text-[var(--eai-text)]">Mark Logo (Image)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        handleInputChange('mark_image', reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="apple-input"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-label text-[var(--eai-text)]">Mark Description</label>
                <textarea
                  value={formData.mark_description}
                  onChange={(e) => handleInputChange('mark_description', e.target.value)}
                  className="apple-input w-full min-h-[80px] py-2"
                  placeholder="Describe the mark visual elements..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-label text-[var(--eai-text)]">Translation</label>
                  <input
                    value={formData.mark_translation}
                    onChange={(e) => handleInputChange('mark_translation', e.target.value)}
                    className="apple-input"
                    placeholder="English translation"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label text-[var(--eai-text)]">Transliteration</label>
                  <input
                    value={formData.mark_transliteration}
                    onChange={(e) => handleInputChange('mark_transliteration', e.target.value)}
                    className="apple-input"
                    placeholder="Phonetic pronunciation"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Language Requiring Translation</label>
                <input
                  value={formData.mark_language_requiring_translation}
                  onChange={(e) => handleInputChange('mark_language_requiring_translation', e.target.value)}
                  className="apple-input"
                  placeholder="State the language (if not English/Amharic)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">3D Features Description</label>
                <input
                  value={formData.mark_has_three_dim_features}
                  onChange={(e) => handleInputChange('mark_has_three_dim_features', e.target.value)}
                  className="apple-input"
                  placeholder="Describe three-dimensional features if any"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label text-[var(--eai-text)]">Color Indication</label>
                <input
                  value={formData.mark_color_indication}
                  onChange={(e) => handleInputChange('mark_color_indication', e.target.value)}
                  className="apple-input"
                  placeholder="Indication of colors (if other than B/W)"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-[var(--eai-border)]">
                <div className="space-y-2" id="nice-classification">
                  <label className="text-label text-[var(--eai-text)]">
                    Nice Classification
                  </label>
                  <NiceClassPicker
                    selectedClasses={niceClasses}
                    onSelectionChange={setNiceClasses}
                  />
                </div>

                <div className="space-y-1.5" id="goods-services">
                  <label className="text-label text-[var(--eai-text)]">
                    Goods & Services List
                  </label>
                  <textarea
                    value={formData.goods_services_list}
                    onChange={(e) => handleInputChange('goods_services_list', e.target.value)}
                    className="apple-input w-full min-h-[120px] py-2"
                    placeholder="Class 01: Item description..."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section V: Renewal Info (Renewal Only) */}
          {formType === 'RENEWAL' && (
            <section className="apple-card p-6 space-y-6" id="renewal-info-section">
              <div className="flex items-center gap-2 border-b border-[var(--eai-border)] pb-4">
                <FileText className="text-[var(--eai-primary)]" size={20} />
                <h2 className="text-h3">V. Previous Registration Details</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-label text-[var(--eai-text)]">Application No.</label>
                  <input
                    value={formData.application_no}
                    onChange={(e) => handleInputChange('application_no', e.target.value)}
                    className="apple-input"
                    placeholder="Enter application number"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label text-[var(--eai-text)]">Registration No.</label>
                  <input
                    value={formData.registration_no}
                    onChange={(e) => handleInputChange('registration_no', e.target.value)}
                    className="apple-input"
                    placeholder="Enter registration number"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label text-[var(--eai-text)]">Registration Date</label>
                  <input
                    type="date"
                    value={formData.registration_date}
                    onChange={(e) => handleInputChange('registration_date', e.target.value)}
                    className="apple-input"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section V/VI: Disclaimer/Priority (Application Only) */}
          {formType === 'APPLICATION' && (
            <>
              <section className="apple-card p-6 space-y-6" id="disclaimer-section">
                <div className="flex items-center gap-2 border-b border-[var(--eai-border)] pb-4">
                  <Database className="text-[var(--eai-primary)]" size={20} />
                  <h2 className="text-h3">V. Disclaimer</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-label text-[var(--eai-text)]">የመብት ገደብ (Amharic Disclaimer)</label>
                    <input
                      value={formData.disclaimer_text_amharic}
                      onChange={(e) => handleInputChange('disclaimer_text_amharic', e.target.value)}
                      className="apple-input font-amharic"
                      placeholder="የመብት ገደቡን እዚህ ያስገቡ..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-label text-[var(--eai-text)]">Disclaimer Text (English)</label>
                    <input
                      value={formData.disclaimer_text_english}
                      onChange={(e) => handleInputChange('disclaimer_text_english', e.target.value)}
                      className="apple-input"
                      placeholder="e.g. No claim to exclusive right of use of..."
                    />
                  </div>
                </div>
              </section>

              <section className="apple-card p-6 space-y-6" id="priority-section">
                <div className="flex items-center gap-2 border-b border-[var(--eai-border)] pb-4">
                  <Tag className="text-[var(--eai-primary)]" size={20} />
                  <h2 className="text-h3">VI. Priority Right Declaration</h2>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-label text-[var(--eai-text)]">Priority Application Date</label>
                      <input
                        type="date"
                        value={formData.priority_application_filing_date}
                        onChange={(e) => handleInputChange('priority_application_filing_date', e.target.value)}
                        className="apple-input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-label text-[var(--eai-text)]">Priority Filing Date</label>
                      <input
                        type="date"
                        value={formData.priority_filing_date}
                        onChange={(e) => handleInputChange('priority_filing_date', e.target.value)}
                        className="apple-input"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-label text-[var(--eai-text)]">Priority Country</label>
                      <input
                        value={formData.priority_country}
                        onChange={(e) => handleInputChange('priority_country', e.target.value)}
                        className="apple-input"
                        placeholder="Enter country"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-label text-[var(--eai-text)]">Priority Goods & Services</label>
                      <textarea
                        value={formData.priority_goods_services}
                        onChange={(e) => handleInputChange('priority_goods_services', e.target.value)}
                        className="apple-input w-full min-h-[60px] py-2"
                        placeholder="Covered goods/services..."
                      />
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Section VII: Checklist */}
          <section className="apple-card p-6 space-y-6" id="checklist-section">
            <div className="flex items-center gap-2 border-b border-[var(--eai-border)] pb-4">
              <FileText className="text-[var(--eai-primary)]" size={20} />
              <h2 className="text-h3">{formType === 'APPLICATION' ? 'VII.' : 'VII.'} Checklist & Signature</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-y-3">
                {[
                  { id: 'chk_list_copies', label: '3 Identical Copies of Mark' },
                  { id: 'chk_list_statutes', label: 'Statutes Governing Mark Use' },
                  { id: 'chk_list_poa', label: 'Power of Attorney' },
                  { id: 'chk_list_priority_docs', label: 'Priority Documents' },
                  { id: 'chk_list_drawing', label: 'Mark Drawing (3D Features)' },
                  { id: 'chk_list_payment', label: 'Proof of Payment' },
                  { id: 'chk_list_other', label: 'Other Document(s)' }
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData[opt.id as keyof EipaFormData] as boolean}
                      onChange={(e) => handleInputChange(opt.id as keyof EipaFormData, e.target.checked)}
                      className="h-5 w-5 rounded-xl border-[var(--eai-border)] text-[var(--eai-primary)] focus:ring-[var(--eai-primary)]"
                    />
                    <span className="text-body group-hover:text-[var(--eai-primary)] transition-colors">{opt.label}</span>
                  </label>
                ))}
              </div>

              {formData.chk_list_other && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                  <label className="text-label text-[var(--eai-text)]">Specify Other Documents</label>
                  <input
                    value={formData.other_documents_text}
                    onChange={(e) => handleInputChange('other_documents_text', e.target.value)}
                    className="apple-input"
                    placeholder="List documents separated by commas"
                  />
                </div>
              )}

              <div className="space-y-1.5 pt-4 border-t border-[var(--eai-border)]">
                <label className="text-label text-[var(--eai-text)]">Applicant Signature Name</label>
                <input
                  value={formData.applicant_signature}
                  onChange={(e) => handleInputChange('applicant_signature', e.target.value)}
                  className="apple-input"
                  placeholder="Typed name for signature"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-label text-[var(--eai-text)]">Day</label>
                  <input
                    value={formData.applicant_sign_day_en}
                    onChange={(e) => handleInputChange('applicant_sign_day_en', e.target.value)}
                    className="apple-input"
                    placeholder="DD"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label text-[var(--eai-text)]">Month</label>
                  <input
                    value={formData.applicant_sign_month_en}
                    onChange={(e) => handleInputChange('applicant_sign_month_en', e.target.value)}
                    className="apple-input"
                    placeholder="Month name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label text-[var(--eai-text)]">Year</label>
                  <input
                    value={formData.applicant_sign_year_en}
                    onChange={(e) => handleInputChange('applicant_sign_year_en', e.target.value)}
                    className="apple-input"
                    placeholder="YYYY"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Side: Preview or Tag Inspector */}
        <div className="flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
            {showPreview ? (
              <motion.div
                key="preview"
                id="pdf-preview-section"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="apple-card border-none bg-black/5 dark:bg-white/5 flex flex-col h-full overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--eai-border)] shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isGenerating ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-micro font-bold uppercase tracking-tight opacity-70">Live Preview</span>
                  </div>
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-micro font-medium animate-pulse text-[var(--eai-primary)]">
                      <RefreshCcw size={12} className="animate-spin" />
                      Syncing...
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-[var(--eai-bg)] relative overflow-hidden">
                  {previewUrl ? (
                    <iframe
                      src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                      className="w-full h-full border-none"
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                      <FileText size={48} className="text-[var(--eai-text-secondary)] opacity-20 mb-4" />
                      <p className="text-body text-[var(--eai-text-secondary)]">Generating initial preview...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : showFields ? (
              <motion.div
                key="fields"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="apple-card overflow-hidden flex flex-col h-full"
              >
                <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={18} className="text-[var(--eai-primary)]" />
                    <h2 className="text-[17px] font-bold">Detected Field Tags</h2>
                  </div>
                  <span className="text-[12px] font-bold text-[var(--eai-text-secondary)] uppercase tracking-widest">
                    {availableFields.length} Tags
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                  {availableFields.map(tag => (
                    <div key={tag} className="flex items-center justify-between p-3 rounded-none border border-[var(--eai-border)] bg-[var(--eai-bg)]/50 group">
                      <code className="text-[13px] font-mono font-bold text-[var(--eai-primary)]">{tag}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tag);
                          addToast({
                            title: 'Copied',
                            description: `Copied: ${tag}`,
                            type: 'success'
                          });
                        }}
                        className="text-[10px] font-black uppercase text-[var(--eai-text-secondary)] hover:text-[var(--eai-primary)]"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
