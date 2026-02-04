'use client';

import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { AlleyGround, LightSwitch, NameTitle, Pedestal, Sign } from '../entities';

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
      <NameTitle position={[0, 8, -4]} />

      <AlleyGround />

      <Pedestal ref={pedestalRef} position={[36, 0, -2]} />

      <Sign position={[2.5, 0, -4]} rotation={[0, 0, 0]} rows={['', '--->', '', '']} />


      <Sign position={[24, 0, -4]} rotation={[0, 0, 0]} rows={['Only if it', 'really hurts', '|', '∀']} />
      <LightSwitch position={[24, 0, -2]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
}
