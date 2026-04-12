import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { EipaFormData } from '../types';
import { Input } from '@/components/ui/input';
import NiceClassPicker from '../../../components/NiceClassPicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NiceClassificationSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
  selectedClasses: number[];
  onClassesChange: (classes: number[]) => void;
}

const sampleGoodsServicesData: Record<string, { data: Record<string, string>; niceClasses?: number[]; label: string }> = {
  sample1: {
    label: 'Business Services',
    data: {
      goods_services_list_1: 'Advertising; business management; office functions',
      goods_services_list_2: 'Insurance; financial affairs; real estate affairs',
      goods_services_list_3: 'Scientific and technological services',
      goods_services_list_4: '',
      goods_services_list_5: '',
      goods_services_list_6: '',
    },
    niceClasses: [35, 36, 42],
  },
  sample2: {
    label: 'Legal Services',
    data: {
      goods_services_list_1: 'Legal services; security services for the protection of property',
      goods_services_list_2: 'Education; providing training; entertainment services',
      goods_services_list_3: 'Cultural activities; sporting activities',
      goods_services_list_4: '',
      goods_services_list_5: '',
      goods_services_list_6: '',
    },
    niceClasses: [45, 41],
  },
  sample3: {
    label: 'Tech Services',
    data: {
      goods_services_list_1: 'Scientific instruments; computer software; data processing equipment',
      goods_services_list_2: 'Telecommunications; news agency services',
      goods_services_list_3: 'Medical services; veterinary services; beauty and hairdressing',
      goods_services_list_4: '',
      goods_services_list_5: '',
      goods_services_list_6: '',
    },
    niceClasses: [9, 38, 44],
  },
};

export const NiceClassificationSection: React.FC<NiceClassificationSectionProps> = ({
  formData,
  handleInputChange,
  selectedClasses,
  onClassesChange,
}) => {
  const [selectedSample, setSelectedSample] = useState<string>('');

  const handleLoadSample = (sampleId: string) => {
    const sample = sampleGoodsServicesData[sampleId];
    if (sample) {
      setSelectedSample(sample.label);
      Object.entries(sample.data).forEach(([key, value]) => {
        handleInputChange(key as keyof EipaFormData, value);
      });
      if (sample.niceClasses) {
        onClassesChange(sample.niceClasses);
      }
    }
  };

  const quickLoadTrigger = (
    <Select
      value={Object.keys(sampleGoodsServicesData).find(key => sampleGoodsServicesData[key].label === selectedSample) || ''}
      onValueChange={(value) => {
        handleLoadSample(value);
      }}
    >
      <SelectTrigger className="w-[180px] h-9">
        <SelectValue placeholder="Load sample data" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sample1">Business Services</SelectItem>
        <SelectItem value="sample2">Legal Services</SelectItem>
        <SelectItem value="sample3">Tech Services</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <FormSection
      title="VII. Nice classification & goods/services"
      icon={ImageIcon}
      rightElement={quickLoadTrigger}
    >
      <div className="space-y-6">
        <div id="nice-class-section">
          <NiceClassPicker
            selectedClasses={selectedClasses}
            onChange={onClassesChange}
          />
        </div>

        <div className="space-y-2" id="goods-services">
          <p className="text-label text-[var(--eai-text)] mb-3">
            List of goods and services <span className="text-[var(--eai-text-secondary)] font-normal">(6 lines — split into separate rows for the PDF)</span>
          </p>
          {([1, 2, 3, 4, 5, 6] as const).map(n => {
            const field = `goods_services_list_${n}` as keyof EipaFormData;
            return (
              <div key={n} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-[var(--eai-text-secondary)] w-4 shrink-0">{n}</span>
                <Input
                  value={(formData[field] as string) || ''}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  className="flex-1"
                  placeholder={`Goods/services line ${n}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </FormSection>
  );
};
