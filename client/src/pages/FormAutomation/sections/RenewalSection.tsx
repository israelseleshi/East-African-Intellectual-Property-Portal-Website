import React from 'react';
import { FileText, User, MapPin, Phone, Briefcase, CheckSquare, Image as ImageIcon, Hash, List, PenTool, Database, ChevronDown } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
import { EipaFormData, Client } from '../types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";

interface RenewalSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
  clients: Client[];
  selectedClientId: string;
  handleClientSelect: (clientId: string) => void;
}

export const RenewalSection: React.FC<RenewalSectionProps> = ({
  formData,
  handleInputChange,
  clients,
  selectedClientId,
  handleClientSelect,
}) => {
  const quickLoadTrigger = (
    <div id="quick-client-select-renewal">
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
    <div className="space-y-6">
      {/* I. Applicant Name */}
      <FormSection title="I. Applicant Name" icon={User} rightElement={quickLoadTrigger}>
        <FormField label="Applicant Name (Required)">
          <input
            value={formData.renewal_applicant_name || ''}
            onChange={(e) => handleInputChange('renewal_applicant_name', e.target.value)}
            className="apple-input"
            placeholder="Full legal name"
          />
        </FormField>
      </FormSection>

      {/* II. Address */}
      <FormSection title="II. Address & Contact" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Street Address">
            <input
              value={formData.renewal_address_street || ''}
              onChange={(e) => handleInputChange('renewal_address_street', e.target.value)}
              className="apple-input"
            />
          </FormField>
          <FormField label="Zone">
            <input
              value={formData.renewal_address_zone || ''}
              onChange={(e) => handleInputChange('renewal_address_zone', e.target.value)}
              className="apple-input"
              placeholder="Zone"
            />
          </FormField>
          <FormField label="City Code">
            <input
              value={formData.renewal_city_code || ''}
              onChange={(e) => handleInputChange('renewal_city_code', e.target.value)}
              className="apple-input"
              placeholder="City Code"
            />
          </FormField>
          <FormField label="City Name">
            <input
              value={formData.renewal_city_name || ''}
              onChange={(e) => handleInputChange('renewal_city_name', e.target.value)}
              className="apple-input"
              placeholder="City Name"
            />
          </FormField>
          <FormField label="State Code">
            <input
              value={formData.renewal_state_code || ''}
              onChange={(e) => handleInputChange('renewal_state_code', e.target.value)}
              className="apple-input"
              placeholder="State Code"
            />
          </FormField>
          <FormField label="State Name">
            <input
              value={formData.renewal_state_name || ''}
              onChange={(e) => handleInputChange('renewal_state_name', e.target.value)}
              className="apple-input"
              placeholder="State Name"
            />
          </FormField>
          <FormField label="Zip Code">
            <input
              value={formData.renewal_zip_code || ''}
              onChange={(e) => handleInputChange('renewal_zip_code', e.target.value)}
              className="apple-input"
              placeholder="Zip Code"
            />
          </FormField>
          <FormField label="Wereda">
            <input
              value={formData.renewal_wereda || ''}
              onChange={(e) => handleInputChange('renewal_wereda', e.target.value)}
              className="apple-input"
              placeholder="Wereda"
            />
          </FormField>
          <FormField label="House No.">
            <input
              value={formData.renewal_house_no || ''}
              onChange={(e) => handleInputChange('renewal_house_no', e.target.value)}
              className="apple-input"
              placeholder="House No."
            />
          </FormField>
          <FormField label="Telephone">
            <input
              value={formData.renewal_telephone || ''}
              onChange={(e) => handleInputChange('renewal_telephone', e.target.value)}
              className="apple-input"
            />
          </FormField>
          <FormField label="E-mail">
            <input
              type="email"
              value={formData.renewal_email || ''}
              onChange={(e) => handleInputChange('renewal_email', e.target.value)}
              className="apple-input"
            />
          </FormField>
          <FormField label="Fax">
            <input
              value={formData.renewal_fax || ''}
              onChange={(e) => handleInputChange('renewal_fax', e.target.value)}
              className="apple-input"
            />
          </FormField>
          <FormField label="P.O. Box">
            <input
              value={formData.renewal_po_box || ''}
              onChange={(e) => handleInputChange('renewal_po_box', e.target.value)}
              className="apple-input"
            />
          </FormField>
          <FormField label="Nationality">
            <CountrySelector
              value={formData.renewal_nationality || ''}
              onChange={(val) => handleInputChange('renewal_nationality', val)}
              placeholder="Select nationality"
            />
          </FormField>
          <FormField label="Country of Residence">
            <CountrySelector
              value={formData.renewal_residence_country || ''}
              onChange={(val) => handleInputChange('renewal_residence_country', val)}
              placeholder="Select residence country"
            />
          </FormField>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.renewal_chk_female || false}
              onChange={(e) => handleInputChange('renewal_chk_female', e.target.checked)}
              className="apple-checkbox"
            />
            <span className="text-sm">Female</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.renewal_chk_male || false}
              onChange={(e) => handleInputChange('renewal_chk_male', e.target.checked)}
              className="apple-checkbox"
            />
            <span className="text-sm">Male</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.renewal_chk_company || false}
              onChange={(e) => handleInputChange('renewal_chk_company', e.target.checked)}
              className="apple-checkbox"
            />
            <span className="text-sm">Company</span>
          </label>
        </div>
      </FormSection>

      {/* Agent Details */}
      <FormSection title="Agent Details" icon={Briefcase}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Agent Name">
            <input
              value={formData.renewal_agent_name || ''}
              onChange={(e) => handleInputChange('renewal_agent_name', e.target.value)}
              className="apple-input"
              placeholder="Name"
            />
          </FormField>
          <FormField label="Country">
            <CountrySelector
              value={formData.renewal_agent_country || ''}
              onChange={(val) => handleInputChange('renewal_agent_country', val)}
              placeholder="Select country"
            />
          </FormField>
          <FormField label="City">
            <input
              value={formData.renewal_agent_city || ''}
              onChange={(e) => handleInputChange('renewal_agent_city', e.target.value)}
              className="apple-input"
              placeholder="City"
            />
          </FormField>
          <FormField label="Sub-City">
            <input
              value={formData.renewal_agent_subcity || ''}
              onChange={(e) => handleInputChange('renewal_agent_subcity', e.target.value)}
              className="apple-input"
              placeholder="Sub-City"
            />
          </FormField>
          <FormField label="Wereda">
            <input
              value={formData.renewal_agent_wereda || ''}
              onChange={(e) => handleInputChange('renewal_agent_wereda', e.target.value)}
              className="apple-input"
              placeholder="Wereda"
            />
          </FormField>
          <FormField label="House No.">
            <input
              value={formData.renewal_agent_house_no || ''}
              onChange={(e) => handleInputChange('renewal_agent_house_no', e.target.value)}
              className="apple-input"
              placeholder="House No."
            />
          </FormField>
          <FormField label="Tel.">
            <input
              value={formData.renewal_agent_telephone || ''}
              onChange={(e) => handleInputChange('renewal_agent_telephone', e.target.value)}
              className="apple-input"
              placeholder="Tel."
            />
          </FormField>
          <FormField label="E-mail">
            <input
              value={formData.renewal_agent_email || ''}
              onChange={(e) => handleInputChange('renewal_agent_email', e.target.value)}
              className="apple-input"
              placeholder="E-mail"
            />
          </FormField>
          <FormField label="P.O. Box">
            <input
              value={formData.renewal_agent_pobox || ''}
              onChange={(e) => handleInputChange('renewal_agent_pobox', e.target.value)}
              className="apple-input"
              placeholder="P.O. Box"
            />
          </FormField>
          <FormField label="Fax">
            <input
              value={formData.renewal_agent_fax || ''}
              onChange={(e) => handleInputChange('renewal_agent_fax', e.target.value)}
              className="apple-input"
              placeholder="Fax"
            />
          </FormField>
        </div>
      </FormSection>

      {/* III. Use of Mark */}
      <FormSection title="III. Use of Mark" icon={CheckSquare}>
        <div className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.renewal_chk_goods_mark || false}
              onChange={(e) => handleInputChange('renewal_chk_goods_mark', e.target.checked)}
              className="apple-checkbox"
            />
            <span className="text-sm">Goods Mark</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.renewal_chk_service_mark || false}
              onChange={(e) => handleInputChange('renewal_chk_service_mark', e.target.checked)}
              className="apple-checkbox"
            />
            <span className="text-sm">Service Mark</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.renewal_chk_collective_mark || false}
              onChange={(e) => handleInputChange('renewal_chk_collective_mark', e.target.checked)}
              className="apple-checkbox"
            />
            <span className="text-sm">Collective Mark</span>
          </label>
        </div>
      </FormSection>

      {/* IV. Mark Representation */}
      <FormSection title="IV. Representation of Mark" icon={ImageIcon}>
        <FormField label="Mark Logo / Image">
          <input
            value={formData.renewal_mark_logo || ''}
            onChange={(e) => handleInputChange('renewal_mark_logo', e.target.value)}
            className="apple-input"
            placeholder="Logo image URL or base64"
          />
        </FormField>
      </FormSection>

      {/* V. Case Details */}
      <FormSection title="V. Case Details" icon={FileText}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Application No">
            <input
              value={formData.renewal_app_no || ''}
              onChange={(e) => handleInputChange('renewal_app_no', e.target.value)}
              className="apple-input"
            />
          </FormField>
          <FormField label="Registration No">
            <input
              value={formData.renewal_reg_no || ''}
              onChange={(e) => handleInputChange('renewal_reg_no', e.target.value)}
              className="apple-input"
            />
          </FormField>
          <FormField label="Registration Date">
            <input
              type="date"
              value={formData.renewal_reg_date || ''}
              onChange={(e) => handleInputChange('renewal_reg_date', e.target.value)}
              className="apple-input"
            />
          </FormField>
        </div>
      </FormSection>

      {/* VI. Classification */}
      <FormSection title="VI. Classification" icon={List}>
        <div className="grid grid-cols-1 gap-4">
          <FormField label="List of goods and or services">
            <textarea
              value={formData.renewal_goods_services || ''}
              onChange={(e) => handleInputChange('renewal_goods_services', e.target.value)}
              className="apple-input min-h-[100px]"
            />
          </FormField>
          <FormField label="International Class(es)">
            <input
              value={formData.renewal_nice_classes || ''}
              onChange={(e) => handleInputChange('renewal_nice_classes', e.target.value)}
              className="apple-input"
              placeholder="e.g. 5, 35, 42"
            />
          </FormField>
        </div>
      </FormSection>

      {/* Signature */}
      <FormSection title="Signature" icon={PenTool}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Day">
            <input
              value={formData.renewal_sign_day || ''}
              onChange={(e) => handleInputChange('renewal_sign_day', e.target.value)}
              className="apple-input"
              placeholder="DD"
            />
          </FormField>
          <FormField label="Month">
            <input
              value={formData.renewal_sign_month || ''}
              onChange={(e) => handleInputChange('renewal_sign_month', e.target.value)}
              className="apple-input"
              placeholder="MM"
            />
          </FormField>
          <FormField label="Year">
            <input
              value={formData.renewal_sign_year || ''}
              onChange={(e) => handleInputChange('renewal_sign_year', e.target.value)}
              className="apple-input"
              placeholder="YYYY"
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
};
