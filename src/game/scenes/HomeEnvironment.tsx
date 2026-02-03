'use client';

import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { AlleyGround, Pedestal } from '../entities';

export function HomeEnvironment() {
  const pedestalRef = useRef<Group>(null);

  // Slow rotation on the pedestal to demonstrate ink gaps are object-anchored
  useFrame((_, delta) => {
    if (pedestalRef.current) {
      pedestalRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group>
      <AlleyGround />

      {/* Pedestal - origin at bottom, sits flush on ground */}
      <Pedestal ref={pedestalRef} position={[4, 0, -2]} />
    </group>
  );
}
