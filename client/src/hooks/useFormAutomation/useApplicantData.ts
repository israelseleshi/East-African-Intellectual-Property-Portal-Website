import { useState, useCallback } from 'react';
import type { ApplicantFormData } from './types';

const initialApplicantData: ApplicantFormData = {
  applicant_name_english: '',
  applicant_name_amharic: '',
  address_street: '',
  address_zone: '',
  city_code: '',
  state_code: '',
  city_name: '',
  state_name: '',
  zip_code: '',
  house_no: '',
  telephone: '',
  po_box: '',
  wereda: '',
  email: '',
  fax: '',
  nationality: '',
  residence_country: '',
  chk_female: false,
  chk_male: false,
  chk_company: false,
  applicant_sign_day: '',
  applicant_sign_month: '',
  applicant_sign_year_en: '',
};

export interface UseApplicantDataReturn {
  data: ApplicantFormData;
  updateField: (field: keyof ApplicantFormData, value: ApplicantFormData[keyof ApplicantFormData]) => void;
  updateMultiple: (updates: Partial<ApplicantFormData>) => void;
  loadFromClient: (client: {
    name: string;
    local_name?: string;
    nationality?: string;
    email?: string;
    address_street?: string;
    address_zone?: string;
    city?: string;
    city_code?: string;
    state_name?: string;
    state_code?: string;
    zip_code?: string;
    wereda?: string;
    house_no?: string;
    telephone?: string;
    po_box?: string;
    fax?: string;
    residence_country?: string;
  }) => void;
  reset: () => void;
  setData: React.Dispatch<React.SetStateAction<ApplicantFormData>>;
}

export function useApplicantData(): UseApplicantDataReturn {
  const [data, setData] = useState<ApplicantFormData>(initialApplicantData);

  const updateField = useCallback((
    field: keyof ApplicantFormData,
    value: ApplicantFormData[keyof ApplicantFormData]
  ) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<ApplicantFormData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const loadFromClient = useCallback((client: {
    name: string;
    local_name?: string;
    nationality?: string;
    email?: string;
    address_street?: string;
    address_zone?: string;
    city?: string;
    city_code?: string;
    state_name?: string;
    state_code?: string;
    zip_code?: string;
    wereda?: string;
    house_no?: string;
    telephone?: string;
    po_box?: string;
    fax?: string;
    residence_country?: string;
  }) => {
    setData({
      applicant_name_english: client.name || '',
      applicant_name_amharic: client.local_name || '',
      nationality: client.nationality || '',
      email: client.email || '',
      address_street: client.address_street || '',
      address_zone: client.address_zone || '',
      city_name: client.city || '',
      city_code: client.city_code || '',
      state_name: client.state_name || '',
      state_code: client.state_code || '',
      zip_code: client.zip_code || '',
      wereda: client.wereda || '',
      house_no: client.house_no || '',
      telephone: client.telephone || '',
      po_box: client.po_box || '',
      fax: client.fax || '',
      residence_country: client.residence_country || '',
      // These are not typically in client data
      chk_female: false,
      chk_male: false,
      chk_company: false,
      applicant_sign_day: '',
      applicant_sign_month: '',
      applicant_sign_year_en: '',
    });
  }, []);

  const reset = useCallback(() => {
    setData(initialApplicantData);
  }, []);

  return { data, updateField, updateMultiple, loadFromClient, reset, setData };
}
