import type { ApplicantType } from '@/shared/database';

export interface Client {
  id: string;
  name: string;
  local_name?: string;
  type: ApplicantType;
  nationality: string;
  residence_country?: string;
  email: string;
  address_street: string;
  address_zone?: string;
  wereda?: string;
  city: string;
  house_no?: string;
  zip_code: string;
  po_box?: string;
  telephone?: string;
  fax?: string;
  created_at: string;
}

export interface EipaFormData {
  // Page 1
  applicant_name_english: string;
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
  agent_name: string;
  agent_country: string;
  agent_city: string;
  agent_subcity: string;
  agent_wereda: string;
  agent_house_no: string;
  agent_telephone: string;
  agent_email: string;
  agent_po_box: string;
  agent_fax: string;
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
  goods_services_list: string;
  disclaimer_text_amharic: string;
  disclaimer_text_english: string;
  priority_filing_date_1: string;
  priority_filing_date: string;
  priority_country: string;
  chk_priority_accompanies: boolean;
  chk_priority_submitted_later: boolean;
  chk_list_copies: boolean;
  chk_list_status: boolean;
  chk_list_poa: boolean;
  chk_list_priority_docs: boolean;
  chk_list_drawing: boolean;
  chk_list_payment: boolean;
  chk_list_other: boolean;
  other_documents_text: string;
  applicant_sign_day_en: string;
  applicant_sign_month: string;
  applicant_sign_year_en: string;
  "Text Field": string;

  // Application Goods & Services (6 lines matching PDF)
  goods_services_list_1: string;
  goods_services_list_2: string;
  goods_services_list_3: string;
  goods_services_list_4: string;
  goods_services_list_5: string;
  goods_services_list_6: string;

  // Priority
  priority_right_declaration: string;

  // Renewal Fields
  renewal_applicant_name?: string;
  renewal_applicant_name_amharic?: string;
  renewal_address_street?: string;
  renewal_address_zone?: string;
  renewal_city_code?: string;
  renewal_city_name?: string;
  renewal_state_code?: string;
  renewal_state_name?: string;
  renewal_zip_code?: string;
  renewal_wereda?: string;
  renewal_house_no?: string;
  renewal_telephone?: string;
  renewal_email?: string;
  renewal_fax?: string;
  renewal_po_box?: string;
  renewal_nationality?: string;
  renewal_residence_country?: string;
  renewal_chk_female?: boolean;
  renewal_chk_male?: boolean;
  renewal_chk_company?: boolean;

  // Renewal Agent Fields
  renewal_agent_name?: string;
  renewal_agent_country?: string;
  renewal_agent_city?: string;
  renewal_agent_subcity?: string;
  renewal_agent_email?: string;
  renewal_agent_pobox?: string;
  renewal_agent_wereda?: string;
  renewal_agent_telephone?: string;
  renewal_agent_house_no?: string;
  renewal_agent_fax?: string;

  // Renewal Mark Fields
  renewal_chk_goods_mark?: boolean;
  renewal_chk_service_mark?: boolean;
  renewal_chk_collective_mark?: boolean;
  renewal_mark_logo?: string;
  renewal_app_no?: string;
  renewal_reg_no?: string;
  renewal_reg_date?: string;

  // Renewal Goods & Services
  renewal_goods_services_1?: string;
  renewal_goods_services_2?: string;
  renewal_goods_services_3?: string;
  renewal_goods_services_4?: string;
  renewal_goods_services_5?: string;
  renewal_goods_services_6?: string;

  // Renewal Signature
  renewal_sign_day?: string;
  renewal_sign_month?: string;
  renewal_sign_year?: string;

  // Legacy/Other
  renewal_auth_app_no?: string;
  renewal_auth_filing_date?: string;
  renewal_auth_receipt_date?: string;
  renewal_auth_approved_by?: string;
}


export type FormType = 'APPLICATION' | 'RENEWAL';
