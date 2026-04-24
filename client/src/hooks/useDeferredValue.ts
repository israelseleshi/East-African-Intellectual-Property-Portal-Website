import { useTransition, useDeferredValue, useState, useCallback, useMemo } from 'react';

interface UseDeferredUpdatesOptions<T> {
  initialValue: T;
  onUpdate?: (value: T) => void;
}

export function useDeferredUpdates<T>({ initialValue, onUpdate }: UseDeferredUpdatesOptions<T>) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState<T>(initialValue);
  const deferredValue = useDeferredValue(value);
  
  const updateValue = useCallback((newValue: T) => {
    startTransition(() => {
      setValue(newValue);
      onUpdate?.(newValue);
    });
  }, [onUpdate]);
  
  return {
    value,
    deferredValue,
    updateValue,
    isPending,
  };
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useMemo(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

export function useDeferredMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  deferDeps?: React.DependencyList
): T {
  useDeferredValue(deps);
  return useMemo(factory, deferDeps || deps);
}
