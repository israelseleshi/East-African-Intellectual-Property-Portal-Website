import React from 'react';
import { Briefcase } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { EipaFormData } from '../types';

interface AgentSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const AgentSection: React.FC<AgentSectionProps> = ({ formData, handleInputChange }) => {
  return (
    <FormSection
      id="agent-section"
      title="III. Agent (representative) details"
      icon={Briefcase}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Law firm / Agent name" className="sm:col-span-2">
          <input
            value={formData.agent_name || ''}
            onChange={(e) => handleInputChange('agent_name' as any, e.target.value)}
            className="apple-input"
            placeholder="Enter law firm or agent name"
          />
        </FormField>
        <FormField label="Subcity">
          <input
            value={formData.agent_subcity || ''}
            onChange={(e) => handleInputChange('agent_subcity' as any, e.target.value)}
            className="apple-input"
            placeholder="Enter subcity"
          />
        </FormField>
        <FormField label="Wereda">
          <input
            value={formData.agent_wereda || ''}
            onChange={(e) => handleInputChange('agent_wereda' as any, e.target.value)}
            className="apple-input"
            placeholder="Enter wereda"
          />
        </FormField>
        <FormField label="Telephone">
          <input
            value={formData.agent_telephone || ''}
            onChange={(e) => handleInputChange('agent_telephone' as any, e.target.value)}
            className="apple-input"
            placeholder="Enter telephone"
          />
        </FormField>
        <FormField label="Email">
          <input
            value={formData.agent_email || ''}
            onChange={(e) => handleInputChange('agent_email' as any, e.target.value)}
            className="apple-input"
            placeholder="Enter email"
          />
        </FormField>
      </div>
    </FormSection>
  );
};
