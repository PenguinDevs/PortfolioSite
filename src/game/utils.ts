import { useMemo } from 'react';

/**
 * Creates a ref-like object whose `.current` is derived from a getter.
 * Useful for passing a computed value where a `RefObject` is expected.
 */
export function useDerivedRef<T>(getter: () => T): { readonly current: T } {
  return useMemo(() => Object.defineProperty({} as { current: T }, 'current', { get: getter }), [getter]);
}

export function pickDefined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  );
}
