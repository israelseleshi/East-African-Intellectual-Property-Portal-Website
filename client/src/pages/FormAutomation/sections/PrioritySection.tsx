import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
import { EipaFormData } from '../types';

interface PrioritySectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const PrioritySection: React.FC<PrioritySectionProps> = ({ formData, handleInputChange }) => {
  const priorityDocOptions = [
    { id: 'chk_priority_accompanies', label: 'Documents accompany form' },
    { id: 'chk_priority_submitted_later', label: 'Submit within 3 months' }
  ];

  return (
    <FormSection
      id="priority-section"
      title="V. Priority right declaration"
      icon={RefreshCcw}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Priority country">
          <input
            value={formData.priority_country}
            onChange={(e) => handleInputChange('priority_country', e.target.value)}
            className="apple-input"
            placeholder="Country of first filing"
          />
        </FormField>
        <FormField label="Priority application date">
          <input
            type="date"
            value={formData.priority_application_filing_date}
            onChange={(e) => handleInputChange('priority_application_filing_date', e.target.value)}
            className="apple-input"
          />
        </FormField>
        <FormField label="Priority goods and services" className="sm:col-span-2">
          <textarea
            value={formData.priority_goods_services}
            onChange={(e) => handleInputChange('priority_goods_services', e.target.value)}
            className="apple-input min-h-[80px] py-3"
            placeholder="List goods/services covered by priority claim"
          />
        </FormField>
        <div className="sm:col-span-2 pt-2">
          <CheckboxGroup
            options={priorityDocOptions}
            values={formData}
            onChange={(id, checked) => handleInputChange(id as keyof EipaFormData, checked)}
            columns={2}
          />
        </div>
      </div>
    </FormSection>
  );
};
