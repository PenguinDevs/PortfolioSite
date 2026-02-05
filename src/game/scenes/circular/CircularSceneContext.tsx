'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

// Config provided by the circular scene provider
interface CircularSceneConfig {
  trackLength: number;
}

const CircularSceneContext = createContext<CircularSceneConfig | null>(null);

interface CircularSceneProviderProps {
  // total length of the circular track along the X axis
  trackLength: number;
  children: ReactNode;
}

// Wraps any scene in a circular context so child CircularSlots
// know how to position themselves on the ring.
export function CircularSceneProvider({ trackLength, children }: CircularSceneProviderProps) {
  const config = useMemo<CircularSceneConfig>(() => ({ trackLength }), [trackLength]);

  return (
    <CircularSceneContext.Provider value={config}>
      {children}
    </CircularSceneContext.Provider>
  );
}

export function useCircularScene(): CircularSceneConfig {
  const config = useContext(CircularSceneContext);
  if (!config) throw new Error('useCircularScene must be used within a CircularSceneProvider');
  return config;
}

// Wraps x into [0, length)
export function wrapPosition(x: number, length: number): number {
  return ((x % length) + length) % length;
}

// Finds the world-space X for the copy of baseX that is closest
// to referenceX on a circular track. The result is NOT clamped to
// [0, trackLength) -- it sits next to referenceX in world space so
// the camera and rendering stay smooth.
export function resolveWrappedX(
  baseX: number,
  referenceX: number,
  trackLength: number,
): number {
  const ringRef = wrapPosition(referenceX, trackLength);
  const diff = baseX - ringRef;
  // shift diff into [-trackLength/2, trackLength/2)
  const wrapped = diff - trackLength * Math.floor((diff + trackLength / 2) / trackLength);
  return referenceX + wrapped;
}
