import React, { useState } from 'react';
import { Tag, XCircle, Upload } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
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

const sampleMarkData: Record<string, { data: Record<string, string | boolean>; niceClasses?: number[]; label: string }> = {
  sample1: {
    label: 'ABC Logo',
    data: {
      chk_goods: true,
      chk_services: false,
      chk_collective: false,
      mark_type_word: true,
      mark_type_figurative: false,
      mark_type_mixed: false,
      mark_type_three_dim: false,
      mark_description: 'ABC Logo',
      mark_translation: 'ABC Brand',
      mark_transliteration: 'Ay Bee See',
      mark_language_requiring_traslation: 'Amharic',
      mark_color_indication: 'Black and White',
      mark_has_three_dim_features: '',
    },
    niceClasses: [35],
  },
  sample2: {
    label: 'Eagle Icon',
    data: {
      chk_goods: false,
      chk_services: true,
      chk_collective: false,
      mark_type_word: false,
      mark_type_figurative: true,
      mark_type_mixed: false,
      mark_type_three_dim: false,
      mark_description: 'Golden Eagle',
      mark_translation: 'Swift Services',
      mark_transliteration: 'Swee Pa Sehvee',
      mark_language_requiring_traslation: 'Oromo',
      mark_color_indication: 'Gold, Brown, White',
      mark_has_three_dim_features: '',
    },
    niceClasses: [41],
  },
  sample3: {
    label: 'TechShield',
    data: {
      chk_goods: false,
      chk_services: false,
      chk_collective: true,
      mark_type_word: false,
      mark_type_figurative: false,
      mark_type_mixed: true,
      mark_type_three_dim: false,
      mark_description: 'TechShield',
      mark_translation: 'Technology Protection',
      mark_transliteration: 'Tek Sheeld',
      mark_language_requiring_traslation: 'Tigrinya',
      mark_color_indication: 'Blue, Green, Silver',
      mark_has_three_dim_features: 'Circular badge shape',
    },
    niceClasses: [9, 42],
  },
};

interface MarkSpecificationSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
  setFormData?: React.Dispatch<React.SetStateAction<EipaFormData>>;
  markImage: string | null;
  onImageChange: (base64: string | null) => void;
  onImageFileChange: (file: File | null) => void;
  onNiceClassesChange?: (classes: number[]) => void;
}

export const MarkSpecificationSection: React.FC<MarkSpecificationSectionProps> = ({
  formData,
  handleInputChange,
  setFormData,
  markImage,
  onImageChange,
  onImageFileChange,
  onNiceClassesChange,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedSample, setSelectedSample] = useState<string>('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageFileChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onImageChange(base64);
        handleInputChange('image_field', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    onImageChange(null);
    onImageFileChange(null);
    handleInputChange('image_field', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = sampleMarkData[sampleId];
    if (sample && setFormData) {
      setSelectedSample(sampleId);
      setFormData(prev => ({
        ...prev,
        ...sample.data,
        // Mirror to renewal fields if applicable
        renewal_mark_logo: sample.data.mark_description as string || prev.renewal_mark_logo,
      }));
      
      if (sample.niceClasses && onNiceClassesChange) {
        onNiceClassesChange(sample.niceClasses);
      }
    } else if (sample) {
      setSelectedSample(sampleId);
      Object.entries(sample.data).forEach(([key, value]) => {
        handleInputChange(key as keyof EipaFormData, value as string | boolean);
      });
      
      // Mirror to renewal fields if applicable
      if (sample.data.mark_description) {
        handleInputChange('renewal_mark_logo', sample.data.mark_description as string);
      }
      
      if (sample.niceClasses && onNiceClassesChange) {
        onNiceClassesChange(sample.niceClasses);
      }
    }
  };

  const markTypeOptions = [
    { id: 'chk_goods', label: 'Goods mark' },
    { id: 'chk_services', label: 'Service mark' },
    { id: 'chk_collective', label: 'Collective mark' }
  ];

  const markFormOptions = [
    { id: 'mark_type_word', label: 'Word mark' },
    { id: 'mark_type_figurative', label: 'Figurative mark' },
    { id: 'mark_type_mixed', label: 'Mixed mark' },
    { id: 'mark_type_three_dim', label: '3D mark' }
  ];

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
        <SelectItem value="sample1">ABC Logo</SelectItem>
        <SelectItem value="sample2">Eagle Icon</SelectItem>
        <SelectItem value="sample3">TechShield</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <FormSection
      id="mark-specification-section"
      title="IV. Mark specification"
      icon={Tag}
      rightElement={quickLoadTrigger}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <CheckboxGroup
            label="Mark type"
            options={markTypeOptions}
            values={formData}
            onChange={(id, checked) => handleInputChange(id as keyof EipaFormData, checked)}
          />
          <CheckboxGroup
            label="Mark form"
            options={markFormOptions}
            values={formData}
            onChange={(id, checked) => handleInputChange(id as keyof EipaFormData, checked)}
          />
        </div>

        <div className="space-y-3">
          <label className="text-label text-[var(--eai-text)]">Mark image</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative aspect-video w-full rounded-2xl border-2 border-dashed border-[var(--eai-border)] bg-[var(--eai-bg)]/30 flex flex-col items-center justify-center gap-3 cursor-pointer group hover:border-[var(--eai-primary)] hover:bg-[var(--eai-bg)] transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            {markImage ? (
              <div className="relative w-full h-full p-4">
                <img
                  src={markImage}
                  alt="Mark preview"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-[var(--eai-critical)] hover:scale-110 transition-transform"
                >
                  <XCircle size={24} fill="currentColor" className="text-white" />
                  <XCircle size={24} className="absolute inset-0" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-[var(--eai-bg)] flex items-center justify-center text-[var(--eai-text-secondary)] group-hover:text-[var(--eai-primary)] transition-colors">
                  <Upload size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-body font-bold text-[var(--eai-text)]">Click to upload mark image</p>
                  <p className="text-micro text-[var(--eai-text-secondary)]">PNG, JPG, SVG up to 2MB</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <FormField label="Mark description" className="pt-4">
          <Textarea
            value={formData.mark_description}
            onChange={(e) => handleInputChange('mark_description', e.target.value)}
            className="min-h-[100px]"
            placeholder="Describe the visual and literal elements of the mark..."
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <FormField label="Translation">
            <Input
              value={formData.mark_translation}
              onChange={(e) => handleInputChange('mark_translation', e.target.value)}
              placeholder="English translation"
            />
          </FormField>
          <FormField label="Transliteration">
            <Input
              value={formData.mark_transliteration}
              onChange={(e) => handleInputChange('mark_transliteration', e.target.value)}
              placeholder="Phonetic pronunciation"
            />
          </FormField>
          <FormField label="Language">
            <Input
              value={formData.mark_language_requiring_traslation}
              onChange={(e) => handleInputChange('mark_language_requiring_traslation', e.target.value)}
              placeholder="e.g., Amharic, Oromo"
            />
          </FormField>
          <FormField label="Color indication">
            <Input
              value={formData.mark_color_indication || ''}
              onChange={(e) => handleInputChange('mark_color_indication', e.target.value)}
              placeholder="e.g., Blue and White"
            />
          </FormField>
          <FormField label="3D features indication">
            <Input
              value={formData.mark_has_three_dim_features || ''}
              onChange={(e) => handleInputChange('mark_has_three_dim_features', e.target.value)}
              placeholder="Describe 3D features"
            />
          </FormField>
        </div>
      </div>
    </FormSection>
  );
};
