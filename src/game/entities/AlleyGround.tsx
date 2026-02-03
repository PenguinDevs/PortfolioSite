'use client';

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useModel } from '../models';
import { createToonMaterial } from '../shaders/toonShader';
import { InkEdgesGroup } from '../shaders/inkEdges';

const TILE_WIDTH = 1; // alley.glb is 1m wide in Blender

interface AlleyGroundProps extends ThreeElements['group'] {
  /** First tile index (inclusive). Tiles along the X axis. */
  startTile?: number;
  /** Last tile index (inclusive). */
  endTile?: number;
}

export const AlleyGround = forwardRef<Group, AlleyGroundProps>(function AlleyGround(
  { startTile = -20, endTile = 20, ...props },
  ref,
) {
  const localRef = useRef<Group>(null);
  const { scene } = useModel('alley');

  useImperativeHandle(ref, () => localRef.current!);

  const material = useMemo(
    () => createToonMaterial({ color: '#d4cfc8', shadowColor: '#8a8078' }),
    [],
  );

  const tiles = useMemo(() => {
    const result: { key: number; clone: Group }[] = [];
    for (let i = startTile; i <= endTile; i++) {
      const clone = scene.clone(true);
      clone.traverse((child) => {
        if ((child as Mesh).isMesh) {
          (child as Mesh).material = material;
        }
      });
      result.push({ key: i, clone });
    }
    return result;
  }, [scene, material, startTile, endTile]);

  return (
    <group ref={localRef} {...props}>
      {tiles.map(({ key, clone }) => (
        <group key={key} position={[key * TILE_WIDTH, 0, 0]}>
          <primitive object={clone} />
        </group>
      ))}
      <InkEdgesGroup
        target={localRef}
        seed={77}
        width={3}
        gapFreq={6}
        gapThreshold={0.3}
      />
    </group>
  );
});
