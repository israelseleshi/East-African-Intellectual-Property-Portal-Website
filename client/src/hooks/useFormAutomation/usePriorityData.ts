import { useState, useCallback } from 'react';
import type { PriorityFormData } from './types';

const initialPriorityData: PriorityFormData = {
  priority_filing_date: '',
  priority_country: '',
  goods_and_services_covered_by_the_previous_application: '',
  priority_right_declaration: '',
  chk_priority_accompanies: false,
  chk_priority_submitted_later: false,
};

export interface UsePriorityDataReturn {
  data: PriorityFormData;
  updateField: (field: keyof PriorityFormData, value: PriorityFormData[keyof PriorityFormData]) => void;
  updateMultiple: (updates: Partial<PriorityFormData>) => void;
  setPriority: (enabled: boolean, country?: string, filingDate?: string) => void;
  reset: () => void;
  setData: React.Dispatch<React.SetStateAction<PriorityFormData>>;
}

export function usePriorityData(): UsePriorityDataReturn {
  const [data, setData] = useState<PriorityFormData>(initialPriorityData);

  const updateField = useCallback((
    field: keyof PriorityFormData,
    value: PriorityFormData[keyof PriorityFormData]
  ) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<PriorityFormData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const setPriority = useCallback((enabled: boolean, country?: string, filingDate?: string) => {
    setData(prev => ({
      ...prev,
      priority_country: enabled ? (country || '') : '',
      priority_filing_date: enabled ? (filingDate || '') : '',
      chk_priority_accompanies: enabled,
      chk_priority_submitted_later: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setData(initialPriorityData);
  }, []);

  return { data, updateField, updateMultiple, setPriority, reset, setData };
}
