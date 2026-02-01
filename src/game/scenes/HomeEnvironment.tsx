'use client';

import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { Pedestal } from '../entities';
import { createToonMaterial } from '../shaders/toonShader';

const GROUND_SIZE = 40;

export function HomeEnvironment() {
  const groundMaterial = useMemo(
    () =>
      createToonMaterial({
        color: '#b8d4a3',
        shadowColor: '#7a9a60',
        side: DoubleSide,
      }),
    [],
  );

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={groundMaterial}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      </mesh>

      {/* Pedestal - origin at bottom, sits flush on ground */}
      <Pedestal position={[4, 0, -2]} />
    </group>
  );
}
