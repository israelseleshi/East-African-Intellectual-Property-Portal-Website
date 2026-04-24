import React, { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
import { EipaFormData } from '../types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agentService } from '@/utils/api';
import { Agent } from '@/api/agents';

interface AgentSectionProps {
    formData: EipaFormData;
    handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
    setFormData?: React.Dispatch<React.SetStateAction<EipaFormData>>;
}

export const AgentSection: React.FC<AgentSectionProps> = ({ formData, handleInputChange, setFormData }) => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAgents = async () => {
            try {
        const response = await agentService.getAgents();
        const agentData = response.data || (Array.isArray(response) ? response : []);
        setAgents(agentData);
            } catch (error) {
                console.error('Failed to load agents:', error);
            } finally {
                setLoading(false);
            }
        };
        loadAgents();
    }, []);

    const onAgentSelect = (agentId: string) => {
      const agent = agents.find(a => a.id === agentId);
      if (agent && setFormData) {
        setFormData(prev => ({
          ...prev,
          // Handle Application Fields
          agent_name: agent.name || '',
          agent_country: agent.country || '',
          agent_city: agent.city || '',
          agent_subcity: agent.subcity || '',
          agent_woreda: agent.woreda || '',
          agent_house_no: agent.houseNo || '',
          agent_telephone: agent.telephone || '',
          agent_email: agent.email || '',
          agent_po_box: agent.poBox || '',
          agent_fax: agent.fax || '',

          // Handle Renewal Fields (Mirroring Application Fields)
          renewal_agent_name: agent.name || '',
          renewal_agent_country: agent.country || '',
          renewal_agent_city: agent.city || '',
          renewal_agent_subcity: agent.subcity || '',
          renewal_agent_wereda: agent.woreda || '',
          renewal_agent_house_no: agent.houseNo || '',
          renewal_agent_telephone: agent.telephone || '',
          renewal_agent_email: agent.email || '',
          renewal_agent_pobox: agent.poBox || '',
          renewal_agent_fax: agent.fax || '',
        }));
      } else if (agent) {
        // Fallback to individual calls if setFormData is not provided
        handleInputChange('agent_name', agent.name || '');
        handleInputChange('agent_country', agent.country || '');
        handleInputChange('agent_city', agent.city || '');
        handleInputChange('agent_subcity', agent.subcity || '');
        handleInputChange('agent_woreda', agent.woreda || '');
        handleInputChange('agent_house_no', agent.houseNo || '');
        handleInputChange('agent_telephone', agent.telephone || '');
        handleInputChange('agent_email', agent.email || '');
        handleInputChange('agent_po_box', agent.poBox || '');
        handleInputChange('agent_fax', agent.fax || '');

        // Handle Renewal Fields (Mirroring Application Fields)
        handleInputChange('renewal_agent_name', agent.name || '');
        handleInputChange('renewal_agent_country', agent.country || '');
        handleInputChange('renewal_agent_city', agent.city || '');
        handleInputChange('renewal_agent_subcity', agent.subcity || '');
        handleInputChange('renewal_agent_wereda', agent.woreda || '');
        handleInputChange('renewal_agent_house_no', agent.houseNo || '');
        handleInputChange('renewal_agent_telephone', agent.telephone || '');
        handleInputChange('renewal_agent_email', agent.email || '');
        handleInputChange('renewal_agent_pobox', agent.poBox || '');
        handleInputChange('renewal_agent_fax', agent.fax || '');
      }
    };

    return (
        <FormSection
            id="agent-section"
            title="II. Agent / Representative"
            icon={Briefcase}
            rightElement={
              <div className="flex items-center gap-2">
                <Select 
                  value={agents.find(a => a.name === (formData.agent_name || formData.renewal_agent_name))?.id || ''}
                  onValueChange={onAgentSelect} 
                  disabled={loading}
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder={loading ? "Loading..." : "Load Agent"} />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.length > 0 ? agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex flex-col text-left">
                          <span className="font-semibold">{agent.name}</span>
                          <span className="text-xs text-muted-foreground">{agent.city}, {agent.country}</span>
                        </div>
                      </SelectItem>
                    )) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No agents found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<FormField label="Agent Name" className="sm:col-span-2">
                    <Input
                        value={formData.agent_name || formData.renewal_agent_name || ''}
                        onChange={(e) => {
                            handleInputChange('agent_name', e.target.value);
                            handleInputChange('renewal_agent_name', e.target.value);
                        }}
                        placeholder="Full name of agent"
                    />
                </FormField>
                <FormField label="Country">
                    <CountrySelector
                        value={formData.agent_country || formData.renewal_agent_country || ''}
                        onChange={(val) => {
                            handleInputChange('agent_country', val);
                            handleInputChange('renewal_agent_country', val);
                        }}
                        placeholder="Select country"
                    />
                </FormField>
                <FormField label="City">
                    <Input
                        value={formData.agent_city || formData.renewal_agent_city || ''}
                        onChange={(e) => {
                            handleInputChange('agent_city', e.target.value);
                            handleInputChange('renewal_agent_city', e.target.value);
                        }}
                        placeholder="City"
                    />
                </FormField>
                <FormField label="Sub-City">
                    <Input
                        value={formData.agent_subcity || formData.renewal_agent_subcity || ''}
                        onChange={(e) => {
                            handleInputChange('agent_subcity', e.target.value);
                            handleInputChange('renewal_agent_subcity', e.target.value);
                        }}
                        placeholder="Sub-city"
                    />
                </FormField>
                <FormField label="Wereda">
                    <Input
                        value={formData.agent_woreda || formData.renewal_agent_wereda || ''}
                        onChange={(e) => {
                            handleInputChange('agent_woreda', e.target.value);
                            handleInputChange('renewal_agent_wereda', e.target.value);
                        }}
                        placeholder="Wereda"
                    />
                </FormField>
                <FormField label="House No.">
                    <Input
                        value={formData.agent_house_no || formData.renewal_agent_house_no || ''}
                        onChange={(e) => {
                            handleInputChange('agent_house_no', e.target.value);
                            handleInputChange('renewal_agent_house_no', e.target.value);
                        }}
                        placeholder="House number"
                    />
                </FormField>
                <FormField label="Telephone">
                    <Input
                        value={formData.agent_telephone || formData.renewal_agent_telephone || ''}
                        onChange={(e) => {
                            handleInputChange('agent_telephone', e.target.value);
                            handleInputChange('renewal_agent_telephone', e.target.value);
                        }}
                        placeholder="+251 ..."
                    />
                </FormField>
                <FormField label="P.O. Box">
                    <Input
                        value={formData.agent_po_box || formData.renewal_agent_pobox || ''}
                        onChange={(e) => {
                            handleInputChange('agent_po_box', e.target.value);
                            handleInputChange('renewal_agent_pobox', e.target.value);
                        }}
                        placeholder="P.O. Box"
                    />
                </FormField>
                <FormField label="Email">
                    <Input
                        type="email"
                        value={formData.agent_email || formData.renewal_agent_email || ''}
                        onChange={(e) => {
                            handleInputChange('agent_email', e.target.value);
                            handleInputChange('renewal_agent_email', e.target.value);
                        }}
                        placeholder="agent@example.com"
                    />
                </FormField>
                <FormField label="Fax">
                    <Input
                        value={formData.agent_fax || formData.renewal_agent_fax || ''}
                        onChange={(e) => {
                            handleInputChange('agent_fax', e.target.value);
                            handleInputChange('renewal_agent_fax', e.target.value);
                        }}
                        placeholder="Fax number"
                    />
                </FormField>
            </div>
        </FormSection>
    );
};
