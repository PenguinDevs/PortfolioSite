'use client';

import { useMemo, useRef } from 'react';
import { DoubleSide } from 'three';
import type { Group, Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { Pedestal } from '../entities';
import { createToonMaterial } from '../shaders/toonShader';
import { InkEdges } from '../shaders/inkEdges';

const GROUND_SIZE = 40;

export function HomeEnvironment() {
  const groundRef = useRef<Mesh>(null);
  const pedestalRef = useRef<Group>(null);

  const groundMaterial = useMemo(
    () =>
      createToonMaterial({
        color: '#ffffef',
        shadowColor: '#ffffef',
        side: DoubleSide,
      }),
    [],
  );

  // Slow rotation on the pedestal to demonstrate ink gaps are object-anchored
  useFrame((_, delta) => {
    if (pedestalRef.current) {
      pedestalRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group>
      {/* Ground plane */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={groundMaterial}>
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      </mesh>
      <InkEdges
        target={groundRef}
        seed={99}
        width={3}
        gapFreq={6}
        gapThreshold={0.3}
        thresholdAngle={1}
      />

      {/* Pedestal - origin at bottom, sits flush on ground */}
      <Pedestal ref={pedestalRef} position={[4, 0, -2]} />
    </group>
  );
}
