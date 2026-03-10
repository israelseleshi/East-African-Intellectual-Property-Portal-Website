import React from 'react';
import { Briefcase } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
import { EipaFormData } from '../types';

interface AgentSectionProps {
    formData: EipaFormData;
    handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const AgentSection: React.FC<AgentSectionProps> = ({ formData, handleInputChange }) => {
    return (
        <FormSection
            id="agent-section"
            title="II. Agent / Representative"
            icon={Briefcase}
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
                        value={formData.agent_wereda || ''}
                        onChange={(e) => handleInputChange('agent_wereda', e.target.value)}
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
