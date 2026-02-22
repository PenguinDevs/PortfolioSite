import { useState, useEffect } from 'react';

const POINTER_QUERY = '(pointer: fine)';

// returns true on devices without a fine pointer (phones, tablets).
// listens for matchMedia changes so the value stays current when the
// input mode switches (e.g. Surface/iPad connecting a keyboard,
// DevTools device-mode toggle).
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.matchMedia(POINTER_QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(POINTER_QUERY);
    // sync in case the initial render ran on the server
    setIsTouch(!mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsTouch(!e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isTouch;
}
