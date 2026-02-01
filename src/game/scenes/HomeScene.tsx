'use client';

import { useRef } from 'react';
import type { Group } from 'three';
import { Player } from '../entities';
import { useInput } from '../inputs';
import { MovementService, CameraService } from '../services';
import { HomeEnvironment } from './HomeEnvironment';

export function HomeScene() {
  const inputRef = useInput();
  const playerRef = useRef<Group>(null);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <HomeEnvironment />
      <Player ref={playerRef} />
      <MovementService inputRef={inputRef} playerRef={playerRef} />
      <CameraService targetRef={playerRef} />
    </>
  );
}
