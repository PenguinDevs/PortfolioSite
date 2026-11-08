'use client';

import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { BLOCK_SIZE } from '../constants';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { getPlantTexture, PlantTexture } from '../plantTextures';
import { NO_INK_USER_DATA, STANDING_CROSS_GEOMETRY } from './plantGeometry';

export type GrassTuftProps = ThreeElements['group'] & {
  // two blocks tall instead of a short tuft
  tall?: boolean;
};

// grass sprite, origin at the bottom centre of its cell. all sprite, so no ink outline
export function GrassTuft({ tall = false, ...props }: GrassTuftProps) {
  const groupRef = useRef<Group>(null);
  const { connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'GrassTuft' });

  const materials = useMemo(() => {
    const textures = tall ? [PlantTexture.TallGrassLower, PlantTexture.TallGrassUpper] : [PlantTexture.ShortGrass];
    return textures.map((key) => createPixelMaterial(getPlantTexture(key), { cutOut: true }));
  }, [tall]);
  usePixelMaterials(materials, connectMaterial);

  return (
    <group {...props} ref={groupRef}>
      {materials.map((material, i) => (
        <mesh
          key={i}
          geometry={STANDING_CROSS_GEOMETRY}
          material={material}
          position-y={i * BLOCK_SIZE}
          userData={NO_INK_USER_DATA}
        />
      ))}
    </group>
  );
}
