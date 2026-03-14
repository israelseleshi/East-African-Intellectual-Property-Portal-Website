import { Button } from '../../../components/ui/button';
import { ZoomIn, ZoomOut, RotateCw, Eye, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--eai-text)]">
          <Eye className="h-5 w-5 text-[var(--eai-primary)]" />
          Live PDF Preview
        </h2>
        <div className="flex items-center gap-1 bg-[var(--eai-bg)] p-1 rounded-lg border border-[var(--eai-border)]">
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

      <div 
        className="relative bg-[var(--eai-surface)] rounded-2xl overflow-hidden border-2 border-[var(--eai-border)] shadow-inner group"
      >
        <AnimatePresence mode="wait">
          {previewLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--eai-bg)]/80 backdrop-blur-sm"
            >
              <Loader2 className="h-10 w-10 text-[var(--eai-primary)] animate-spin mb-4" />
              <p className="text-[var(--eai-text-secondary)] font-medium">Updating preview...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {previewError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[var(--eai-critical)]/10">
            <AlertCircle className="h-12 w-12 text-[var(--eai-critical)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--eai-text)] mb-2">Preview Failed</h3>
            <p className="text-[var(--eai-text-secondary)] text-sm max-w-xs">{previewError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4 border-[var(--eai-critical)]/20 text-[var(--eai-critical)] hover:bg-[var(--eai-critical)]/20"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        ) : previewUrl ? (
          <div className="w-full h-fit flex justify-center bg-[var(--eai-bg)] p-4">
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="w-full aspect-[1/1.414] bg-white shadow-2xl origin-top transition-transform duration-200"
              style={{ 
                transform: `scale(${zoom})`,
                width: zoom > 1 ? `${100 * zoom}%` : '100%',
                height: 'auto',
                minHeight: '1200px'
              }}
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[var(--eai-bg)]">
            <Eye className="h-12 w-12 text-[var(--eai-text-secondary)] opacity-30 mb-4" />
            <p className="text-[var(--eai-text-secondary)]">Preview will appear as you type...</p>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-[var(--eai-surface)]/90 backdrop-blur shadow-lg rounded-full px-4 py-2 border border-[var(--eai-border)] text-xs font-medium text-[var(--eai-text-secondary)]">
            Live Interactive Preview
          </div>
        </div>
      </div>
    </div>
  );
}
