import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
import { EipaFormData } from '../types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChecklistSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

const sampleChecklistData: Record<string, { data: Record<string, string | boolean>; label: string }> = {
  sample1: {
    label: 'Basic Docs',
    data: {
      chk_list_copies: true,
      chk_list_status: false,
      chk_list_poa: true,
      chk_list_priority_docs: true,
      chk_list_drawing: false,
      chk_list_payment: true,
      chk_list_other: false,
      other_documents_text: '',
      applicant_sign_day: '15',
      applicant_sign_month: '03',
      applicant_sign_year_en: '26',
    },
  },
  sample2: {
    label: 'Full Docs',
    data: {
      chk_list_copies: true,
      chk_list_status: true,
      chk_list_poa: true,
      chk_list_priority_docs: false,
      chk_list_drawing: true,
      chk_list_payment: true,
      chk_list_other: true,
      other_documents_text: 'Export certificate; Market research report',
      applicant_sign_day: '20',
      applicant_sign_month: '06',
      applicant_sign_year_en: '26',
    },
  },
  sample3: {
    label: 'Minimum Docs',
    data: {
      chk_list_copies: true,
      chk_list_status: true,
      chk_list_poa: false,
      chk_list_priority_docs: false,
      chk_list_drawing: false,
      chk_list_payment: true,
      chk_list_other: false,
      other_documents_text: '',
      applicant_sign_day: '01',
      applicant_sign_month: '01',
      applicant_sign_year_en: '26',
    },
  },
};

export const ChecklistSection: React.FC<ChecklistSectionProps> = ({ formData, handleInputChange }) => {
  const [selectedSample, setSelectedSample] = useState<string>('');
  const checklistOptions = [
    { id: 'chk_list_copies', label: '3 identical copies of mark' },
    { id: 'chk_list_status', label: 'Statutes governing mark' },
    { id: 'chk_list_poa', label: 'Power of attorney' },
    { id: 'chk_list_priority_docs', label: 'Priority documents' },
    { id: 'chk_list_drawing', label: 'Mark drawing (3D)' },
    { id: 'chk_list_payment', label: 'Proof of payment' },
    { id: 'chk_list_other', label: 'Other document(s)' }
  ];

  const handleLoadSample = (sampleId: string) => {
    const sample = sampleChecklistData[sampleId];
    if (sample) {
      setSelectedSample(sample.label);
      Object.entries(sample.data).forEach(([key, value]) => {
        handleInputChange(key as keyof EipaFormData, value);
      });
    }
  };

  const quickLoadTrigger = (
    <Select
      value={selectedSample || 'placeholder'}
      onValueChange={(value) => {
        if (value !== 'placeholder') {
          handleLoadSample(value);
        }
      }}
    >
      <SelectTrigger className="w-[180px] h-9">
        <SelectValue placeholder="Load sample data" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sample1">Basic Docs</SelectItem>
        <SelectItem value="sample2">Full Docs</SelectItem>
        <SelectItem value="sample3">Minimum Docs</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <FormSection
      id="checklist-section"
      title="VIII. Checklist and signature"
      icon={Briefcase}
      rightElement={quickLoadTrigger}
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
            <Input
              value={formData.other_documents_text || ''}
              onChange={(e) => handleInputChange('other_documents_text', e.target.value)}
              placeholder="List other documents..."
            />
          </FormField>
        )}
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Day">
            <Input
              value={formData.applicant_sign_day || ''}
              onChange={(e) => handleInputChange('applicant_sign_day', e.target.value)}
              placeholder="DD"
            />
          </FormField>
          <FormField label="Month">
            <Input
              value={formData.applicant_sign_month || ''}
              onChange={(e) => handleInputChange('applicant_sign_month', e.target.value)}
              placeholder="MM"
            />
          </FormField>
          <FormField label="Year">
            <Input
              value={formData.applicant_sign_year_en || ''}
              onChange={(e) => handleInputChange('applicant_sign_year_en', e.target.value)}
              placeholder="YY"
            />
          </FormField>
        </div>
      </div>
    </FormSection>
  );
};
