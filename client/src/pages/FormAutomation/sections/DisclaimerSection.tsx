import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { EipaFormData } from '../types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DisclaimerSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
  setFormData?: React.Dispatch<React.SetStateAction<EipaFormData>>;
}

const sampleDisclaimerData: Record<string, { data: Record<string, string>; label: string }> = {
  sample1: {
    label: 'Letter Disclaimer',
    data: {
      disclaimer_text_english: 'No claim is made to the exclusive right to use the letter A individually',
      disclaimer_text_amharic: 'የአለት ብቻ በግለሰብ መብት ማስረየት አይደረግም',
    },
  },
  sample2: {
    label: 'Word Disclaimer',
    data: {
      disclaimer_text_english: 'The words "SAFE" are disclaimed apart from the mark as shown',
      disclaimer_text_amharic: 'ቃላቱ "ሴፍ" ከሚታየው ምልክት በስተቀር ለግለሰብ መብት አይደረግም',
    },
  },
  sample3: {
    label: 'Color Disclaimer',
    data: {
      disclaimer_text_english: 'Color Blue is disclaimed and is not a distinctive feature of the mark',
      disclaimer_text_amharic: 'ሰማያዊ ቀለም ለግለሰብ መብት አይደረግም እና የምልክቱ የማይለይ ባህሪ አይደረግም',
    },
  },
};

export const DisclaimerSection: React.FC<DisclaimerSectionProps> = ({ formData, handleInputChange, setFormData }) => {
  const [selectedSample, setSelectedSample] = useState<string>('');

  const handleLoadSample = (sampleId: string) => {
    const sample = sampleDisclaimerData[sampleId];
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
        <SelectItem value="sample1">Letter Disclaimer</SelectItem>
        <SelectItem value="sample2">Word Disclaimer</SelectItem>
        <SelectItem value="sample3">Color Disclaimer</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <FormSection
      id="disclaimer-section"
      title="VI. Disclaimer"
      icon={AlertCircle}
      rightElement={quickLoadTrigger}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Disclaimer (Amharic)">
          <Input
            value={formData.disclaimer_text_amharic}
            onChange={(e) => handleInputChange('disclaimer_text_amharic', e.target.value)}
            placeholder="የመብት ገደቡን እዚህ ያስገቡ..."
          />
        </FormField>
        <FormField label="Disclaimer (English)">
          <Input
            value={formData.disclaimer_text_english}
            onChange={(e) => handleInputChange('disclaimer_text_english', e.target.value)}
            placeholder="e.g. No claim to exclusive right of use of..."
          />
        </FormField>
      </div>
    </FormSection>
  );
};
