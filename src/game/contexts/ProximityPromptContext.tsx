'use client';

import { createContext, useCallback, useContext, useRef } from 'react';
import type { ReactNode } from 'react';

// Each ProximityPrompt registers itself with a unique id and its current
// distance to the player. Only the closest prompt is allowed to show.

interface ProximityPromptManager {
  // Called every frame by each prompt with its current distance
  report: (id: string, distance: number) => void;
  // Called when a prompt unmounts or goes out of range
  clear: (id: string) => void;
  // Returns true if the given id is the closest registered prompt
  isClosest: (id: string) => boolean;
}

const ProximityPromptContext = createContext<ProximityPromptManager | null>(null);

export function ProximityPromptProvider({ children }: { children: ReactNode }) {
  // Map of prompt id -> distance, kept as a ref so updates don't cause re-renders
  const distancesRef = useRef<Map<string, number>>(new Map());

  const report = useCallback((id: string, distance: number) => {
    distancesRef.current.set(id, distance);
  }, []);

  const clear = useCallback((id: string) => {
    distancesRef.current.delete(id);
  }, []);

  const isClosest = useCallback((id: string) => {
    const distances = distancesRef.current;
    const myDist = distances.get(id);
    if (myDist === undefined) return false;

    for (const [otherId, otherDist] of distances) {
      if (otherId !== id && otherDist < myDist) return false;
    }
    return true;
  }, []);

  return (
    <ProximityPromptContext.Provider value={{ report, clear, isClosest }}>
      {children}
    </ProximityPromptContext.Provider>
  );
}

export function useProximityPromptManager(): ProximityPromptManager {
  const ctx = useContext(ProximityPromptContext);
  if (!ctx) throw new Error('useProximityPromptManager must be used within a ProximityPromptProvider');
  return ctx;
}
