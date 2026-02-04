'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface AwardData {
  id: string;
  title: string;
  secondaryText: string;
  description: string;
  href: string;
  year: string;
  imageUrl?: string;
  badge?: {
    text: string;
    icon: string;
  };
  stats?: { value: string; label: string }[];
}

interface AwardOverlayState {
  awards: AwardData[];
  activeAward: AwardData | null;
  showAward: (data: AwardData) => void;
  hideAward: () => void;
}

const AwardOverlayContext = createContext<AwardOverlayState | null>(null);

export function AwardOverlayProvider({
  awards,
  children,
}: {
  awards: AwardData[];
  children: ReactNode;
}) {
  const [activeAward, setActiveAward] = useState<AwardData | null>(null);

  const showAward = useCallback((data: AwardData) => setActiveAward(data), []);
  const hideAward = useCallback(() => setActiveAward(null), []);

  return (
    <AwardOverlayContext.Provider value={{ awards, activeAward, showAward, hideAward }}>
      {children}
    </AwardOverlayContext.Provider>
  );
}

export function useAwardOverlay(): AwardOverlayState {
  const ctx = useContext(AwardOverlayContext);
  if (!ctx) throw new Error('useAwardOverlay must be used within an AwardOverlayProvider');
  return ctx;
}
