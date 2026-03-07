import React from 'react';
import { FileText } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { EipaFormData } from '../types';

interface RenewalSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const RenewalSection: React.FC<RenewalSectionProps> = ({ formData, handleInputChange }) => {
  return (
    <FormSection
      title="Renewal details"
      icon={FileText}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Registration number">
          <input
            value={formData.registration_no}
            onChange={(e) => handleInputChange('registration_no', e.target.value)}
            className="apple-input"
            placeholder="Enter registration #"
          />
        </FormField>
        <FormField label="Registration date">
          <input
            type="date"
            value={formData.registration_date}
            onChange={(e) => handleInputChange('registration_date', e.target.value)}
            className="apple-input"
          />
        </FormField>
      </div>
    </FormSection>
  );
};
