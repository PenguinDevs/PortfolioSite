'use client';

import { forwardRef } from 'react';
import type { Group } from 'three';

export const Player = forwardRef<Group>(function Player(_, ref) {
  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
    </group>
  );
});
