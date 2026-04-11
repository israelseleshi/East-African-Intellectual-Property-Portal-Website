import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CountrySelector } from '@/components/CountrySelector'

interface FormSectionProps {
  id?: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ id, title, icon: Icon, children, rightElement }) => (
  <Card className="border shadow-sm" id={id}>
    <CardHeader className="pb-4 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="text-primary" size={20} />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        {rightElement}
      </div>
    </CardHeader>
    <CardContent className="space-y-6 pt-6">
      {children}
    </CardContent>
  </Card>
);

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  amharic?: boolean;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ label, children, className = '', amharic, id }) => (
  <div className={`space-y-2 ${className}`} id={id}>
    <Label className={`text-sm font-medium ${amharic ? 'font-amharic' : ''}`}>{label}</Label>
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
    {label && <Label className="text-sm font-medium text-muted-foreground">{label}</Label>}
    <div className={`grid grid-cols-1 ${columns > 1 ? `sm:grid-cols-${columns}` : ''} gap-2`}>
      {options.map(opt => (
        <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
          <Checkbox
            checked={!!values[opt.id]}
            onCheckedChange={(checked) => onChange(opt.id, checked as boolean)}
          />
          <span className="text-sm group-hover:text-primary transition-colors">{opt.label}</span>
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
];

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({ value, onChange, placeholder = "Select country", label }) => {
  return (
    <div className="space-y-2 w-full">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <CountrySelector 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
      />
    </div>
  );
};