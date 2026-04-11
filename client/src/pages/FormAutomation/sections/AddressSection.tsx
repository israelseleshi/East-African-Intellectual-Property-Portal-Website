import React from 'react';
import { MapPin } from 'lucide-react';
import { FormSection, FormField, CountrySelect } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
import { Input } from '@/components/ui/input';
import { EipaFormData } from '../types';

interface AddressSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const AddressSection: React.FC<AddressSectionProps> = ({ formData, handleInputChange }) => {
  return (
    <FormSection
      id="address-section"
      title="II. Address & Contact"
      icon={MapPin}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Street address" className="sm:col-span-2">
          <Input
            value={formData.address_street}
            onChange={(e) => handleInputChange('address_street', e.target.value)}
            placeholder="Enter street address"
          />
        </FormField>
        <FormField label="Zone / Subcity">
          <Input
            value={formData.address_zone}
            onChange={(e) => handleInputChange('address_zone', e.target.value)}
            placeholder="Enter zone or subcity"
          />
        </FormField>
        <FormField label="Wereda">
          <Input
            value={formData.wereda}
            onChange={(e) => handleInputChange('wereda', e.target.value)}
            placeholder="Enter wereda/district"
          />
        </FormField>
        <FormField label="City name">
          <Input
            value={formData.city_name}
            onChange={(e) => handleInputChange('city_name', e.target.value)}
            placeholder="Enter city name"
          />
        </FormField>
        <FormField label="City Code">
          <Input
            value={formData.city_code}
            onChange={(e) => handleInputChange('city_code', e.target.value)}
            placeholder="City code"
          />
        </FormField>
        <FormField label="State Name">
          <Input
            value={formData.state_name}
            onChange={(e) => handleInputChange('state_name', e.target.value)}
            placeholder="Enter state / region"
          />
        </FormField>
        <FormField label="State Code">
          <Input
            value={formData.state_code}
            onChange={(e) => handleInputChange('state_code', e.target.value)}
            placeholder="State code"
          />
        </FormField>
        <FormField label="House number">
          <Input
            value={formData.house_no}
            onChange={(e) => handleInputChange('house_no', e.target.value)}
            placeholder="Enter house no."
          />
        </FormField>
        <FormField label="ZIP / Postal code">
          <Input
            value={formData.zip_code}
            onChange={(e) => handleInputChange('zip_code', e.target.value)}
            placeholder="Enter ZIP code"
          />
        </FormField>
        <FormField label="Telephone">
          <Input
            value={formData.telephone}
            onChange={(e) => handleInputChange('telephone', e.target.value)}
            placeholder="+251 ..."
          />
        </FormField>
        <FormField label="P.O. Box">
          <Input
            value={formData.po_box}
            onChange={(e) => handleInputChange('po_box', e.target.value)}
            placeholder="Enter P.O. Box"
          />
        </FormField>
        <FormField label="Email">
          <Input
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="name@example.com"
          />
        </FormField>
        <FormField label="Fax">
          <Input
            value={formData.fax}
            onChange={(e) => handleInputChange('fax', e.target.value)}
            placeholder="Enter fax number"
          />
        </FormField>
        <div id="nationality-field">
          <CountrySelect
            label="Nationality"
            value={formData.nationality}
            onChange={(val: string) => handleInputChange('nationality', val)}
            placeholder="Select nationality"
          />
        </div>
        <FormField label="Country of residence">
          <CountrySelector
            value={formData.residence_country}
            onChange={(val) => handleInputChange('residence_country', val)}
            placeholder="Select residence country"
          />
        </FormField>
      </div>
    </FormSection>
  );
};
