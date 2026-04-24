import { useState, useCallback } from 'react';
import type { ClassificationFormData } from './types';

const initialClassificationData: ClassificationFormData = {
  goods_services_list_1: '',
  goods_services_list_2: '',
  goods_services_list_3: '',
  goods_services_list_4: '',
  goods_services_list_5: '',
  goods_services_list_6: '',
  disclaimer_text_amharic: '',
  disclaimer_text_english: '',
};

export interface UseClassificationDataReturn {
  data: ClassificationFormData;
  updateField: (field: keyof ClassificationFormData, value: ClassificationFormData[keyof ClassificationFormData]) => void;
  updateMultiple: (updates: Partial<ClassificationFormData>) => void;
  setGoodsServices: (lines: string[]) => void;
  getGoodsServices: () => string[];
  reset: () => void;
  setData: React.Dispatch<React.SetStateAction<ClassificationFormData>>;
}

export function useClassificationData(): UseClassificationDataReturn {
  const [data, setData] = useState<ClassificationFormData>(initialClassificationData);

  const updateField = useCallback((
    field: keyof ClassificationFormData,
    value: ClassificationFormData[keyof ClassificationFormData]
  ) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<ClassificationFormData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const setGoodsServices = useCallback((lines: string[]) => {
    setData(prev => ({
      ...prev,
      goods_services_list_1: lines[0] || '',
      goods_services_list_2: lines[1] || '',
      goods_services_list_3: lines[2] || '',
      goods_services_list_4: lines[3] || '',
      goods_services_list_5: lines[4] || '',
      goods_services_list_6: lines[5] || '',
    }));
  }, []);

  const getGoodsServices = useCallback(() => {
    return [
      data.goods_services_list_1,
      data.goods_services_list_2,
      data.goods_services_list_3,
      data.goods_services_list_4,
      data.goods_services_list_5,
      data.goods_services_list_6,
    ].filter(Boolean);
  }, [data]);

  const reset = useCallback(() => {
    setData(initialClassificationData);
  }, []);

  return { data, updateField, updateMultiple, setGoodsServices, getGoodsServices, reset, setData };
}
