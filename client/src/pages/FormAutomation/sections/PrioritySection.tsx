import React, { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
import { EipaFormData } from '../types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PrioritySectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
  setFormData?: React.Dispatch<React.SetStateAction<EipaFormData>>;
}

const samplePriorityData: Record<string, { data: Record<string, string | boolean>; label: string }> = {
  sample1: {
    label: 'Kenya Priority',
    data: {
      priority_country: 'Kenya',
      priority_filing_date: '2025-06-15',
      priority_right_declaration: 'Priority claimed under Paris Convention',
      goods_and_services_covered_by_the_previous_application: 'Class 35 - Advertising; Business management; Office functions',
      chk_priority_accompanies: true,
      chk_priority_submitted_later: false,
    },
  },
  sample2: {
    label: 'Ethiopia Priority',
    data: {
      priority_country: 'Ethiopia',
      priority_filing_date: '2025-03-20',
      priority_right_declaration: 'Priority claimed under Article 4 of the Paris Convention',
      goods_and_services_covered_by_the_previous_application: 'Class 41 - Education; Providing training; Entertainment services',
      chk_priority_accompanies: false,
      chk_priority_submitted_later: true,
    },
  },
  sample3: {
    label: 'Uganda Priority',
    data: {
      priority_country: 'Uganda',
      priority_filing_date: '2025-09-01',
      priority_right_declaration: 'Priority claimed based on earlier filing',
      goods_and_services_covered_by_the_previous_application: 'Class 9 - Scientific instruments; Computer software',
      chk_priority_accompanies: true,
      chk_priority_submitted_later: false,
    },
  },
};

export const PrioritySection: React.FC<PrioritySectionProps> = ({ formData, handleInputChange, setFormData }) => {
  const [selectedSample, setSelectedSample] = useState<string>('');
  const priorityDocOptions = [
    { id: 'chk_priority_accompanies', label: 'Documents accompany form' },
    { id: 'chk_priority_submitted_later', label: 'Submit within 3 months' }
  ];

  const handleLoadSample = (sampleId: string) => {
    const sample = samplePriorityData[sampleId];
    if (sample && setFormData) {
      setSelectedSample(sampleId);
      setFormData(prev => ({
        ...prev,
        ...sample.data
      }));
    } else if (sample) {
      setSelectedSample(sampleId);
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
        <SelectItem value="sample1">Kenya Priority</SelectItem>
        <SelectItem value="sample2">Ethiopia Priority</SelectItem>
        <SelectItem value="sample3">Uganda Priority</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <FormSection
      id="priority-section"
      title="V. Priority right declaration"
      icon={RefreshCcw}
      rightElement={quickLoadTrigger}
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
