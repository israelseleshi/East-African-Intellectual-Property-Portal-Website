import React from 'react';
import { Phone } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { EipaFormData } from '../types';
import { Input } from '@/components/ui/input';

interface ContactSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ formData, handleInputChange }) => {
  return (
    <FormSection
      id="contact-section"
      title="III. Contact information"
      icon={Phone}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Telephone">
          <Input
            value={formData.telephone}
            onChange={(e) => handleInputChange('telephone', e.target.value)}
            placeholder="+251 ..."
          />
        </FormField>
        <FormField label="Email address">
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="name@example.com"
          />
        </FormField>
        <FormField label="Fax">
          <Input
            value={formData.fax}
            onChange={(e) => handleInputChange('fax', e.target.value)}
            placeholder="Enter fax number"
          />
        </FormField>
      </div>
    </FormSection>
  );
};
