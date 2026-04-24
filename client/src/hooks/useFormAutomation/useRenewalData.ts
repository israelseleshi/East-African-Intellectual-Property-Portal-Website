import { useState, useCallback } from 'react';
import type {
  RenewalApplicantFormData,
  RenewalAgentFormData,
  RenewalMarkFormData,
  RenewalClassificationFormData,
  RenewalSignatureFormData,
  RenewalCaseFormData,
} from './types';

const initialRenewalApplicantData: RenewalApplicantFormData = {
  renewal_applicant_name: '',
  renewal_applicant_name_amharic: '',
  renewal_address_street: '',
  renewal_address_zone: '',
  renewal_city_code: '',
  renewal_city_name: '',
  renewal_state_code: '',
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
};

const initialRenewalAgentData: RenewalAgentFormData = {
  renewal_agent_name: '',
  renewal_agent_country: '',
  renewal_agent_city: '',
  renewal_agent_subcity: '',
  renewal_agent_email: '',
  renewal_agent_pobox: '',
  renewal_agent_wereda: '',
  renewal_agent_telephone: '',
  renewal_agent_house_no: '',
  renewal_agent_fax: '',
};

const initialRenewalMarkData: RenewalMarkFormData = {
  renewal_chk_goods_mark: false,
  renewal_chk_service_mark: false,
  renewal_chk_collective_mark: false,
  renewal_mark_logo: '',
};

const initialRenewalClassificationData: RenewalClassificationFormData = {
  renewal_goods_services_1: '',
  renewal_goods_services_2: '',
  renewal_goods_services_3: '',
  renewal_goods_services_4: '',
  renewal_goods_services_5: '',
  renewal_goods_services_6: '',
};

const initialRenewalSignatureData: RenewalSignatureFormData = {
  renewal_sign_day: '',
  renewal_sign_month: '',
  renewal_sign_year: '',
};

const initialRenewalCaseData: RenewalCaseFormData = {
  renewal_app_no: '',
  renewal_reg_no: '',
  renewal_reg_date: '',
};

export interface UseRenewalDataReturn {
  applicant: {
    data: RenewalApplicantFormData;
    updateField: (field: keyof RenewalApplicantFormData, value: string | boolean) => void;
    updateMultiple: (updates: Partial<RenewalApplicantFormData>) => void;
    loadFromClient: (client: { name: string; local_name?: string }) => void;
    reset: () => void;
    setData: React.Dispatch<React.SetStateAction<RenewalApplicantFormData>>;
  };
  agent: {
    data: RenewalAgentFormData;
    updateField: (field: keyof RenewalAgentFormData, value: string) => void;
    reset: () => void;
    setData: React.Dispatch<React.SetStateAction<RenewalAgentFormData>>;
  };
  mark: {
    data: RenewalMarkFormData;
    updateField: (field: keyof RenewalMarkFormData, value: string | boolean) => void;
    reset: () => void;
    setData: React.Dispatch<React.SetStateAction<RenewalMarkFormData>>;
  };
  classification: {
    data: RenewalClassificationFormData;
    updateField: (field: keyof RenewalClassificationFormData, value: string) => void;
    setGoodsServices: (lines: string[]) => void;
    reset: () => void;
    setData: React.Dispatch<React.SetStateAction<RenewalClassificationFormData>>;
  };
  signature: {
    data: RenewalSignatureFormData;
    updateField: (field: keyof RenewalSignatureFormData, value: string) => void;
    reset: () => void;
    setData: React.Dispatch<React.SetStateAction<RenewalSignatureFormData>>;
  };
  caseData: {
    data: RenewalCaseFormData;
    updateField: (field: keyof RenewalCaseFormData, value: string) => void;
    reset: () => void;
    setData: React.Dispatch<React.SetStateAction<RenewalCaseFormData>>;
  };
  resetAll: () => void;
}

export function useRenewalData(): UseRenewalDataReturn {
  const [applicantData, setApplicantData] = useState<RenewalApplicantFormData>(initialRenewalApplicantData);
  const [agentData, setAgentData] = useState<RenewalAgentFormData>(initialRenewalAgentData);
  const [markData, setMarkData] = useState<RenewalMarkFormData>(initialRenewalMarkData);
  const [classificationData, setClassificationData] = useState<RenewalClassificationFormData>(initialRenewalClassificationData);
  const [signatureData, setSignatureData] = useState<RenewalSignatureFormData>(initialRenewalSignatureData);
  const [caseData, setCaseData] = useState<RenewalCaseFormData>(initialRenewalCaseData);

  const resetAll = useCallback(() => {
    setApplicantData(initialRenewalApplicantData);
    setAgentData(initialRenewalAgentData);
    setMarkData(initialRenewalMarkData);
    setClassificationData(initialRenewalClassificationData);
    setSignatureData(initialRenewalSignatureData);
    setCaseData(initialRenewalCaseData);
  }, []);

  return {
    applicant: {
      data: applicantData,
      updateField: useCallback((field, value) => {
        setApplicantData(prev => ({ ...prev, [field]: value }));
      }, []),
      updateMultiple: useCallback((updates) => {
        setApplicantData(prev => ({ ...prev, ...updates }));
      }, []),
      loadFromClient: useCallback((client) => {
        setApplicantData(prev => ({
          ...prev,
          renewal_applicant_name: client.name,
          renewal_applicant_name_amharic: client.local_name || '',
        }));
      }, []),
      reset: useCallback(() => setApplicantData(initialRenewalApplicantData), []),
      setData: setApplicantData,
    },
    agent: {
      data: agentData,
      updateField: useCallback((field, value) => {
        setAgentData(prev => ({ ...prev, [field]: value }));
      }, []),
      reset: useCallback(() => setAgentData(initialRenewalAgentData), []),
      setData: setAgentData,
    },
    mark: {
      data: markData,
      updateField: useCallback((field, value) => {
        setMarkData(prev => ({ ...prev, [field]: value }));
      }, []),
      reset: useCallback(() => setMarkData(initialRenewalMarkData), []),
      setData: setMarkData,
    },
    classification: {
      data: classificationData,
      updateField: useCallback((field, value) => {
        setClassificationData(prev => ({ ...prev, [field]: value }));
      }, []),
      setGoodsServices: useCallback((lines) => {
        setClassificationData({
          renewal_goods_services_1: lines[0] || '',
          renewal_goods_services_2: lines[1] || '',
          renewal_goods_services_3: lines[2] || '',
          renewal_goods_services_4: lines[3] || '',
          renewal_goods_services_5: lines[4] || '',
          renewal_goods_services_6: lines[5] || '',
        });
      }, []),
      reset: useCallback(() => setClassificationData(initialRenewalClassificationData), []),
      setData: setClassificationData,
    },
    signature: {
      data: signatureData,
      updateField: useCallback((field, value) => {
        setSignatureData(prev => ({ ...prev, [field]: value }));
      }, []),
      reset: useCallback(() => setSignatureData(initialRenewalSignatureData), []),
      setData: setSignatureData,
    },
    caseData: {
      data: caseData,
      updateField: useCallback((field, value) => {
        setCaseData(prev => ({ ...prev, [field]: value }));
      }, []),
      reset: useCallback(() => setCaseData(initialRenewalCaseData), []),
      setData: setCaseData,
    },
    resetAll,
  };
}
