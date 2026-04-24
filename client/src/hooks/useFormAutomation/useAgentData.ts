import { useState, useCallback } from 'react';
import type { AgentFormData } from './types';

const initialAgentData: AgentFormData = {
  agent_name: '',
  agent_country: '',
  agent_city: '',
  agent_subcity: '',
  agent_woreda: '',
  agent_house_no: '',
  agent_telephone: '',
  agent_fax: '',
  agent_po_box: '',
  agent_email: '',
};

export interface UseAgentDataReturn {
  data: AgentFormData;
  updateField: (field: keyof AgentFormData, value: AgentFormData[keyof AgentFormData]) => void;
  updateMultiple: (updates: Partial<AgentFormData>) => void;
  reset: () => void;
  setData: React.Dispatch<React.SetStateAction<AgentFormData>>;
}

export function useAgentData(): UseAgentDataReturn {
  const [data, setData] = useState<AgentFormData>(initialAgentData);

  const updateField = useCallback((
    field: keyof AgentFormData,
    value: AgentFormData[keyof AgentFormData]
  ) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMultiple = useCallback((updates: Partial<AgentFormData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  const reset = useCallback(() => {
    setData(initialAgentData);
  }, []);

  return { data, updateField, updateMultiple, reset, setData };
}
