import React from 'react';
import { Briefcase, UserCheck } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
import { EipaFormData } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AgentSectionProps {
    formData: EipaFormData;
    handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

const PREDEFINED_AGENTS = [
  {
    id: 'fikadu-asfaw',
    name: 'Fikadu Asfaw',
    country: 'Ethiopia',
    city: 'Addis Ababa',
    subcity: 'Bole',
    woreda: '02',
    house_no: '',
    telephone: '+25112131415',
    email: 'fikadu@gmail.com',
    po_box: '1000',
    fax: '+251115839201'
  }
];

export const AgentSection: React.FC<AgentSectionProps> = ({ formData, handleInputChange }) => {
    const onAgentSelect = (agentId: string) => {
      const agent = PREDEFINED_AGENTS.find(a => a.id === agentId);
      if (agent) {
        handleInputChange('agent_name', agent.name);
        handleInputChange('agent_country', agent.country);
        handleInputChange('agent_city', agent.city);
        handleInputChange('agent_subcity', agent.subcity);
        handleInputChange('agent_woreda', agent.woreda);
        handleInputChange('agent_house_no', agent.house_no);
        handleInputChange('agent_telephone', agent.telephone);
        handleInputChange('agent_email', agent.email);
        handleInputChange('agent_po_box', agent.po_box);
        handleInputChange('agent_fax', agent.fax);
      }
    };

    return (
        <FormSection
            id="agent-section"
            title="II. Agent / Representative"
            icon={Briefcase}
            rightElement={
              <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-[var(--eai-muted)]" />
                <Select onValueChange={onAgentSelect}>
                  <SelectTrigger className="w-[200px] h-8 text-xs bg-[var(--eai-bg-secondary)] border-none">
                    <SelectValue placeholder="Quick load Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_AGENTS.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Agent Name" className="sm:col-span-2">
                    <input
                        value={formData.agent_name || ''}
                        onChange={(e) => handleInputChange('agent_name', e.target.value)}
                        className="apple-input"
                        placeholder="Full name of agent"
                    />
                </FormField>
                <FormField label="Country">
                    <CountrySelector
                        value={formData.agent_country || ''}
                        onChange={(val) => handleInputChange('agent_country', val)}
                        placeholder="Select country"
                    />
                </FormField>
                <FormField label="City">
                    <input
                        value={formData.agent_city || ''}
                        onChange={(e) => handleInputChange('agent_city', e.target.value)}
                        className="apple-input"
                        placeholder="City"
                    />
                </FormField>
                <FormField label="Sub-City">
          <input
            value={formData.agent_subcity || ''}
            onChange={(e) => handleInputChange('agent_subcity', e.target.value)}
            className="apple-input"
            placeholder="Sub-city"
          />
        </FormField>
        <FormField label="Wereda">
          <input
            value={formData.agent_woreda || ''}
            onChange={(e) => handleInputChange('agent_woreda', e.target.value)}
            className="apple-input"
            placeholder="Wereda"
          />
        </FormField>
                <FormField label="House No.">
                    <input
                        value={formData.agent_house_no || ''}
                        onChange={(e) => handleInputChange('agent_house_no', e.target.value)}
                        className="apple-input"
                        placeholder="House number"
                    />
                </FormField>
                <FormField label="Telephone">
                    <input
                        value={formData.agent_telephone || ''}
                        onChange={(e) => handleInputChange('agent_telephone', e.target.value)}
                        className="apple-input"
                        placeholder="+251 ..."
                    />
                </FormField>
                <FormField label="P.O. Box">
                    <input
                        value={formData.agent_po_box || ''}
                        onChange={(e) => handleInputChange('agent_po_box', e.target.value)}
                        className="apple-input"
                        placeholder="P.O. Box"
                    />
                </FormField>
                <FormField label="Email">
                    <input
                        value={formData.agent_email || ''}
                        onChange={(e) => handleInputChange('agent_email', e.target.value)}
                        className="apple-input"
                        placeholder="agent@example.com"
                    />
                </FormField>
                <FormField label="Fax">
                    <input
                        value={formData.agent_fax || ''}
                        onChange={(e) => handleInputChange('agent_fax', e.target.value)}
                        className="apple-input"
                        placeholder="Fax number"
                    />
                </FormField>
            </div>
        </FormSection>
    );
};
