'use client';

import { useCallback, useRef } from 'react';
import { Player } from '../entities';
import type { PlayerHandle } from '../entities/Player';
import { useInput } from '../inputs';
import { useDerivedRef } from '../utils';
import { PlayerProvider } from '../contexts';
import { MovementService, PerspectiveCameraService } from '../services';
import { HomeEnvironment } from './HomeEnvironment';

export function HomeScene() {
  const inputRef = useInput();
  const playerRef = useRef<PlayerHandle>(null);
  const getGroup = useCallback(() => playerRef.current?.group ?? null, []);
  const groupRef = useDerivedRef(getGroup);

  return (
    <PlayerProvider groupRef={groupRef}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <HomeEnvironment />
      <Player ref={playerRef} />
      <MovementService inputRef={inputRef} playerRef={playerRef} />
      <PerspectiveCameraService targetRef={groupRef} inputRef={inputRef} />
    </PlayerProvider>
  );
}
