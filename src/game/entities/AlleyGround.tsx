'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useModel } from '../models';
import { createToonMaterial } from '../shaders/toonShader';
import { useThemedToonMaterial, useEntityReveal } from '../hooks';
import { InkEdgesGroup } from '../shaders/inkEdges';
import { GROUND_COLOUR, GROUND_SHADOW, INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';

const TILE_SCALE = 12;
const TILE_WIDTH = 1; // alley.glb is 1m wide in Blender

type AlleyGroundProps = ThreeElements['group'] & {
  /** First tile index (inclusive). Tiles along the X axis. */
  startTile?: number;
  /** Last tile index (inclusive). */
  endTile?: number;
};

export const AlleyGround = forwardRef<Group, AlleyGroundProps>(function AlleyGround(
  { startTile = -6, endTile = 6, ...props },
  ref,
) {
  const localRef = useRef<Group>(null);
  const { scene } = useModel('alley');

  useImperativeHandle(ref, () => localRef.current!);

  const material = useMemo(
    () => createToonMaterial({
      color: GROUND_COLOUR[LightingMode.Light],
      shadowColor: GROUND_SHADOW[LightingMode.Light],
    }),
    [],
  );

  useThemedToonMaterial(material, GROUND_COLOUR, GROUND_SHADOW);

  const { drawProgress, connectMaterial } = useEntityReveal(localRef);

  useEffect(() => {
    connectMaterial(material);
  }, [material, connectMaterial]);

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
        <group key={key} position={[key * TILE_WIDTH * TILE_SCALE, 0, 0]} rotation={[0, Math.PI, 0]}>
          <primitive object={clone} scale={TILE_SCALE}  />
        </group>
      ))}
      <InkEdgesGroup
        target={localRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={77}
        width={3}
        gapFreq={20}
        gapThreshold={0.6}
        thresholdAngle={89}
        creaseOffset={0.005}
        drawProgress={drawProgress}
      />
    </group>
  );
});
