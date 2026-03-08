import { useState, useEffect, useCallback } from 'react';
import { X, CaretRight, CaretLeft } from '@phosphor-icons/react';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TourGuideProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  tourName: string;
}

export function TourGuide({ steps, isOpen, onClose, tourName }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightBox, setHighlightBox] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const updatePositions = useCallback(() => {
    if (!isOpen || steps.length === 0) return;
    
    const step = steps[currentStep];
    const target = document.querySelector(step.target);
    
    if (target) {
      const rect = target.getBoundingClientRect();
      const scrollY = window.scrollY;
      
      setHighlightBox({
        top: rect.top + scrollY,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });

      // Calculate tooltip position
      let top = rect.top + scrollY;
      let left = rect.left + rect.width / 2;
      
      const position = step.position || 'bottom';
      
      switch (position) {
        case 'top':
          top = rect.top + scrollY - 20;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + 20;
          break;
        case 'left':
          left = rect.left - 20;
          top = rect.top + scrollY + rect.height / 2;
          break;
        case 'right':
          left = rect.right + 20;
          top = rect.top + scrollY + rect.height / 2;
          break;
      }
      
      setTooltipPosition({ top, left });
      
      // Scroll target into view
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, isOpen, steps]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to let DOM render
      setTimeout(updatePositions, 300);
      window.addEventListener('resize', updatePositions);
      window.addEventListener('scroll', updatePositions, true);
    }
    
    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions, true);
    };
  }, [isOpen, updatePositions]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen, tourName]);

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay with cutout */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="highlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={highlightBox.left}
                y={highlightBox.top}
                width={highlightBox.width}
                height={highlightBox.height}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="black"
            fillOpacity="0.6"
            mask="url(#highlight-mask)"
          />
        </svg>
        
        {/* Highlight border */}
        <div
          className="absolute border-2 border-[var(--eai-primary)] rounded-lg pointer-events-none"
          style={{
            top: highlightBox.top,
            left: highlightBox.left,
            width: highlightBox.width,
            height: highlightBox.height
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        className="absolute pointer-events-auto"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: step.position === 'left' || step.position === 'right' 
            ? 'translateY(-50%)' 
            : 'translateX(-50%)'
        }}
      >
        <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm min-w-[320px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[var(--eai-primary)] tracking-wider">
              Step {currentStep + 1} of {steps.length}
            </span>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          
          <h4 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h4>
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">{step.content}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep 
                      ? 'w-6 bg-[var(--eai-primary)]' 
                      : 'w-1.5 bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <CaretLeft size={16} />
                  Back
                </button>
              )}
              <button
                onClick={() => isLast ? onClose() : setCurrentStep(prev => prev + 1)}
                className="px-4 py-2 text-sm font-medium bg-[var(--eai-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                {isLast ? 'Finish' : 'Next'}
                {!isLast && <CaretRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage tour state from URL
export function useTour(tourName: string): [boolean, () => void] {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tour = params.get('tour');
    if (tour === tourName) {
      setIsOpen(true);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [tourName]);

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  return [isOpen, closeTour];
}
