'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { usePlayerRef } from '../../contexts';
import { useCircularScene } from './CircularSceneContext';

// extra distance past trackLength/2 before a slot wraps, so the
// section is guaranteed off-screen when the jump happens
const DEFAULT_WRAP_BUFFER = 12;

interface CircularSlotProps {
  // the section's home X position on the track (should be in [0, trackLength))
  baseX: number;
  // extra padding beyond trackLength/2 before flipping (defaults to 12)
  wrapBuffer?: number;
  children: ReactNode;
}

// Positions its children on the circular track using hysteresis.
// Instead of snapping to the nearest copy every frame (which pops
// at the midpoint), this tracks the current position and only wraps
// when the section is far enough past the halfway point to be fully
// off-screen.
export function CircularSlot({ baseX, wrapBuffer = DEFAULT_WRAP_BUFFER, children }: CircularSlotProps) {
  const groupRef = useRef<Group>(null);
  const playerRef = usePlayerRef();
  const { trackLength } = useCircularScene();

  useFrame(() => {
    const group = groupRef.current;
    const player = playerRef.current;
    if (!group || !player) return;

    const distance = group.position.x - player.position.x;
    const threshold = trackLength / 2 + wrapBuffer;

    if (distance > threshold) {
      group.position.x -= trackLength;
    } else if (distance < -threshold) {
      group.position.x += trackLength;
    }
  });

  // initial position set to baseX so the first render is correct
  return (
    <group ref={groupRef} position={[baseX, 0, 0]}>
      {children}
    </group>
  );
}
