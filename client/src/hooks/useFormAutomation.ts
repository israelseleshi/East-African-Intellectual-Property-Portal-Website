import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { trademarkService, clientService } from '../utils/api';
import { useToast } from '../components/ui/toast';
import { useApi } from '../hooks/useApi';
import { fillPdfForm } from '../utils/pdfUtils';
import { EipaFormData, Client, FormType } from '../pages/FormAutomation/types';

export function useFormAutomation() {
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const api = useApi();

  const [formType, setFormType] = useState<FormType>(
    location.pathname.includes('renewal-form') ? 'RENEWAL' : 'APPLICATION'
  );

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [showFields, setShowFields] = useState(false);
  const [niceClasses, setNiceClasses] = useState<number[]>([]);
  const [markImageBase64, setMarkImageBase64] = useState<string | null>(null);

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

  // Live Preview States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showPreview, setShowPreview] = useState(true);

  const generatePreview = useCallback(async () => {
    if (!showPreview) return;
    
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
      const pdfBytes = await fillPdfForm(pdfFile, formData as unknown as Record<string, unknown>, false);
      
      if (pdfBytes && pdfBytes.length > 0) {
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
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

  useEffect(() => {
    const newType = location.pathname.includes('renewal-form') ? 'RENEWAL' : 'APPLICATION';
    if (newType !== formType) {
      setFormType(newType);
    }
  }, [location.pathname, formType]);

  useEffect(() => {
    setPreviewUrl(null);
    setPreviewError(null);
    setPreviewLoading(true);
    generatePreview();
  }, [formType, generatePreview]);

  return {
    formType,
    setFormType,
    formData,
    setFormData,
    clients,
    setClients,
    selectedClientId,
    setSelectedClientId,
    isSubmitting,
    setIsSubmitting,
    availableFields,
    setAvailableFields,
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
  };
}
