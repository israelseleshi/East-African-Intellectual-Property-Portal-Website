import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { trademarkService, clientService } from '../utils/api';
import { useToast } from '../components/ui/toast';
import { useApi } from '../hooks/useApi';
import { fillPdfForm, getPdfFields } from '../utils/pdfUtils';
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
    applicant_name_english: '',
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
    agent_name: '',
    agent_country: '',
    agent_city: '',
    agent_subcity: '',
    agent_wereda: '',
    agent_house_no: '',
    agent_telephone: '',
    agent_email: '',
    agent_po_box: '',
    agent_fax: '',
    chk_goods: false,
    chk_services: false,
    chk_collective: false,
    mark_type_figurative: false,
    mark_type_word: false,
    mark_type_mixed: false,
    mark_type_three_dim: false,
    mark_description: '',
    mark_translation: '',
    mark_transliteration: '',
    mark_language_requiring_traslation: '',
    mark_has_three_dim_features: '',
    mark_color_indication: '',
    image_field: '',
    goods_services_list: '',
    disclaimer_text_amharic: '',
    disclaimer_text_english: '',
    priority_filing_date_1: '',
    priority_filing_date: '',
    priority_country: '',
    chk_priority_accompanies: false,
    chk_priority_submitted_later: false,
    chk_list_copies: false,
    chk_list_status: false,
    chk_list_poa: false,
    chk_list_priority_docs: false,
    chk_list_drawing: false,
    chk_list_payment: false,
    chk_list_other: false,
    other_documents_text: '',
    applicant_sign_day_en: '',
    applicant_sign_month: '',
    applicant_sign_year_en: '',
    "Text Field": '',
    goods_services_list_1: '',
    goods_services_list_2: '',
    goods_services_list_3: '',
    goods_services_list_4: '',
    goods_services_list_5: '',
    goods_services_list_6: '',
    priority_right_declaration: '',
    renewal_applicant_name: '',
    renewal_applicant_name_amharic: '',
    renewal_address_street: '',
    renewal_address_zone: '',
    renewal_city_name: '',
    renewal_city_code: '',
    renewal_state_name: '',
    renewal_state_code: '',
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
    renewal_agent_country: '',
    renewal_agent_city: '',
    renewal_agent_subcity: '',
    renewal_agent_wereda: '',
    renewal_agent_house_no: '',
    renewal_agent_telephone: '',
    renewal_agent_email: '',
    renewal_agent_pobox: '',
    renewal_agent_fax: '',
    renewal_chk_goods_mark: false,
    renewal_chk_service_mark: false,
    renewal_chk_collective_mark: false,
    renewal_mark_logo: '',
    renewal_app_no: '',
    renewal_reg_no: '',
    renewal_reg_date: '',
    renewal_goods_services_1: '',
    renewal_goods_services_2: '',
    renewal_goods_services_3: '',
    renewal_goods_services_4: '',
    renewal_goods_services_5: '',
    renewal_goods_services_6: '',
    renewal_sign_day: '',
    renewal_sign_month: '',
    renewal_sign_year: '',
    renewal_auth_app_no: '',
    renewal_auth_filing_date: '',
    renewal_auth_receipt_date: '',
    renewal_auth_approved_by: '',
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

  const loadAvailableFields = useCallback(async () => {
    try {
      const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
      const fields = await getPdfFields(pdfFile);
      setAvailableFields(fields.map(f => f.name));
    } catch (error) {
      // Keep the UI usable even if inspection fails (e.g., fetch blocked).
      console.warn('Failed to load PDF fields for inspection:', error);
      setAvailableFields([]);
    }
  }, [formType]);

  const loadClients = useCallback(async () => {
    try {
      const result = await clientService.getClients({ page: 1, limit: 500 });
      const data = (result && typeof result === 'object' && 'data' in (result as any))
        ? (result as any).data
        : result;
      setClients(Array.isArray(data) ? (data as Client[]) : []);
    } catch (error) {
      console.warn('Failed to load clients for quick load:', error);
      setClients([]);
    }
  }, []);

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

  useEffect(() => {
    // Load inspection tags for the selected PDF template.
    loadAvailableFields();
  }, [loadAvailableFields]);

  useEffect(() => {
    // Populate the "Quick load client" dropdown in the form pages.
    loadClients();
  }, [loadClients]);

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
