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

// deterministic phase from a string so each entity bobs at its own offset (FNV-1a)
export function phaseFromId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (Math.abs(h | 0) % 1000) / 1000 * Math.PI * 2;
}
