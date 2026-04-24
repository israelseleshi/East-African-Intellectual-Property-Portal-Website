// Re-export types from original location for backward compatibility
export type { Client, EipaFormData, FormType } from '@/pages/FormAutomation/types';

// Form data group types
export interface ApplicantFormData {
  applicant_name_english: string;
  applicant_name_amharic: string;
  address_street: string;
  address_zone: string;
  city_code: string;
  state_code: string;
  city_name: string;
  state_name: string;
  zip_code: string;
  house_no: string;
  telephone: string;
  po_box: string;
  wereda: string;
  email: string;
  fax: string;
  nationality: string;
  residence_country: string;
  chk_female: boolean;
  chk_male: boolean;
  chk_company: boolean;
  applicant_sign_day: string;
  applicant_sign_month: string;
  applicant_sign_year_en: string;
}

export interface AgentFormData {
  agent_name: string;
  agent_country: string;
  agent_city: string;
  agent_subcity: string;
  agent_woreda: string;
  agent_house_no: string;
  agent_telephone: string;
  agent_fax: string;
  agent_po_box: string;
  agent_email: string;
}

export interface MarkFormData {
  chk_goods: boolean;
  chk_services: boolean;
  chk_collective: boolean;
  mark_type_figurative: boolean;
  mark_type_word: boolean;
  mark_type_mixed: boolean;
  mark_type_three_dim: boolean;
  mark_description: string;
  mark_translation: string;
  mark_transliteration: string;
  mark_language_requiring_traslation: string;
  mark_has_three_dim_features: string;
  mark_color_indication: string;
  image_field: string;
}

export interface ClassificationFormData {
  goods_services_list_1: string;
  goods_services_list_2: string;
  goods_services_list_3: string;
  goods_services_list_4: string;
  goods_services_list_5: string;
  goods_services_list_6: string;
  disclaimer_text_amharic: string;
  disclaimer_text_english: string;
}

export interface PriorityFormData {
  priority_filing_date: string;
  priority_country: string;
  goods_and_services_covered_by_the_previous_application: string;
  priority_right_declaration: string;
  chk_priority_accompanies: boolean;
  chk_priority_submitted_later: boolean;
}

export interface ChecklistFormData {
  chk_list_copies: boolean;
  chk_list_status: boolean;
  chk_list_poa: boolean;
  chk_list_priority_docs: boolean;
  chk_list_drawing: boolean;
  chk_list_payment: boolean;
  chk_list_other: boolean;
  other_documents_text: string;
}

export interface RenewalApplicantFormData {
  renewal_applicant_name: string;
  renewal_applicant_name_amharic: string;
  renewal_address_street: string;
  renewal_address_zone: string;
  renewal_city_code: string;
  renewal_city_name: string;
  renewal_state_code: string;
  renewal_state_name: string;
  renewal_zip_code: string;
  renewal_wereda: string;
  renewal_house_no: string;
  renewal_telephone: string;
  renewal_email: string;
  renewal_fax: string;
  renewal_po_box: string;
  renewal_nationality: string;
  renewal_residence_country: string;
  renewal_chk_female: boolean;
  renewal_chk_male: boolean;
  renewal_chk_company: boolean;
}

export interface RenewalAgentFormData {
  renewal_agent_name: string;
  renewal_agent_country: string;
  renewal_agent_city: string;
  renewal_agent_subcity: string;
  renewal_agent_email: string;
  renewal_agent_pobox: string;
  renewal_agent_wereda: string;
  renewal_agent_telephone: string;
  renewal_agent_house_no: string;
  renewal_agent_fax: string;
}

export interface RenewalMarkFormData {
  renewal_chk_goods_mark: boolean;
  renewal_chk_service_mark: boolean;
  renewal_chk_collective_mark: boolean;
  renewal_mark_logo: string;
}

export interface RenewalClassificationFormData {
  renewal_goods_services_1: string;
  renewal_goods_services_2: string;
  renewal_goods_services_3: string;
  renewal_goods_services_4: string;
  renewal_goods_services_5: string;
  renewal_goods_services_6: string;
}

export interface RenewalSignatureFormData {
  renewal_sign_day: string;
  renewal_sign_month: string;
  renewal_sign_year: string;
}

export interface RenewalCaseFormData {
  renewal_app_no: string;
  renewal_reg_no: string;
  renewal_reg_date: string;
}
