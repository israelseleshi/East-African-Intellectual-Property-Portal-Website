import React from 'react';
import { User } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
import { EipaFormData, Client } from '../types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApplicantSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
  clients: Client[];
  selectedClientId: string;
  handleClientSelect: (clientId: string) => void;
}

export const ApplicantSection: React.FC<ApplicantSectionProps> = ({
  formData,
  handleInputChange,
  clients,
  selectedClientId,
  handleClientSelect,
}) => {
  const applicantTypeOptions = [
    { id: 'chk_female', label: 'Female' },
    { id: 'chk_male', label: 'Male' },
    { id: 'chk_company', label: 'Company' }
  ];

  const quickLoadTrigger = (
    <Select
      value={selectedClientId}
      onValueChange={(value) => handleClientSelect(value)}
    >
      <SelectTrigger className="w-[200px] h-9">
        <SelectValue placeholder="Load Client" />
      </SelectTrigger>
      <SelectContent>
        {clients.length > 0 ? (
          clients.map((client) => (
            <SelectItem key={client.id} value={client.id}>
              <div className="flex flex-col">
                <span className="font-semibold">{client.name}</span>
                <span className="text-xs text-muted-foreground">
                  {client.type} • {client.nationality}
                </span>
              </div>
            </SelectItem>
          ))
        ) : (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No clients found</div>
        )}
      </SelectContent>
    </Select>
  );

  return (
    <FormSection
      id="applicant-section"
      title="I. Applicant information"
      icon={User}
      rightElement={quickLoadTrigger}
    >
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Full name (English)">
          <Input
            value={formData.applicant_name_english}
            onChange={(e) => handleInputChange('applicant_name_english', e.target.value)}
            placeholder="Enter full legal name in English"
          />
        </FormField>

        <FormField label="ሙሉ ስም (Amharic)" amharic>
          <Input
            value={formData.applicant_name_amharic}
            onChange={(e) => handleInputChange('applicant_name_amharic', e.target.value)}
            placeholder="ሙሉ ስም እዚህ ያስገቡ"
            className="font-amharic"
          />
        </FormField>

        <CheckboxGroup
          options={applicantTypeOptions}
          values={formData}
          onChange={(id, checked) => handleInputChange(id as keyof EipaFormData, checked)}
          columns={3}
        />
      </div>
    </FormSection>
  );
};
