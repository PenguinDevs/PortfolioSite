'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { usePlayerRef } from '../../contexts';
import { useCircularScene, resolveWrappedX } from './CircularSceneContext';

interface CircularSlotProps {
  // the section's home X position on the track (should be in [0, trackLength))
  baseX: number;
  children: ReactNode;
}

// Positions its children at whichever copy of baseX is closest to
// the player on the circular track. Sections placed inside a
// CircularSlot will seamlessly wrap around as the player walks.
export function CircularSlot({ baseX, children }: CircularSlotProps) {
  const groupRef = useRef<Group>(null);
  const playerRef = usePlayerRef();
  const { trackLength } = useCircularScene();

  useFrame(() => {
    const group = groupRef.current;
    const player = playerRef.current;
    if (!group || !player) return;

    group.position.x = resolveWrappedX(baseX, player.position.x, trackLength);
  });

  // initial position set to baseX so the first render is correct
  return (
    <group ref={groupRef} position={[baseX, 0, 0]}>
      {children}
    </group>
  );
}
