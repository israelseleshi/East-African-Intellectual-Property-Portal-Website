import { ApplicantSection } from '../sections/ApplicantSection';
import { AddressSection } from '../sections/AddressSection';
import { AgentSection } from '../sections/AgentSection';
import { MarkSpecificationSection } from '../sections/MarkSpecificationSection';
import { NiceClassificationSection } from '../sections/NiceClassificationSection';
import { PrioritySection } from '../sections/PrioritySection';
import { DisclaimerSection } from '../sections/DisclaimerSection';
import { ChecklistSection } from '../sections/ChecklistSection';
import { RenewalSection } from '../sections/RenewalSection';
import { EipaFormData, Client, FormType } from '../types';

interface JurisdictionSpecificFieldsProps {
  formType: FormType;
  formData: EipaFormData;
  setFormData: (data: any) => void;
  clients: Client[];
  selectedClientId: string;
  onClientChange: (clientId: string) => void;
  onNiceClassesChange: (classes: number[]) => void;
  niceClasses: number[];
  markImageBase64: string | null;
  onImageChange: (base64: string | null) => void;
  onImageFileChange: (file: File | null) => void;
  showFields: boolean;
  availableFields: string[];
}

export function JurisdictionSpecificFields({
  formType,
  formData,
  setFormData,
  clients,
  selectedClientId,
  onClientChange,
  onNiceClassesChange,
  niceClasses,
  markImageBase64,
  onImageChange,
  onImageFileChange,
  showFields,
  availableFields,
}: JurisdictionSpecificFieldsProps) {
  const handleInputChange = (field: keyof EipaFormData, value: string | boolean) => {
    setFormData({ [field]: value } as Partial<EipaFormData>);
  };

  if (formType === 'RENEWAL') {
    return (
      <div className="space-y-8">
        <RenewalSection
          formData={formData}
          handleInputChange={handleInputChange}
          setFormData={setFormData}
          clients={clients}
          selectedClientId={selectedClientId}
          handleClientSelect={onClientChange}
          markImage={markImageBase64}
          onImageChange={onImageChange}
          onImageFileChange={onImageFileChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ApplicantSection
        formData={formData}
        handleInputChange={handleInputChange}
        clients={clients}
        selectedClientId={selectedClientId}
        handleClientSelect={onClientChange}
      />

      <AddressSection
        formData={formData}
        handleInputChange={handleInputChange}
      />

      <AgentSection
        formData={formData}
        handleInputChange={handleInputChange}
        setFormData={setFormData}
      />

      <MarkSpecificationSection
        formData={formData}
        handleInputChange={handleInputChange}
        setFormData={setFormData}
        markImage={markImageBase64}
        onImageChange={onImageChange}
        onImageFileChange={onImageFileChange}
        onNiceClassesChange={onNiceClassesChange}
      />

      <NiceClassificationSection
        formData={formData}
        handleInputChange={handleInputChange}
        setFormData={setFormData}
        selectedClasses={niceClasses}
        onClassesChange={onNiceClassesChange}
      />

      <PrioritySection
        formData={formData}
        handleInputChange={handleInputChange}
        setFormData={setFormData}
      />

      <DisclaimerSection
        formData={formData}
        handleInputChange={handleInputChange}
        setFormData={setFormData}
      />

      <ChecklistSection
        formData={formData}
        handleInputChange={handleInputChange}
        setFormData={setFormData}
      />
    </div>
  );
}
