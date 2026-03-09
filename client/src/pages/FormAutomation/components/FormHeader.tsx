import { LucideIcon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { RefreshCcw, Download, Settings, Briefcase, XCircle } from 'lucide-react';

interface FormHeaderProps {
  formType: 'APPLICATION' | 'RENEWAL';
  isSubmitting: boolean;
  onRefresh: () => void;
  onDownload: () => void;
  onToggleFields: () => void;
  onSubmit: () => void;
  showFields: boolean;
}

export function FormHeader({
  formType,
  isSubmitting,
  onRefresh,
  onDownload,
  onToggleFields,
  onSubmit,
  showFields
}: FormHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--eai-text)]">
          {formType === 'RENEWAL' ? 'Renewal Form Automation' : 'EIPA Form Automation'}
        </h1>
        <p className="text-[var(--eai-text-secondary)] mt-1">
          {formType === 'RENEWAL' 
            ? 'Generate official trademark renewal forms for Ethiopia.' 
            : 'Generate professional trademark applications for Ethiopia.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2" id="form-controls-section">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          id="inspect-tags-button"
          onClick={onToggleFields}
          className={`gap-2 ${showFields ? 'bg-[var(--eai-bg)]' : ''}`}
        >
          <Settings className="h-4 w-4" />
          {showFields ? 'Hide Tags' : 'Inspect Tags'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          id="download-pdf-button"
          onClick={onDownload}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button
          size="sm"
          id="submit-button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? (
            <RefreshCcw className="h-4 w-4 animate-spin" />
          ) : (
            <Briefcase className="h-4 w-4" />
          )}
          {isSubmitting ? 'Submitting...' : 'Submit to Docket'}
        </Button>
      </div>
    </div>
  );
}
