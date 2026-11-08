'use client';

import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { getPlantTexture, PlantTexture } from '../plantTextures';
import { HANGING_CROSS_GEOMETRY, NO_INK_USER_DATA } from './plantGeometry';

// pale azalea roots, origin at the top centre of the cell they hang down through. all sprite, so no ink outline
export function HangingRoots(props: ThreeElements['group']) {
  const groupRef = useRef<Group>(null);
  const { connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'HangingRoots' });

  const materials = useMemo(
    () => [createPixelMaterial(getPlantTexture(PlantTexture.HangingRoots), { cutOut: true })],
    [],
  );
  usePixelMaterials(materials, connectMaterial);

  return (
    <group {...props} ref={groupRef}>
      <mesh geometry={HANGING_CROSS_GEOMETRY} material={materials[0]} userData={NO_INK_USER_DATA} />
    </group>
  );
}
