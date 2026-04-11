import { LucideIcon } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { RefreshCcw, Download, Settings, Briefcase } from 'lucide-react'

interface FormHeaderProps {
  formType: 'APPLICATION' | 'RENEWAL'
  isSubmitting: boolean
  onRefresh: () => void
  onDownload: () => void
  onToggleFields: () => void
  onSubmit: () => void
  showFields: boolean
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
        <h1 className="text-3xl font-bold tracking-tight">
          {formType === 'RENEWAL' ? 'Renewal Form' : 'Application Form'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {formType === 'RENEWAL' 
            ? 'Generate official trademark renewal forms for East Africa.' 
            : 'Generate professional trademark applications for East Africa.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2" id="form-controls-section">
        <Button
          variant="outline"
          size="sm"
          id="inspect-tags-button"
          onClick={onToggleFields}
          className={showFields ? 'bg-muted' : ''}
        >
          <Settings className="h-4 w-4 mr-2" />
          {showFields ? 'Hide Tags' : 'Inspect Tags'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          id="download-pdf-button"
          onClick={onDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button
          size="sm"
          id="submit-button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <RefreshCcw className="h-4 w-4 animate-spin" />
          ) : (
            <Briefcase className="h-4 w-4 mr-2" />
          )}
          {isSubmitting ? 'Submitting...' : formType === 'RENEWAL' ? 'Submit Renewal' : 'Submit Application'}
        </Button>
      </div>
    </div>
  )
}