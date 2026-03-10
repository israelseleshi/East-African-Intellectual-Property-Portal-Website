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

        <div className="space-y-2" id="goods-services">
          <p className="text-label text-[var(--eai-text)] mb-3">
            List of goods and services <span className="text-[var(--eai-text-secondary)] font-normal">(6 lines — split into separate rows for the PDF)</span>
          </p>
          {([1, 2, 3, 4, 5, 6] as const).map(n => {
            const field = `goods_services_list_${n}` as keyof EipaFormData;
            return (
              <div key={n} className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-[var(--eai-text-secondary)] w-4 shrink-0">{n}</span>
                <input
                  value={(formData[field] as string) || ''}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  className="apple-input flex-1"
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
