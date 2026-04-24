import { useState, useCallback } from 'react';
import type { MarkFormData } from './types';

const initialMarkData: MarkFormData = {
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
};

export interface UseMarkDataReturn {
  data: MarkFormData;
  updateField: (field: keyof MarkFormData, value: MarkFormData[keyof MarkFormData]) => void;
  updateMultiple: (updates: Partial<MarkFormData>) => void;
  setMarkType: (type: 'WORD' | 'FIGURATIVE' | 'MIXED' | 'THREE_DIM') => void;
  setUseType: (type: 'GOODS' | 'SERVICES' | 'COLLECTIVE') => void;
  reset: () => void;
  setData: React.Dispatch<React.SetStateAction<MarkFormData>>;
}

export function useMarkData(): UseMarkDataReturn {
  const [data, setData] = useState<MarkFormData>(initialMarkData);

  const updateField = useCallback((
    field: keyof MarkFormData,
    value: MarkFormData[keyof MarkFormData]
  ) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<MarkFormData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const setMarkType = useCallback((type: 'WORD' | 'FIGURATIVE' | 'MIXED' | 'THREE_DIM') => {
    setData(prev => ({
      ...prev,
      mark_type_word: type === 'WORD',
      mark_type_figurative: type === 'FIGURATIVE',
      mark_type_mixed: type === 'MIXED',
      mark_type_three_dim: type === 'THREE_DIM',
    }));
  }, []);

  const setUseType = useCallback((type: 'GOODS' | 'SERVICES' | 'COLLECTIVE') => {
    setData(prev => ({
      ...prev,
      chk_goods: type === 'GOODS',
      chk_services: type === 'SERVICES',
      chk_collective: type === 'COLLECTIVE',
    }));
  }, []);

  const reset = useCallback(() => {
    setData(initialMarkData);
  }, []);

  return { data, updateField, updateMultiple, setMarkType, setUseType, reset, setData };
}
