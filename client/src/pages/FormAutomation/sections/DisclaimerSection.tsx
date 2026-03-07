import React from 'react';
import { AlertCircle } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { EipaFormData } from '../types';

interface DisclaimerSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const DisclaimerSection: React.FC<DisclaimerSectionProps> = ({ formData, handleInputChange }) => {
  return (
    <FormSection
      id="disclaimer-section"
      title="V. Disclaimer"
      icon={AlertCircle}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Disclaimer (Amharic)">
          <input
            value={formData.disclaimer_text_amharic}
            onChange={(e) => handleInputChange('disclaimer_text_amharic', e.target.value)}
            className="apple-input"
            placeholder="የመብት ገደቡን እዚህ ያስገቡ..."
          />
        </FormField>
        <FormField label="Disclaimer (English)">
          <input
            value={formData.disclaimer_text_english}
            onChange={(e) => handleInputChange('disclaimer_text_english', e.target.value)}
            className="apple-input"
            placeholder="e.g. No claim to exclusive right of use of..."
          />
        </FormField>
      </div>
    </FormSection>
  );
};
