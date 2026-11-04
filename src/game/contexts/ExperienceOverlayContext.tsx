'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ExperienceData, InternshipOffer } from '@/data/portfolio';

interface ExperienceOverlayState {
  experience: ExperienceData[];
  internshipOffers: InternshipOffer[];
  activeExperience: ExperienceData | null;
  showExperience: (entry: ExperienceData) => void;
  hideExperience: () => void;
}

const ExperienceOverlayContext = createContext<ExperienceOverlayState | null>(null);

export function ExperienceOverlayProvider({
  experience,
  internshipOffers,
  children,
}: {
  experience: ExperienceData[];
  internshipOffers: InternshipOffer[];
  children: ReactNode;
}) {
  const [activeExperience, setActiveExperience] = useState<ExperienceData | null>(null);

  const showExperience = useCallback((entry: ExperienceData) => setActiveExperience(entry), []);
  const hideExperience = useCallback(() => setActiveExperience(null), []);

  return (
    <ExperienceOverlayContext.Provider
      value={{ experience, internshipOffers, activeExperience, showExperience, hideExperience }}
    >
      {children}
    </ExperienceOverlayContext.Provider>
  );
}

export function useExperienceOverlay(): ExperienceOverlayState {
  const ctx = useContext(ExperienceOverlayContext);
  if (!ctx) throw new Error('useExperienceOverlay must be used within an ExperienceOverlayProvider');
  return ctx;
}
