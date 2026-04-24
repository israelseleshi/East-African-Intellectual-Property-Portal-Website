import { useState, useCallback } from 'react';
import type { ChecklistFormData } from './types';

const initialChecklistData: ChecklistFormData = {
  chk_list_copies: false,
  chk_list_status: false,
  chk_list_poa: false,
  chk_list_priority_docs: false,
  chk_list_drawing: false,
  chk_list_payment: false,
  chk_list_other: false,
  other_documents_text: '',
};

export interface UseChecklistDataReturn {
  data: ChecklistFormData;
  updateField: (field: keyof ChecklistFormData, value: ChecklistFormData[keyof ChecklistFormData]) => void;
  updateMultiple: (updates: Partial<ChecklistFormData>) => void;
  selectAll: () => void;
  deselectAll: () => void;
  reset: () => void;
  setData: React.Dispatch<React.SetStateAction<ChecklistFormData>>;
}

export function useChecklistData(): UseChecklistDataReturn {
  const [data, setData] = useState<ChecklistFormData>(initialChecklistData);

  const updateField = useCallback((
    field: keyof ChecklistFormData,
    value: ChecklistFormData[keyof ChecklistFormData]
  ) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<ChecklistFormData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const selectAll = useCallback(() => {
    setData({
      chk_list_copies: true,
      chk_list_status: true,
      chk_list_poa: true,
      chk_list_priority_docs: true,
      chk_list_drawing: true,
      chk_list_payment: true,
      chk_list_other: false,
      other_documents_text: '',
    });
  }, []);

  const deselectAll = useCallback(() => {
    setData(initialChecklistData);
  }, []);

  const reset = useCallback(() => {
    setData(initialChecklistData);
  }, []);

  return { data, updateField, updateMultiple, selectAll, deselectAll, reset, setData };
}
