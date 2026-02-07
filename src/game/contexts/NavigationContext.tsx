'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode, MutableRefObject } from 'react';
import type { Group } from 'three';
import { Section } from '../types';
import { SECTIONS, TRACK_LENGTH } from '../constants';
import { circularDelta, wrapPosition } from '../scenes/circular/CircularSceneContext';

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

// how often we poll the player position for active-section updates (ms)
const POLL_INTERVAL = 200;
// if the player is already this close to the target, skip navigation
const MIN_NAVIGATE_DISTANCE = 0.5;

// find which section the player is in using range boundaries.
// SECTIONS is sorted by rangeStart ascending. the last entry whose
// rangeStart <= wrappedX wins; if none match, wrap around to the last entry.
function activeSection(x: number): Section {
  const wrapped = wrapPosition(x, TRACK_LENGTH);
  let result = SECTIONS[SECTIONS.length - 1];
  for (const section of SECTIONS) {
    if (section.rangeStart <= wrapped) {
      result = section;
    }
  }
  return result.id;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentSection, setCurrentSection] = useState<Section>(Section.Home);
  const autopilotTargetRef = useRef<AutopilotTarget>(null);
  const playerGroupRefHolder = useRef<{ readonly current: Group | null }>({ current: null });

  const setPlayerGroupRef = useCallback((ref: { readonly current: Group | null }) => {
    playerGroupRefHolder.current = ref;
  }, []);

  // poll player position at a low frequency to update the active section indicator
  useEffect(() => {
    const interval = setInterval(() => {
      const group = playerGroupRefHolder.current.current;
      if (!group) return;

      const section = activeSection(group.position.x);
      setCurrentSection(section);
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
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
