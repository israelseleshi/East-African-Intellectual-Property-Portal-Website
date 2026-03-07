import React from 'react';
import { MapPin } from 'lucide-react';
import { FormSection, FormField } from '../components/FormShared';
import { EipaFormData } from '../types';

interface AddressSectionProps {
  formData: EipaFormData;
  handleInputChange: (field: keyof EipaFormData, value: string | boolean) => void;
}

export const AddressSection: React.FC<AddressSectionProps> = ({ formData, handleInputChange }) => {
  return (
    <FormSection
      id="address-section"
      title="II. Address details"
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
        <FormField label="P.O. Box">
          <input
            value={formData.po_box}
            onChange={(e) => handleInputChange('po_box', e.target.value)}
            className="apple-input"
            placeholder="Enter P.O. Box"
          />
        </FormField>
        <FormField label="Nationality" className="sm:col-span-1" id="nationality-field">
          <input
            value={formData.nationality}
            onChange={(e) => handleInputChange('nationality', e.target.value)}
            className="apple-input"
            placeholder="Enter nationality"
          />
        </FormField>
        <FormField label="Country of residence">
          <input
            value={formData.residence_country}
            onChange={(e) => handleInputChange('residence_country', e.target.value)}
            className="apple-input"
            placeholder="Enter residence country"
          />
        </FormField>
      </div>
    </FormSection>
  );
};
