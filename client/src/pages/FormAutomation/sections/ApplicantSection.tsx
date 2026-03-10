import React from 'react';
import { User, Database, ChevronDown } from 'lucide-react';
import { FormSection, FormField, CheckboxGroup } from '../components/FormShared';
import { EipaFormData, Client } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

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
    <div id="quick-client-select">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl border border-[var(--eai-border)] bg-[var(--eai-surface)] px-3 py-1.5 h-9 tracking-tight hover:bg-[var(--eai-bg)] transition-colors shadow-sm text-[var(--eai-text)]">
            <Database size={16} className="text-[var(--eai-text-secondary)]" />
            <span className="text-[12px] font-bold">
              {selectedClientId ? clients.find(c => c.id === selectedClientId)?.name : 'Quick load client'}
            </span>
            <ChevronDown size={14} className="text-[var(--eai-text-secondary)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl border-[var(--eai-border)] bg-[var(--eai-surface)] shadow-xl max-h-[300px] overflow-y-auto">
          {clients.length > 0 ? (
            clients.map((client) => (
              <DropdownMenuItem
                key={client.id}
                onClick={() => handleClientSelect(client.id)}
                className={`px-4 py-2.5 text-[13px] font-medium cursor-pointer flex flex-col items-start gap-0.5 ${selectedClientId === client.id ? 'bg-[var(--eai-primary)] text-white' : 'hover:bg-[var(--eai-bg)] text-[var(--eai-text)]'}`}
              >
                <span className="font-bold">{client.name}</span>
                <span className={`text-[10px] tracking-wider ${selectedClientId === client.id ? 'text-white/70' : 'text-[var(--eai-text-secondary)]'}`}>
                  {client.type} • {client.nationality}
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-4 py-2 text-[12px] text-[var(--eai-text-secondary)]">No clients found</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
          <input
            value={formData.applicant_name_english}
            onChange={(e) => handleInputChange('applicant_name_english', e.target.value)}
            className="apple-input"
            placeholder="Enter full legal name in English"
          />
        </FormField>

        <FormField label="ሙሉ ስም (Amharic)" amharic>
          <input
            value={formData.applicant_name_amharic}
            onChange={(e) => handleInputChange('applicant_name_amharic', e.target.value)}
            className="apple-input font-amharic"
            placeholder="ሙሉ ስም እዚህ ያስገቡ"
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
