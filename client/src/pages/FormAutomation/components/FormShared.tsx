import React from 'react';
import { CountrySelector } from '@/components/CountrySelector';

interface FormSectionProps {
  id?: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ id, title, icon: Icon, children, rightElement }) => (
  <section className="apple-card p-6 space-y-6" id={id}>
    <div className="flex items-center justify-between border-b border-[var(--eai-border)] pb-4">
      <div className="flex items-center gap-2">
        <Icon className="text-[var(--eai-primary)]" size={20} />
        <h2 className="text-h3">{title}</h2>
      </div>
      {rightElement}
    </div>
    {children}
  </section>
);

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  amharic?: boolean;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, children, className = '', amharic, id }) => (
  <div className={`space-y-1.5 ${className}`} id={id}>
    <label className={`text-label text-[var(--eai-text)] ${amharic ? 'font-amharic' : ''}`}>{label}</label>
    {children}
  </div>
);

interface CheckboxGroupProps {
  label?: string;
  options: { id: string; label: string }[];
  values: Record<string, any>;
  onChange: (id: string, checked: boolean) => void;
  columns?: number;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ label, options, values, onChange, columns = 1 }) => (
  <div className="space-y-3">
    {label && <p className="text-label text-[var(--eai-text-secondary)]">{label}</p>}
    <div className={`grid grid-cols-1 ${columns > 1 ? `sm:grid-cols-${columns}` : ''} gap-2`}>
      {options.map(opt => (
        <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={!!values[opt.id]}
            onChange={(e) => onChange(opt.id, e.target.checked)}
            className="h-5 w-5 rounded-xl border-[var(--eai-border)] text-[var(--eai-primary)] focus:ring-[var(--eai-primary)]"
          />
          <span className="text-body group-hover:text-[var(--eai-primary)] transition-colors">{opt.label}</span>
        </label>
      ))}
    </div>
  </div>
);

export const COUNTRIES = [
  { name: 'Ethiopia', code: 'ET', flag: '/flags/ethiopia-flag.png' },
  { name: 'Kenya', code: 'KE', flag: '/flags/kenya-flag.png' },
  { name: 'Tanzania', code: 'TZ', flag: '/flags/tanzania-flag.webp' },
  { name: 'Uganda', code: 'UG', flag: '/flags/uganda-flag.png' },
  { name: 'Rwanda', code: 'RW', flag: '/flags/rwanda-flag.png' },
  { name: 'Burundi', code: 'BI', flag: '/flags/burundi-flag.png' },
  { name: 'Djibouti', code: 'DJ', flag: '/flags/djibouti-flag.png' },
  { name: 'Eritrea', code: 'ER', flag: '/flags/eritrea-flag.png' },
  { name: 'Somalia', code: 'SO', flag: '/flags/somalia-flag.png' },
  { name: 'Sudan', code: 'SD', flag: '/flags/sudan-image.png' },
  { name: 'United Kingdom', code: 'GB', flag: 'https://flagcdn.com/w40/gb.png' },
  { name: 'United States', code: 'US', flag: 'https://flagcdn.com/w40/us.png' },
  { name: 'United Arab Emirates', code: 'AE', flag: 'https://flagcdn.com/w40/ae.png' },
  { name: 'China', code: 'CN', flag: 'https://flagcdn.com/w40/cn.png' },
  { name: 'India', code: 'IN', flag: 'https://flagcdn.com/w40/in.png' },
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange, placeholder = "Select country", label }) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-label text-[var(--eai-text)]">{label}</label>}
      <CountrySelector 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
      />
    </div>
  );
};
