import { useEffect, useState } from 'react';
import { LightingService } from '../services';
import type { LightingMode } from '../types';

// Subscribes to the LightingService and returns the current mode.
// Triggers a React re-render when the mode changes.
export function useLightingMode(): LightingMode {
  const [mode, setMode] = useState(() => LightingService.getMode());

  useEffect(() => {
    return LightingService.subscribe(setMode);
  }, []);

  return mode;
}
