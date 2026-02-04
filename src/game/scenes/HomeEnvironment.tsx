'use client';

import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { AlleyGround, LightSwitch, Pedestal, Sign } from '../entities';

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

      <Pedestal ref={pedestalRef} position={[4, 0, -2]} />

      <Sign position={[2, 0, -4]} rotation={[0, 0, 0]} rows={['Only if it', 'really hurts', '|', '∀']} />
      <LightSwitch position={[2, 0, -2]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}
