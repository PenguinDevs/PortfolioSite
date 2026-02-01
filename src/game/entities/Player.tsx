'use client';

import { forwardRef, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { InkEdges } from '../shaders/inkEdges';

export const Player = forwardRef<Group>(function Player(_, ref) {
  const meshRef = useRef<Mesh>(null);

  return (
    <group ref={ref}>
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
      <InkEdges target={meshRef} seed={7} width={3} gapThreshold={0.35} />
    </group>
  );
});
