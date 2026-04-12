import React, { useRef, useState, useEffect } from 'react';
import { FileText, User, MapPin, Phone, Briefcase, CheckSquare, Image as ImageIcon, Hash, List, PenTool, Upload, XCircle } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
import { EipaFormData, Client } from '../types';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { agentService } from '@/utils/api';
import { Agent } from '@/api/agents';

interface RenewalSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
  clients: Client[];
  selectedClientId: string;
  handleClientSelect: (clientId: string) => void;
  markImage: string | null;
  onImageChange: (base64: string | null) => void;
  onImageFileChange: (file: File | null) => void;
}

const sampleUseOfMarkData: Record<string, { data: Record<string, boolean>; label: string }> = {
  sample1: {
    label: 'Goods Mark',
    data: {
      renewal_chk_goods_mark: true,
      renewal_chk_service_mark: false,
      renewal_chk_collective_mark: false,
    },
  },
  sample2: {
    label: 'Service Mark',
    data: {
      renewal_chk_goods_mark: false,
      renewal_chk_service_mark: true,
      renewal_chk_collective_mark: false,
    },
  },
  sample3: {
    label: 'Collective Mark',
    data: {
      renewal_chk_goods_mark: false,
      renewal_chk_service_mark: false,
      renewal_chk_collective_mark: true,
    },
  },
};

const sampleCaseDetailsData: Record<string, { data: Record<string, string>; label: string }> = {
  sample1: {
    label: 'Kenya Registration',
    data: {
      renewal_app_no: 'KE/TM/2024/12345',
      renewal_reg_no: 'KE/RN/2024/67890',
      renewal_reg_date: '2024-01-15',
    },
  },
  sample2: {
    label: 'Ethiopia Registration',
    data: {
      renewal_app_no: 'ET/TM/2024/54321',
      renewal_reg_no: 'ET/RN/2024/98765',
      renewal_reg_date: '2024-06-30',
    },
  },
  sample3: {
    label: 'Uganda Registration',
    data: {
      renewal_app_no: 'UG/TM/2024/11111',
      renewal_reg_no: 'UG/RN/2024/22222',
      renewal_reg_date: '2024-03-20',
    },
  },
};

const sampleClassificationData: Record<string, { data: Record<string, string>; label: string }> = {
  sample1: {
    label: 'Business Services',
    data: {
      renewal_goods_services_1: 'Advertising; business management; office functions',
      renewal_goods_services_2: 'Insurance; financial affairs; real estate affairs',
      renewal_goods_services_3: '',
      renewal_goods_services_4: '',
      renewal_goods_services_5: '',
      renewal_goods_services_6: '',
    },
  },
  sample2: {
    label: 'Tech Services',
    data: {
      renewal_goods_services_1: 'Scientific instruments; computer software',
      renewal_goods_services_2: 'Telecommunications services',
      renewal_goods_services_3: '',
      renewal_goods_services_4: '',
      renewal_goods_services_5: '',
      renewal_goods_services_6: '',
    },
  },
  sample3: {
    label: 'Legal Services',
    data: {
      renewal_goods_services_1: 'Legal services; security services',
      renewal_goods_services_2: 'Education; training services',
      renewal_goods_services_3: '',
      renewal_goods_services_4: '',
      renewal_goods_services_5: '',
      renewal_goods_services_6: '',
    },
  },
};

const sampleSignatureData: Record<string, { data: Record<string, string>; label: string }> = {
  sample1: {
    label: '03/2026',
    data: {
      renewal_sign_day: '15',
      renewal_sign_month: '03',
      renewal_sign_year: '26',
    },
  },
  sample2: {
    label: '06/2026',
    data: {
      renewal_sign_day: '20',
      renewal_sign_month: '06',
      renewal_sign_year: '26',
    },
  },
  sample3: {
    label: '01/2026',
    data: {
      renewal_sign_day: '01',
      renewal_sign_month: '01',
      renewal_sign_year: '26',
    },
  },
};

export const RenewalSection: React.FC<RenewalSectionProps> = ({
  formData,
  handleInputChange,
  clients,
  selectedClientId,
  handleClientSelect,
  markImage,
  onImageChange,
  onImageFileChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [selectedUseOfMark, setSelectedUseOfMark] = useState<string>('');
  const [selectedCaseDetails, setSelectedCaseDetails] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [selectedSignature, setSelectedSignature] = useState<string>('');

  useEffect(() => {
      const loadAgents = async () => {
          try {
              const response = await agentService.getAgents();
              if (response.success && response.data) {
                  setAgents(response.data);
              }
          } catch (error) {
              console.error('Failed to load agents:', error);
          } finally {
              setLoadingAgents(false);
          }
      };
      loadAgents();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageFileChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        onImageChange(base64);
        handleInputChange('renewal_mark_logo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    onImageChange(null);
    onImageFileChange(null);
    handleInputChange('renewal_mark_logo', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onAgentSelect = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      handleInputChange('renewal_agent_name', agent.name);
      handleInputChange('renewal_agent_country', agent.country);
      handleInputChange('renewal_agent_city', agent.city);
      handleInputChange('renewal_agent_subcity', agent.subcity);
      handleInputChange('renewal_agent_wereda', agent.woreda);
      handleInputChange('renewal_agent_house_no', agent.houseNo);
      handleInputChange('renewal_agent_telephone', agent.telephone);
      handleInputChange('renewal_agent_email', agent.email);
      handleInputChange('renewal_agent_pobox', agent.poBox);
      handleInputChange('renewal_agent_fax', agent.fax);
    }
  };

  const handleLoadUseOfMarkSample = (sampleId: string) => {
    const sample = sampleUseOfMarkData[sampleId];
    if (sample) {
      setSelectedUseOfMark(sample.label);
      Object.entries(sample.data).forEach(([key, value]) => {
        handleInputChange(key as keyof EipaFormData, value);
      });
    }
  };

  const handleLoadCaseDetailsSample = (sampleId: string) => {
    const sample = sampleCaseDetailsData[sampleId];
    if (sample) {
      setSelectedCaseDetails(sample.label);
      Object.entries(sample.data).forEach(([key, value]) => {
        handleInputChange(key as keyof EipaFormData, value);
      });
    }
  };

  const handleLoadClassificationSample = (sampleId: string) => {
    const sample = sampleClassificationData[sampleId];
    if (sample) {
      setSelectedClassification(sample.label);
      Object.entries(sample.data).forEach(([key, value]) => {
        handleInputChange(key as keyof EipaFormData, value);
      });
    }
  };

  const handleLoadSignatureSample = (sampleId: string) => {
    const sample = sampleSignatureData[sampleId];
    if (sample) {
      setSelectedSignature(sample.label);
      Object.entries(sample.data).forEach(([key, value]) => {
        handleInputChange(key as keyof EipaFormData, value);
      });
    }
  };

  const quickLoadClientTrigger = (
    <div id="quick-client-select-renewal">
      <Select
        value={selectedClientId}
        onValueChange={(value) => handleClientSelect(value)}
      >
        <SelectTrigger className="w-[180px] h-9">
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
    </div>
  );

  const quickLoadAgentTrigger = (
    <div id="quick-agent-select-renewal">
      <Select 
        value={agents.find(a => a.name === (formData.renewal_agent_name || formData.agent_name))?.id || ''}
        onValueChange={onAgentSelect} 
        disabled={loadingAgents}
      >
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder={loadingAgents ? "Loading..." : "Load Agent"} />
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
  );

  return (
    <div className="space-y-6">
      {/* I. Applicant Name */}
      <FormSection title="I. Applicant Name" icon={User} rightElement={quickLoadClientTrigger}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Applicant Name (English)">
            <Input
              value={formData.renewal_applicant_name || ''}
              onChange={(e) => handleInputChange('renewal_applicant_name', e.target.value)}
              placeholder="Full legal name"
            />
          </FormField>
          <FormField label="Applicant Name (Amharic)">
            <Input
              value={formData.renewal_applicant_name_amharic || ''}
              onChange={(e) => handleInputChange('renewal_applicant_name_amharic', e.target.value)}
              placeholder="ስም በዐማርኛ"
            />
          </FormField>
        </div>
      </FormSection>

      {/* II. Address */}
      <FormSection title="II. Address & Contact" icon={MapPin}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Street Address">
            <Input
              value={formData.renewal_address_street || ''}
              onChange={(e) => handleInputChange('renewal_address_street', e.target.value)}
            />
          </FormField>
          <FormField label="Zone">
            <Input
              value={formData.renewal_address_zone || ''}
              onChange={(e) => handleInputChange('renewal_address_zone', e.target.value)}
              placeholder="Zone"
            />
          </FormField>
          <FormField label="City Code">
            <Input
              value={formData.renewal_city_code || ''}
              onChange={(e) => handleInputChange('renewal_city_code', e.target.value)}
              placeholder="City Code"
            />
          </FormField>
          <FormField label="City Name">
            <Input
              value={formData.renewal_city_name || ''}
              onChange={(e) => handleInputChange('renewal_city_name', e.target.value)}
              placeholder="City Name"
            />
          </FormField>
          <FormField label="State Code">
            <Input
              value={formData.renewal_state_code || ''}
              onChange={(e) => handleInputChange('renewal_state_code', e.target.value)}
              placeholder="State Code"
            />
          </FormField>
          <FormField label="State Name">
            <Input
              value={formData.renewal_state_name || ''}
              onChange={(e) => handleInputChange('renewal_state_name', e.target.value)}
              placeholder="State Name"
            />
          </FormField>
          <FormField label="Zip Code">
            <Input
              value={formData.renewal_zip_code || ''}
              onChange={(e) => handleInputChange('renewal_zip_code', e.target.value)}
              placeholder="Zip Code"
            />
          </FormField>
          <FormField label="Wereda">
            <Input
              value={formData.renewal_wereda || ''}
              onChange={(e) => handleInputChange('renewal_wereda', e.target.value)}
              placeholder="Wereda"
            />
          </FormField>
          <FormField label="House No.">
            <Input
              value={formData.renewal_house_no || ''}
              onChange={(e) => handleInputChange('renewal_house_no', e.target.value)}
              placeholder="House No."
            />
          </FormField>
          <FormField label="Telephone">
            <Input
              value={formData.renewal_telephone || ''}
              onChange={(e) => handleInputChange('renewal_telephone', e.target.value)}
            />
          </FormField>
          <FormField label="E-mail">
            <Input
              type="email"
              value={formData.renewal_email || ''}
              onChange={(e) => handleInputChange('renewal_email', e.target.value)}
            />
          </FormField>
          <FormField label="Fax">
            <Input
              value={formData.renewal_fax || ''}
              onChange={(e) => handleInputChange('renewal_fax', e.target.value)}
            />
          </FormField>
          <FormField label="P.O. Box">
            <Input
              value={formData.renewal_po_box || ''}
              onChange={(e) => handleInputChange('renewal_po_box', e.target.value)}
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
            <Checkbox
              checked={formData.renewal_chk_female || false}
              onCheckedChange={(checked) => handleInputChange('renewal_chk_female', checked as boolean)}
            />
            <span className="text-sm">Female</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.renewal_chk_male || false}
              onCheckedChange={(checked) => handleInputChange('renewal_chk_male', checked as boolean)}
            />
            <span className="text-sm">Male</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.renewal_chk_company || false}
              onCheckedChange={(checked) => handleInputChange('renewal_chk_company', checked as boolean)}
            />
            <span className="text-sm">Company</span>
          </label>
        </div>
      </FormSection>

      {/* Agent Details */}
      <FormSection title="Agent Details" icon={Briefcase} rightElement={quickLoadAgentTrigger}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Agent Name">
            <Input
              value={formData.renewal_agent_name || ''}
              onChange={(e) => handleInputChange('renewal_agent_name', e.target.value)}
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
            <Input
              value={formData.renewal_agent_city || ''}
              onChange={(e) => handleInputChange('renewal_agent_city', e.target.value)}
              placeholder="City"
            />
          </FormField>
          <FormField label="Sub-City">
            <Input
              value={formData.renewal_agent_subcity || ''}
              onChange={(e) => handleInputChange('renewal_agent_subcity', e.target.value)}
              placeholder="Sub-City"
            />
          </FormField>
          <FormField label="Wereda">
            <Input
              value={formData.renewal_agent_wereda || ''}
              onChange={(e) => handleInputChange('renewal_agent_wereda', e.target.value)}
              placeholder="Wereda"
            />
          </FormField>
          <FormField label="House No.">
            <Input
              value={formData.renewal_agent_house_no || ''}
              onChange={(e) => handleInputChange('renewal_agent_house_no', e.target.value)}
              placeholder="House No."
            />
          </FormField>
          <FormField label="Tel.">
            <Input
              value={formData.renewal_agent_telephone || ''}
              onChange={(e) => handleInputChange('renewal_agent_telephone', e.target.value)}
              placeholder="Tel."
            />
          </FormField>
          <FormField label="E-mail">
            <Input
              value={formData.renewal_agent_email || ''}
              onChange={(e) => handleInputChange('renewal_agent_email', e.target.value)}
              placeholder="E-mail"
            />
          </FormField>
          <FormField label="P.O. Box">
            <Input
              value={formData.renewal_agent_pobox || ''}
              onChange={(e) => handleInputChange('renewal_agent_pobox', e.target.value)}
              placeholder="P.O. Box"
            />
          </FormField>
          <FormField label="Fax">
            <Input
              value={formData.renewal_agent_fax || ''}
              onChange={(e) => handleInputChange('renewal_agent_fax', e.target.value)}
              placeholder="Fax"
            />
          </FormField>
        </div>
      </FormSection>

      {/* III. Use of Mark */}
      <FormSection 
        title="III. Use of Mark" 
        icon={CheckSquare}
        rightElement={
          <Select
            value={Object.keys(sampleUseOfMarkData).find(key => sampleUseOfMarkData[key].label === selectedUseOfMark) || ''}
            onValueChange={(value) => {
              handleLoadUseOfMarkSample(value);
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Load sample data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sample1">Goods Mark</SelectItem>
              <SelectItem value="sample2">Service Mark</SelectItem>
              <SelectItem value="sample3">Collective Mark</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <div className="flex flex-wrap gap-4 p-3 bg-muted/30 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.renewal_chk_goods_mark || false}
              onCheckedChange={(checked) => handleInputChange('renewal_chk_goods_mark', checked as boolean)}
            />
            <span className="text-sm">Goods Mark</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.renewal_chk_service_mark || false}
              onCheckedChange={(checked) => handleInputChange('renewal_chk_service_mark', checked as boolean)}
            />
            <span className="text-sm">Service Mark</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={formData.renewal_chk_collective_mark || false}
              onCheckedChange={(checked) => handleInputChange('renewal_chk_collective_mark', checked as boolean)}
            />
            <span className="text-sm">Collective Mark</span>
          </label>
        </div>
      </FormSection>

      {/* IV. Mark Representation */}
      <FormSection title="IV. Representation of Mark" icon={ImageIcon}>
        <div className="space-y-3">
          <label className="text-label text-[var(--eai-text)]">Mark Logo / Image</label>
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
      </FormSection>

      {/* V. Case Details */}
      <FormSection 
        title="V. Case Details" 
        icon={FileText}
        rightElement={
          <Select
            value={Object.keys(sampleCaseDetailsData).find(key => sampleCaseDetailsData[key].label === selectedCaseDetails) || ''}
            onValueChange={(value) => {
              handleLoadCaseDetailsSample(value);
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Load sample data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sample1">Kenya Registration</SelectItem>
              <SelectItem value="sample2">Ethiopia Registration</SelectItem>
              <SelectItem value="sample3">Uganda Registration</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Application No">
            <Input
              value={formData.renewal_app_no || ''}
              onChange={(e) => handleInputChange('renewal_app_no', e.target.value)}
            />
          </FormField>
          <FormField label="Registration No">
            <Input
              value={formData.renewal_reg_no || ''}
              onChange={(e) => handleInputChange('renewal_reg_no', e.target.value)}
            />
          </FormField>
          <FormField label="Registration Date">
            <Input
              type="date"
              value={formData.renewal_reg_date || ''}
              onChange={(e) => handleInputChange('renewal_reg_date', e.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      {/* VI. Classification */}
      <FormSection 
        title="VI. Classification" 
        icon={List}
        rightElement={
          <Select
            value={Object.keys(sampleClassificationData).find(key => sampleClassificationData[key].label === selectedClassification) || ''}
            onValueChange={(value) => {
              handleLoadClassificationSample(value);
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Load sample data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sample1">Business Services</SelectItem>
              <SelectItem value="sample2">Tech Services</SelectItem>
              <SelectItem value="sample3">Legal Services</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-3">
            <label className="text-label text-[var(--eai-text)]">List of goods and or services (Split into 6 lines for PDF)</label>
            <div className="grid grid-cols-1 gap-2">
              <Input
                value={formData.renewal_goods_services_1 || ''}
                onChange={(e) => handleInputChange('renewal_goods_services_1', e.target.value)}
                placeholder="Line 1"
              />
              <Input
                value={formData.renewal_goods_services_2 || ''}
                onChange={(e) => handleInputChange('renewal_goods_services_2', e.target.value)}
                placeholder="Line 2"
              />
              <Input
                value={formData.renewal_goods_services_3 || ''}
                onChange={(e) => handleInputChange('renewal_goods_services_3', e.target.value)}
                placeholder="Line 3"
              />
              <Input
                value={formData.renewal_goods_services_4 || ''}
                onChange={(e) => handleInputChange('renewal_goods_services_4', e.target.value)}
                placeholder="Line 4"
              />
              <Input
                value={formData.renewal_goods_services_5 || ''}
                onChange={(e) => handleInputChange('renewal_goods_services_5', e.target.value)}
                placeholder="Line 5"
              />
              <Input
                value={formData.renewal_goods_services_6 || ''}
                onChange={(e) => handleInputChange('renewal_goods_services_6', e.target.value)}
                placeholder="Line 6"
              />
            </div>
          </div>
        </div>
      </FormSection>

      {/* Signature */}
      <FormSection 
        title="Signature" 
        icon={PenTool}
        rightElement={
          <Select
            value={Object.keys(sampleSignatureData).find(key => sampleSignatureData[key].label === selectedSignature) || ''}
            onValueChange={(value) => {
              handleLoadSignatureSample(value);
            }}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Load sample data" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sample1">03/2026</SelectItem>
              <SelectItem value="sample2">06/2026</SelectItem>
              <SelectItem value="sample3">01/2026</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Day">
            <Input
              value={formData.renewal_sign_day || ''}
              onChange={(e) => handleInputChange('renewal_sign_day', e.target.value)}
              placeholder="DD"
            />
          </FormField>
          <FormField label="Month">
            <Input
              value={formData.renewal_sign_month || ''}
              onChange={(e) => handleInputChange('renewal_sign_month', e.target.value)}
              placeholder="MM"
            />
          </FormField>
          <FormField label="Year">
            <Input
              value={formData.renewal_sign_year || ''}
              onChange={(e) => handleInputChange('renewal_sign_year', e.target.value)}
              placeholder="YY"
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
};
