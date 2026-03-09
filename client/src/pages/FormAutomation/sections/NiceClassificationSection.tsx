import React from 'react';
import { ImageIcon } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { EipaFormData } from '../types';
import NiceClassPicker from '../../../components/NiceClassPicker';

interface NiceClassificationSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
  selectedClasses: number[];
  onClassesChange: (classes: number[]) => void;
}

export const NiceClassificationSection: React.FC<NiceClassificationSectionProps> = ({
  formData,
  handleInputChange,
  selectedClasses,
  onClassesChange,
}) => {
  return (
    <FormSection
      title="Nice classification & goods/services"
      icon={ImageIcon}
    >
      <div className="space-y-6">
        <div id="nice-classification">
          <NiceClassPicker
            selectedClasses={selectedClasses}
            onChange={onClassesChange}
          />
        </div>

        <FormField label="Goods and services description" id="goods-services">
          <textarea
            value={formData.goods_services_list}
            onChange={(e) => handleInputChange('goods_services_list', e.target.value)}
            className="apple-input min-h-[150px] py-3"
            placeholder="List specific goods and services for the selected classes..."
          />
          <p className="text-[11px] text-[var(--eai-text-secondary)] italic pt-1">
            Separate different classes clearly if applicable.
          </p>
        </FormField>
      </div>
    </FormSection>
  );
};
