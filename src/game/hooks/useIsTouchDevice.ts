import { useState, useEffect } from 'react';

// returns true on devices without a fine pointer (phones, tablets)
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(!window.matchMedia('(pointer: fine)').matches);
  }, []);

  return isTouch;
}
