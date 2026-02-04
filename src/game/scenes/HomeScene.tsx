'use client';

import { useCallback, useRef } from 'react';
import { Player } from '../entities';
import type { PlayerHandle } from '../entities/Player';
import { useInput } from '../inputs';
import { useDerivedRef } from '../utils';
import { PlayerProvider } from '../contexts';
import { MovementService, PerspectiveCameraService, TutorialService } from '../services';
import { useLightingMode } from '../hooks';
import { AMBIENT_INTENSITY, DIRECTIONAL_INTENSITY } from '../constants';
import { HomeSection } from './HomeSection';
import { AwardsSection } from './AwardsSection';
import { ProjectsSection } from './ProjectsSection';

export function HomeScene() {
  const inputRef = useInput();
  const playerRef = useRef<PlayerHandle>(null);
  const getGroup = useCallback(() => playerRef.current?.group ?? null, []);
  const groupRef = useDerivedRef(getGroup);
  const mode = useLightingMode();

  return (
    <PlayerProvider groupRef={groupRef}>
      <ambientLight intensity={AMBIENT_INTENSITY[mode]} />
      <directionalLight position={[5, 15, 5]} intensity={DIRECTIONAL_INTENSITY[mode]} />
      <HomeSection />
      <AwardsSection position={[36, 0, 0]} />
      <ProjectsSection position={[48, 0, 0]} />
      <Player ref={playerRef} />
      <MovementService inputRef={inputRef} playerRef={playerRef} />
      <PerspectiveCameraService targetRef={groupRef} inputRef={inputRef} />
      <TutorialService inputRef={inputRef} />
    </PlayerProvider>
  );
}
