import React from 'react';

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
