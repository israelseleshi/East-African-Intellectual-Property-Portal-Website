import React from 'react';
import { MapPin } from 'lucide-react';
import { FormSection, FormField, CountrySelect } from '../components/FormShared';
import { CountrySelector } from '@/components/CountrySelector';
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
          <input
            value={formData.address_street}
            onChange={(e) => handleInputChange('address_street', e.target.value)}
            className="apple-input"
            placeholder="Enter street address"
          />
        </FormField>
        <FormField label="Zone / Subcity">
          <input
            value={formData.address_zone}
            onChange={(e) => handleInputChange('address_zone', e.target.value)}
            className="apple-input"
            placeholder="Enter zone or subcity"
          />
        </FormField>
        <FormField label="Wereda">
          <input
            value={formData.wereda}
            onChange={(e) => handleInputChange('wereda', e.target.value)}
            className="apple-input"
            placeholder="Enter wereda/district"
          />
        </FormField>
        <FormField label="City name">
          <input
            value={formData.city_name}
            onChange={(e) => handleInputChange('city_name', e.target.value)}
            className="apple-input"
            placeholder="Enter city name"
          />
        </FormField>
        <FormField label="City Code">
          <input
            value={formData.city_code}
            onChange={(e) => handleInputChange('city_code', e.target.value)}
            className="apple-input"
            placeholder="City code"
          />
        </FormField>
        <FormField label="State Name">
          <input
            value={formData.state_name}
            onChange={(e) => handleInputChange('state_name', e.target.value)}
            className="apple-input"
            placeholder="Enter state / region"
          />
        </FormField>
        <FormField label="State Code">
          <input
            value={formData.state_code}
            onChange={(e) => handleInputChange('state_code', e.target.value)}
            className="apple-input"
            placeholder="State code"
          />
        </FormField>
        <FormField label="House number">
          <input
            value={formData.house_no}
            onChange={(e) => handleInputChange('house_no', e.target.value)}
            className="apple-input"
            placeholder="Enter house no."
          />
        </FormField>
        <FormField label="ZIP / Postal code">
          <input
            value={formData.zip_code}
            onChange={(e) => handleInputChange('zip_code', e.target.value)}
            className="apple-input"
            placeholder="Enter ZIP code"
          />
        </FormField>
        <FormField label="Telephone">
          <input
            value={formData.telephone}
            onChange={(e) => handleInputChange('telephone', e.target.value)}
            className="apple-input"
            placeholder="+251 ..."
          />
        </FormField>
        <FormField label="P.O. Box">
          <input
            value={formData.po_box}
            onChange={(e) => handleInputChange('po_box', e.target.value)}
            className="apple-input"
            placeholder="Enter P.O. Box"
          />
        </FormField>
        <FormField label="Email">
          <input
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="apple-input"
            placeholder="name@example.com"
          />
        </FormField>
        <FormField label="Fax">
          <input
            value={formData.fax}
            onChange={(e) => handleInputChange('fax', e.target.value)}
            className="apple-input"
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
