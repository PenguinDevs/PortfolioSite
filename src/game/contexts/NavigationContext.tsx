'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode, MutableRefObject } from 'react';
import type { Group } from 'three';
import { Section } from '../types';
import { SECTIONS, TRACK_LENGTH } from '../constants';
import { circularDelta } from '../scenes/circular/CircularSceneContext';
import { section$ } from '../services/section';

// null means autopilot is inactive
export type AutopilotTarget = { targetX: number; direction: 1 | -1 } | null;

interface NavigationState {
  currentSection: Section;
  navigateTo: (section: Section, direction: 1 | -1) => void;
  // shared ref for MovementService to read each frame
  autopilotTargetRef: MutableRefObject<AutopilotTarget>;
  // called once by HomeScene so we can read player position outside the Canvas
  setPlayerGroupRef: (ref: { readonly current: Group | null }) => void;
}

const NavigationContext = createContext<NavigationState | null>(null);

// if the player is already this close to the target, skip navigation
const MIN_NAVIGATE_DISTANCE = 0.5;

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentSection, setCurrentSection] = useState<Section>(Section.Home);
  const autopilotTargetRef = useRef<AutopilotTarget>(null);
  const playerGroupRefHolder = useRef<{ readonly current: Group | null }>({ current: null });

  const setPlayerGroupRef = useCallback((ref: { readonly current: Group | null }) => {
    playerGroupRefHolder.current = ref;
  }, []);

  // subscribe to section changes pushed by MovementService
  useEffect(() => {
    const sub = section$.subscribe(setCurrentSection);
    return () => sub.unsubscribe();
  }, []);

  const navigateTo = useCallback((section: Section, direction: 1 | -1) => {
    const group = playerGroupRefHolder.current.current;
    if (!group) return;

    const target = SECTIONS.find((s) => s.id === section);
    if (!target) return;

    const delta = circularDelta(group.position.x, target.x, TRACK_LENGTH);
    if (Math.abs(delta) < MIN_NAVIGATE_DISTANCE) return;

    autopilotTargetRef.current = { targetX: target.x, direction };
  }, []);

  return (
    <NavigationContext.Provider value={{ currentSection, navigateTo, autopilotTargetRef, setPlayerGroupRef }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationState {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within a NavigationProvider');
  return ctx;
}
