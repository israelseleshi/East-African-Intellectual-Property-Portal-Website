import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
import { EipaFormData } from '../types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
          <Input
            value={formData.priority_right_declaration || ''}
            onChange={(e) => handleInputChange('priority_right_declaration', e.target.value)}
            placeholder="Enter declaration"
          />
        </FormField>

        <FormField label="Priority application date">
          <Input
            type="date"
            value={formData.priority_filing_date}
            onChange={(e) => handleInputChange('priority_filing_date', e.target.value)}
          />
        </FormField>
        <FormField label="Priority goods & services" className="sm:col-span-2">
          <Textarea
            value={formData.goods_and_services_covered_by_the_previous_application}
            onChange={(e) => handleInputChange('goods_and_services_covered_by_the_previous_application', e.target.value)}
            className="min-h-[80px]"
            placeholder="Enter goods and services covered..."
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
