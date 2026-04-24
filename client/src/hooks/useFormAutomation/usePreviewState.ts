import { useState, useCallback, useEffect, useRef } from 'react';
import type { FormType } from './types';
import { fillPdfForm, getPdfFields } from '@/utils/pdfUtils';

export interface UsePreviewStateReturn {
  previewUrl: string | null;
  previewLoading: boolean;
  previewError: string | null;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  showPreview: boolean;
  setShowPreview: React.Dispatch<React.SetStateAction<boolean>>;
  availableFields: string[];
  setAvailableFields: React.Dispatch<React.SetStateAction<string[]>>;
  generatePreview: () => Promise<void>;
  isGenerating: boolean;
}

export function usePreviewState(
  formType: FormType,
  formData: Record<string, unknown> | { [key: string]: unknown }
): UsePreviewStateReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showPreview, setShowPreview] = useState(true);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const generatePreview = useCallback(async () => {
    if (!showPreview) return;

    setIsGenerating(true);
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
      const pdfBytes = await fillPdfForm(pdfFile, formData, false);

      if (pdfBytes && pdfBytes.length > 0) {
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        // Clean up previous URL
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } else {
        throw new Error('Generated PDF is empty');
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      setPreviewLoading(false);
      setIsGenerating(false);
    }
  }, [formData, formType, showPreview]);

  const loadAvailableFields = useCallback(async () => {
    try {
      const pdfFile = formType === 'RENEWAL' ? '/renewal_form.pdf' : '/application_form.pdf';
      const fields = await getPdfFields(pdfFile);
      setAvailableFields(fields.map(f => f.name));
    } catch (error) {
      console.warn('Failed to load PDF fields:', error);
      setAvailableFields([]);
    }
  }, [formType]);

  // Regenerate preview when form data or type changes
  useEffect(() => {
    setPreviewUrl(null);
    setPreviewError(null);
    setPreviewLoading(true);
    generatePreview();
  }, [formType, generatePreview]);

  // Load available fields when type changes
  useEffect(() => {
    loadAvailableFields();
  }, [loadAvailableFields]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  return {
    previewUrl,
    previewLoading,
    previewError,
    zoom,
    setZoom,
    showPreview,
    setShowPreview,
    availableFields,
    setAvailableFields,
    generatePreview,
    isGenerating,
  };
}
