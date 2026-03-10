import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
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
          <CountrySelector
            value={formData.priority_country}
            onChange={(val) => handleInputChange('priority_country', val)}
            placeholder="Select priority country"
          />
        </FormField>
        <FormField label="Priority right declaration (if any)" className="sm:col-span-2">
          <input
            value={formData.priority_right_declaration || ''}
            onChange={(e) => handleInputChange('priority_right_declaration', e.target.value)}
            className="apple-input"
            placeholder="Enter declaration"
          />
        </FormField>

        <FormField label="Priority application date">
          <input
            type="date"
            value={formData.priority_filing_date_1}
            onChange={(e) => handleInputChange('priority_filing_date_1', e.target.value)}
            className="apple-input"
          />
        </FormField>
        <FormField label="Priority goods & services (PDF mapping N/A)" className="sm:col-span-2">
          <textarea
            value={formData.priority_filing_date}
            onChange={(e) => handleInputChange('priority_filing_date', e.target.value)}
            className="apple-input min-h-[80px] py-3"
            placeholder="Map this to available PDF fields if needed..."
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
