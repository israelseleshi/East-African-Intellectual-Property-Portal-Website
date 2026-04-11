import { Button } from '../../../components/ui/button';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, RotateCw, Eye, AlertCircle } from 'lucide-react';

interface PdfPreviewPanelProps {
  showPreview: boolean;
  previewLoading: boolean;
  previewError: string | null;
  previewUrl: string | null;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onTogglePreview: () => void;
}

export function PdfPreviewPanel({
  showPreview,
  previewLoading,
  previewError,
  previewUrl,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onTogglePreview
}: PdfPreviewPanelProps) {
  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--eai-text)]">
          <Eye className="h-5 w-5 text-[var(--eai-primary)]" />
          Live PDF Preview
        </h2>
        <div className="flex items-center gap-1 bg-[var(--eai-bg)] p-1 border border-[var(--eai-border)]">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]"
            onClick={onZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]"
            onClick={onResetZoom}
            title="Reset Zoom"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)]"
            onClick={onZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="h-full flex flex-col overflow-hidden group">
        {previewError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Preview Failed</h3>
            <p className="text-muted-foreground text-sm max-w-xs">{previewError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 border-destructive/20 text-destructive hover:bg-destructive/20"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        ) : previewUrl ? (
          <div className="flex-1 w-full h-full overflow-hidden flex justify-center p-0">
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="w-full h-full bg-white"
              style={{ 
                minHeight: '100%',
                transform: `scale(${zoom})`,
                transformOrigin: 'top center'
              }}
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Eye className="h-12 w-12 text-muted-foreground opacity-30 mb-4" />
            <p className="text-muted-foreground">Preview will appear as you type...</p>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-card/90 backdrop-blur shadow-lg px-4 py-2 border text-xs font-medium text-muted-foreground">
            Live Interactive Preview
          </div>
        </div>
      </Card>
    </div>
  );
}
