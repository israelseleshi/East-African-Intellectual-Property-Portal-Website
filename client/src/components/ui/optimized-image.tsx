import React, { useState, useEffect, useRef, useCallback, forwardRef, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type OptimizedImageProps = {
  lowQualitySrc?: string;
  aspectRatio?: string;
  fallbackSrc?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
} & ImgHTMLAttributes<HTMLImageElement>;

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(({
  src,
  lowQualitySrc,
  alt = '',
  className,
  aspectRatio,
  fallbackSrc,
  onLoadEnd,
  loading = 'lazy',
  style,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || src || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    setCurrentSrc(lowQualitySrc || src || '');
    setIsLoaded(false);
    setHasError(false);
  }, [src, lowQualitySrc]);
  
  const handleLoad = useCallback(() => {
    if (src && src !== lowQualitySrc) {
      setCurrentSrc(src);
    }
    setIsLoaded(true);
    onLoadEnd?.();
  }, [src, lowQualitySrc, onLoadEnd]);
  
  const handleError = useCallback(() => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
    onLoadEnd?.();
  }, [currentSrc, fallbackSrc, onLoadEnd]);
  
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }
    
    if (loading !== 'lazy' || !imgRef.current) {
      return;
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && currentSrc) {
            const img = new Image();
            img.src = src || '';
            img.onload = handleLoad;
            img.onerror = handleError;
          }
        });
      },
      { rootMargin: '50px' }
    );
    
    observerRef.current.observe(imgRef.current);
    
    return () => {
      observerRef.current?.disconnect();
    };
  }, [loading, currentSrc, src, handleLoad, handleError]);
  
  const containerStyle: React.CSSProperties = {
    ...style,
    ...(aspectRatio ? { aspectRatio } : {}),
  };
  
  return (
    <div 
      className={cn('overflow-hidden bg-muted relative', className)}
      style={containerStyle}
    >
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-50',
          hasError && 'hidden'
        )}
        {...props}
      />
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

type LazyImageProps = {
  threshold?: number;
} & ImgHTMLAttributes<HTMLImageElement>;

export function LazyImage({
  src,
  alt = '',
  className,
  threshold = 0.1,
  style,
  ...props
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => observer.disconnect();
  }, [threshold]);
  
  return (
    <div ref={containerRef} className={cn('bg-muted animate-pulse', className)} style={style}>
      {isVisible ? (
        <img src={src} alt={alt} loading="lazy" {...props} />
      ) : (
        <div className="bg-muted" style={{ minHeight: '100px' }} />
      )}
    </div>
  );
}
