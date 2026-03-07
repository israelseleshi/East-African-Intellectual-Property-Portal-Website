import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

interface Jurisdiction {
  code: string;
  name: string;
  opposition_period_days: number;
  renewal_period_years: number;
  currency_code: string;
  rules_summary?: string;
}

interface JurisdictionSelectorProps {
  value: string;
  onChange: (code: string, jurisdiction?: Jurisdiction) => void;
  disabled?: boolean;
}

export function JurisdictionSelector({ value, onChange, disabled }: JurisdictionSelectorProps) {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<Jurisdiction | null>(null);
  const api = useApi();

  useEffect(() => {
    loadJurisdictions();
  }, []);

  useEffect(() => {
    if (value && jurisdictions.length > 0) {
      const found = jurisdictions.find(j => j.code === value);
      setSelectedJurisdiction(found || null);
    }
  }, [value, jurisdictions]);

  const loadJurisdictions = async () => {
    try {
      const data = await api.get('/jurisdictions');
      setJurisdictions(data);
    } catch (error) {
      console.error('Failed to load jurisdictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (code: string) => {
    const jurisdiction = jurisdictions.find(j => j.code === code);
    setSelectedJurisdiction(jurisdiction || null);
    onChange(code, jurisdiction);
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading jurisdictions...</div>;
  }

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
      >
        <option value="">Select Jurisdiction</option>
        {jurisdictions.map((j) => (
          <option key={j.code} value={j.code}>
            {j.name} ({j.code})
          </option>
        ))}
      </select>

      {selectedJurisdiction && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-600">Opposition Period:</span>
              <span className="ml-1 font-medium">{selectedJurisdiction.opposition_period_days} days</span>
            </div>
            <div>
              <span className="text-gray-600">Renewal Period:</span>
              <span className="ml-1 font-medium">{selectedJurisdiction.renewal_period_years} years</span>
            </div>
            <div>
              <span className="text-gray-600">Currency:</span>
              <span className="ml-1 font-medium">{selectedJurisdiction.currency_code}</span>
            </div>
          </div>
          {selectedJurisdiction.rules_summary && (
            <p className="mt-2 text-gray-700 text-xs">{selectedJurisdiction.rules_summary}</p>
          )}
        </div>
      )}
    </div>
  );
}
