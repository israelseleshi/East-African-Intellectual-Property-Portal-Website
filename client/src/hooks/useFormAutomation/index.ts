import React, { useMemo, useCallback } from 'react';
import { useApplicantData } from './useApplicantData';
import { useAgentData } from './useAgentData';
import { useMarkData } from './useMarkData';
import { useClassificationData } from './useClassificationData';
import { usePriorityData } from './usePriorityData';
import { useChecklistData } from './useChecklistData';
import { useRenewalData } from './useRenewalData';
import { usePreviewState } from './usePreviewState';
import { clientService } from '@/utils/api';
import type { FormType, EipaFormData } from './types';
import type { Client } from '@/pages/FormAutomation/types';

// Re-export types
export * from './types';

export interface UseFormAutomationReturn {
  formType: FormType;
  setFormType: (type: FormType) => void;
  formData: EipaFormData;
  setFormData: (update: Partial<EipaFormData> | ((prev: EipaFormData) => EipaFormData)) => void;
  applicant: ReturnType<typeof useApplicantData>;
  agent: ReturnType<typeof useAgentData>;
  mark: ReturnType<typeof useMarkData>;
  classification: ReturnType<typeof useClassificationData>;
  priority: ReturnType<typeof usePriorityData>;
  checklist: ReturnType<typeof useChecklistData>;
  renewal: ReturnType<typeof useRenewalData>;
  preview: ReturnType<typeof usePreviewState>;
  // Backward compatibility: spread preview properties at top level
  availableFields: string[];
  setAvailableFields: React.Dispatch<React.SetStateAction<string[]>>;
  showFields: boolean;
  setShowFields: React.Dispatch<React.SetStateAction<boolean>>;
  previewUrl: string | null;
  previewLoading: boolean;
  previewError: string | null;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  showPreview: boolean;
  setShowPreview: React.Dispatch<React.SetStateAction<boolean>>;
  generatePreview: () => Promise<void>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  selectedClientId: string;
  setSelectedClientId: React.Dispatch<React.SetStateAction<string>>;
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  niceClasses: number[];
  setNiceClasses: React.Dispatch<React.SetStateAction<number[]>>;
  markImageBase64: string | null;
  setMarkImageBase64: React.Dispatch<React.SetStateAction<string | null>>;
  markImageFile: File | null;
  setMarkImageFile: React.Dispatch<React.SetStateAction<File | null>>;
}

export function useFormAutomation(): UseFormAutomationReturn {
  const [formType, setFormType] = React.useState<FormType>('APPLICATION');
  const [clients, setClients] = React.useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [niceClasses, setNiceClasses] = React.useState<number[]>([]);
  const [markImageBase64, setMarkImageBase64] = React.useState<string | null>(null);
  const [markImageFile, setMarkImageFile] = React.useState<File | null>(null);
  const [showFields, setShowFields] = React.useState(false);

  // Split hooks for form data
  const applicant = useApplicantData();
  const agent = useAgentData();
  const mark = useMarkData();
  const classification = useClassificationData();
  const priority = usePriorityData();
  const checklist = useChecklistData();
  const renewal = useRenewalData();
  
  // Fetch clients on mount
  React.useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await clientService.getClients();
        // The API returns { data: Client[], meta: ... } or just Client[] depending on the endpoint
        const clientData = Array.isArray(response) ? response : (response?.data || []);
        setClients(clientData);
      } catch (error) {
        console.error('Failed to fetch clients in useFormAutomation:', error);
      }
    };
    fetchClients();
  }, []);

  // Combined form data for PDF submission (application mode)
  const applicationFormData = useMemo<EipaFormData>(() => ({
    // Applicant data
    ...applicant.data,
    // Agent data
    ...agent.data,
    // Mark data
    ...mark.data,
    // Classification data
    ...classification.data,
    // Priority data
    ...priority.data,
    // Checklist data
    ...checklist.data,
  }), [
    applicant.data,
    agent.data,
    mark.data,
    classification.data,
    priority.data,
    checklist.data,
  ]);

  // Combined form data for PDF submission (renewal mode)
  const renewalFormData = useMemo(() => ({
    // Renewal applicant data
    ...renewal.applicant.data,
    // Renewal agent data
    ...renewal.agent.data,
    // Renewal mark data
    ...renewal.mark.data,
    // Renewal classification data
    ...renewal.classification.data,
    // Renewal signature data
    ...renewal.signature.data,
    // Renewal case data
    ...renewal.caseData.data,
  }), [
    renewal.applicant.data,
    renewal.agent.data,
    renewal.mark.data,
    renewal.classification.data,
    renewal.signature.data,
    renewal.caseData.data,
  ]);

  // Use appropriate form data based on form type
  const formData = useMemo(() => {
    return formType === 'RENEWAL' ? { ...applicationFormData, ...renewalFormData } : applicationFormData;
  }, [formType, applicationFormData, renewalFormData]);

  // Backward compatible setFormData that updates individual sub-hooks
  const setFormData = useCallback((update: Partial<EipaFormData> | ((prev: EipaFormData) => EipaFormData)) => {
    const updates: Partial<EipaFormData> = typeof update === 'function' ? update(formData) : update;
    
    // Update applicant data
    applicant.setData(prev => ({
      ...prev,
      applicant_name_english: updates.applicant_name_english ?? prev.applicant_name_english,
      applicant_name_amharic: updates.applicant_name_amharic ?? prev.applicant_name_amharic,
      address_street: updates.address_street ?? prev.address_street,
      address_zone: updates.address_zone ?? prev.address_zone,
      city_code: updates.city_code ?? prev.city_code,
      state_code: updates.state_code ?? prev.state_code,
      city_name: updates.city_name ?? prev.city_name,
      state_name: updates.state_name ?? prev.state_name,
      zip_code: updates.zip_code ?? prev.zip_code,
      house_no: updates.house_no ?? prev.house_no,
      telephone: updates.telephone ?? prev.telephone,
      po_box: updates.po_box ?? prev.po_box,
      wereda: updates.wereda ?? prev.wereda,
      email: updates.email ?? prev.email,
      fax: updates.fax ?? prev.fax,
      nationality: updates.nationality ?? prev.nationality,
      residence_country: updates.residence_country ?? prev.residence_country,
      chk_female: updates.chk_female ?? prev.chk_female,
      chk_male: updates.chk_male ?? prev.chk_male,
      chk_company: updates.chk_company ?? prev.chk_company,
      applicant_sign_day: updates.applicant_sign_day ?? prev.applicant_sign_day,
      applicant_sign_month: updates.applicant_sign_month ?? prev.applicant_sign_month,
      applicant_sign_year_en: updates.applicant_sign_year_en ?? prev.applicant_sign_year_en,
    }));

    // Update renewal applicant data
    renewal.applicant.setData(prev => ({
      ...prev,
      renewal_applicant_name: updates.renewal_applicant_name ?? prev.renewal_applicant_name,
      renewal_applicant_name_amharic: updates.renewal_applicant_name_amharic ?? prev.renewal_applicant_name_amharic,
      renewal_address_street: updates.renewal_address_street ?? prev.renewal_address_street,
      renewal_address_zone: updates.renewal_address_zone ?? prev.renewal_address_zone,
      renewal_city_code: updates.renewal_city_code ?? prev.renewal_city_code,
      renewal_city_name: updates.renewal_city_name ?? prev.renewal_city_name,
      renewal_state_code: updates.renewal_state_code ?? prev.renewal_state_code,
      renewal_state_name: updates.renewal_state_name ?? prev.renewal_state_name,
      renewal_zip_code: updates.renewal_zip_code ?? prev.renewal_zip_code,
      renewal_wereda: updates.renewal_wereda ?? prev.renewal_wereda,
      renewal_house_no: updates.renewal_house_no ?? prev.renewal_house_no,
      renewal_telephone: updates.renewal_telephone ?? prev.renewal_telephone,
      renewal_email: updates.renewal_email ?? prev.renewal_email,
      renewal_fax: updates.renewal_fax ?? prev.renewal_fax,
      renewal_po_box: updates.renewal_po_box ?? prev.renewal_po_box,
      renewal_nationality: updates.renewal_nationality ?? prev.renewal_nationality,
      renewal_residence_country: updates.renewal_residence_country ?? prev.renewal_residence_country,
      renewal_chk_female: updates.renewal_chk_female ?? prev.renewal_chk_female,
      renewal_chk_male: updates.renewal_chk_male ?? prev.renewal_chk_male,
      renewal_chk_company: updates.renewal_chk_company ?? prev.renewal_chk_company,
    }));

    // Update agent data
    agent.setData(prev => ({
      ...prev,
      agent_name: updates.agent_name ?? prev.agent_name,
      agent_country: updates.agent_country ?? prev.agent_country,
      agent_city: updates.agent_city ?? prev.agent_city,
      agent_subcity: updates.agent_subcity ?? prev.agent_subcity,
      agent_woreda: updates.agent_woreda ?? prev.agent_woreda,
      agent_house_no: updates.agent_house_no ?? prev.agent_house_no,
      agent_telephone: updates.agent_telephone ?? prev.agent_telephone,
      agent_fax: updates.agent_fax ?? prev.agent_fax,
      agent_po_box: updates.agent_po_box ?? prev.agent_po_box,
      agent_email: updates.agent_email ?? prev.agent_email,
    }));

    // Update renewal agent data
    renewal.agent.setData(prev => ({
      ...prev,
      renewal_agent_name: updates.renewal_agent_name ?? prev.renewal_agent_name,
      renewal_agent_country: updates.renewal_agent_country ?? prev.renewal_agent_country,
      renewal_agent_city: updates.renewal_agent_city ?? prev.renewal_agent_city,
      renewal_agent_subcity: updates.renewal_agent_subcity ?? prev.renewal_agent_subcity,
      renewal_agent_email: updates.renewal_agent_email ?? prev.renewal_agent_email,
      renewal_agent_pobox: updates.renewal_agent_pobox ?? prev.renewal_agent_pobox,
      renewal_agent_wereda: updates.renewal_agent_wereda ?? prev.renewal_agent_wereda,
      renewal_agent_telephone: updates.renewal_agent_telephone ?? prev.renewal_agent_telephone,
      renewal_agent_house_no: updates.renewal_agent_house_no ?? prev.renewal_agent_house_no,
      renewal_agent_fax: updates.renewal_agent_fax ?? prev.renewal_agent_fax,
    }));

    // Update mark data
    mark.setData(prev => ({
      ...prev,
      chk_goods: updates.chk_goods ?? prev.chk_goods,
      chk_services: updates.chk_services ?? prev.chk_services,
      chk_collective: updates.chk_collective ?? prev.chk_collective,
      mark_type_figurative: updates.mark_type_figurative ?? prev.mark_type_figurative,
      mark_type_word: updates.mark_type_word ?? prev.mark_type_word,
      mark_type_mixed: updates.mark_type_mixed ?? prev.mark_type_mixed,
      mark_type_three_dim: updates.mark_type_three_dim ?? prev.mark_type_three_dim,
      mark_description: updates.mark_description ?? prev.mark_description,
      mark_translation: updates.mark_translation ?? prev.mark_translation,
      mark_transliteration: updates.mark_transliteration ?? prev.mark_transliteration,
      mark_language_requiring_traslation: updates.mark_language_requiring_traslation ?? prev.mark_language_requiring_traslation,
      mark_has_three_dim_features: updates.mark_has_three_dim_features ?? prev.mark_has_three_dim_features,
      mark_color_indication: updates.mark_color_indication ?? prev.mark_color_indication,
      image_field: updates.image_field ?? prev.image_field,
    }));

    // Update renewal mark data
    renewal.mark.setData(prev => ({
      ...prev,
      renewal_chk_goods_mark: updates.renewal_chk_goods_mark ?? prev.renewal_chk_goods_mark,
      renewal_chk_service_mark: updates.renewal_chk_service_mark ?? prev.renewal_chk_service_mark,
      renewal_chk_collective_mark: updates.renewal_chk_collective_mark ?? prev.renewal_chk_collective_mark,
      renewal_mark_logo: updates.renewal_mark_logo ?? prev.renewal_mark_logo,
    }));

    // Update classification/disclaimer data
    classification.setData(prev => ({
      ...prev,
      goods_services_list_1: updates.goods_services_list_1 ?? prev.goods_services_list_1,
      goods_services_list_2: updates.goods_services_list_2 ?? prev.goods_services_list_2,
      goods_services_list_3: updates.goods_services_list_3 ?? prev.goods_services_list_3,
      goods_services_list_4: updates.goods_services_list_4 ?? prev.goods_services_list_4,
      goods_services_list_5: updates.goods_services_list_5 ?? prev.goods_services_list_5,
      goods_services_list_6: updates.goods_services_list_6 ?? prev.goods_services_list_6,
      disclaimer_text_amharic: updates.disclaimer_text_amharic ?? prev.disclaimer_text_amharic,
      disclaimer_text_english: updates.disclaimer_text_english ?? prev.disclaimer_text_english,
    }));

    // Update priority data
    priority.setData(prev => ({
      ...prev,
      priority_filing_date: updates.priority_filing_date ?? prev.priority_filing_date,
      priority_country: updates.priority_country ?? prev.priority_country,
      goods_and_services_covered_by_the_previous_application:
        updates.goods_and_services_covered_by_the_previous_application
        ?? prev.goods_and_services_covered_by_the_previous_application,
      priority_right_declaration: updates.priority_right_declaration ?? prev.priority_right_declaration,
      chk_priority_accompanies: updates.chk_priority_accompanies ?? prev.chk_priority_accompanies,
      chk_priority_submitted_later: updates.chk_priority_submitted_later ?? prev.chk_priority_submitted_later,
    }));

    // Update checklist data
    checklist.setData(prev => ({
      ...prev,
      chk_list_copies: updates.chk_list_copies ?? prev.chk_list_copies,
      chk_list_status: updates.chk_list_status ?? prev.chk_list_status,
      chk_list_poa: updates.chk_list_poa ?? prev.chk_list_poa,
      chk_list_priority_docs: updates.chk_list_priority_docs ?? prev.chk_list_priority_docs,
      chk_list_drawing: updates.chk_list_drawing ?? prev.chk_list_drawing,
      chk_list_payment: updates.chk_list_payment ?? prev.chk_list_payment,
      chk_list_other: updates.chk_list_other ?? prev.chk_list_other,
      other_documents_text: updates.other_documents_text ?? prev.other_documents_text,
    }));

    // Update renewal classification data
    renewal.classification.setData(prev => ({
      ...prev,
      renewal_goods_services_1: updates.renewal_goods_services_1 ?? prev.renewal_goods_services_1,
      renewal_goods_services_2: updates.renewal_goods_services_2 ?? prev.renewal_goods_services_2,
      renewal_goods_services_3: updates.renewal_goods_services_3 ?? prev.renewal_goods_services_3,
      renewal_goods_services_4: updates.renewal_goods_services_4 ?? prev.renewal_goods_services_4,
      renewal_goods_services_5: updates.renewal_goods_services_5 ?? prev.renewal_goods_services_5,
      renewal_goods_services_6: updates.renewal_goods_services_6 ?? prev.renewal_goods_services_6,
    }));

    // Update signature/case data if present
    if (updates.renewal_app_no !== undefined || updates.renewal_reg_no !== undefined || updates.renewal_reg_date !== undefined) {
      renewal.caseData.setData(prev => ({
        ...prev,
        renewal_app_no: updates.renewal_app_no ?? prev.renewal_app_no,
        renewal_reg_no: updates.renewal_reg_no ?? prev.renewal_reg_no,
        renewal_reg_date: updates.renewal_reg_date ?? prev.renewal_reg_date,
      }));
    }

    if (updates.renewal_sign_day !== undefined || updates.renewal_sign_month !== undefined || updates.renewal_sign_year !== undefined) {
      renewal.signature.setData(prev => ({
        ...prev,
        renewal_sign_day: updates.renewal_sign_day ?? prev.renewal_sign_day,
        renewal_sign_month: updates.renewal_sign_month ?? prev.renewal_sign_month,
        renewal_sign_year: updates.renewal_sign_year ?? prev.renewal_sign_year,
      }));
    }
  }, [formData, applicant, renewal, agent, mark, classification, priority, checklist]);


  // Preview state
  const preview = usePreviewState(formType, formData as unknown as Record<string, unknown>);

  return {
    formType,
    setFormType,
    formData,
    setFormData,
    applicant,
    agent,
    mark,
    classification,
    priority,
    checklist,
    renewal,
    preview,
    // Backward compatibility: spread preview properties
    availableFields: preview.availableFields,
    setAvailableFields: preview.setAvailableFields,
    showFields,
    setShowFields,
    previewUrl: preview.previewUrl,
    previewLoading: preview.previewLoading,
    previewError: preview.previewError,
    zoom: preview.zoom,
    setZoom: preview.setZoom,
    showPreview: preview.showPreview,
    setShowPreview: preview.setShowPreview,
    generatePreview: preview.generatePreview,
    clients,
    setClients,
    selectedClientId,
    setSelectedClientId,
    isSubmitting,
    setIsSubmitting,
    niceClasses,
    setNiceClasses,
    markImageBase64,
    setMarkImageBase64,
    markImageFile,
    setMarkImageFile,
  };
}
