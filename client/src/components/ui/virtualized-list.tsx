import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight: number;
  className?: string;
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  containerHeight,
  className,
  getItemKey,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  
  const totalHeight = items.length * itemHeight;
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    const result: { item: T; index: number; key: string | number }[] = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const key = getItemKey ? getItemKey(items[i], i) : (items[i] as { id?: string | number }).id ?? i;
      result.push({ item: items[i], index: i, key });
    }
    return result;
  }, [items, visibleRange, itemHeight, renderItem, getItemKey]);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      setScrollTop(e.currentTarget.scrollTop);
    });
  }, []);
  
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);
  
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      className={cn('scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent', className)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, key }) => (
          <div
            key={key}
            style={{
              position: 'absolute',
              top: index * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

interface AutoVirtualizedProps<T> extends Omit<VirtualizedListProps<T>, 'containerHeight'> {
  estimatedItemHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function AutoVirtualizedList<T>({
  minHeight = 200,
  maxHeight = 800,
  className,
  ...props
}: AutoVirtualizedProps<T>) {
  const [containerHeight, setContainerHeight] = useState(minHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 20;
        setContainerHeight(Math.min(maxHeight, Math.max(minHeight, availableHeight)));
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [minHeight, maxHeight]);
  
  return (
    <div ref={containerRef} className={className}>
      <VirtualizedList {...props} containerHeight={containerHeight} />
    </div>
  );
}
