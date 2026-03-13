import React from 'react';
import { Briefcase } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
import { EipaFormData } from '../types';

interface ChecklistSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const ChecklistSection: React.FC<ChecklistSectionProps> = ({ formData, handleInputChange }) => {
  const checklistOptions = [
    { id: 'chk_list_copies', label: '3 identical copies of mark' },
    { id: 'chk_list_status', label: 'Statutes governing mark' },
    { id: 'chk_list_poa', label: 'Power of attorney' },
    { id: 'chk_list_priority_docs', label: 'Priority documents' },
    { id: 'chk_list_drawing', label: 'Mark drawing (3D)' },
    { id: 'chk_list_payment', label: 'Proof of payment' },
    { id: 'chk_list_other', label: 'Other document(s)' }
  ];

  return (
    <FormSection
      id="checklist-section"
      title="VII. Checklist and signature"
      icon={Briefcase}
    >
      <CheckboxGroup
        options={checklistOptions}
        values={formData}
        onChange={(id, checked) => handleInputChange(id as keyof EipaFormData, checked)}
        columns={2}
      />

      <div className="space-y-4 pt-6 border-t border-[var(--eai-border)]">
        {formData.chk_list_other && (
          <FormField label="Other document(s) specify">
            <input
              value={formData.other_documents_text || ''}
              onChange={(e) => handleInputChange('other_documents_text', e.target.value)}
              className="apple-input"
              placeholder="List other documents..."
            />
          </FormField>
        )}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Day">
            <input
              value={formData.applicant_sign_day}
              onChange={(e) => handleInputChange('applicant_sign_day', e.target.value)}
              className="apple-input"
              placeholder="DD"
            />
          </FormField>
          <FormField label="Month">
            <input
              value={formData.applicant_sign_month || ''}
              onChange={(e) => handleInputChange('applicant_sign_month', e.target.value)}
              className="apple-input"
              placeholder="MMM"
            />
          </FormField>
          <FormField label="Year">
            <input
              value={formData.applicant_sign_year_en}
              onChange={(e) => handleInputChange('applicant_sign_year_en', e.target.value)}
              className="apple-input"
              placeholder="YYYY"
            />
          </FormField>
        </div>
      </div>
    </FormSection>
  );
};
