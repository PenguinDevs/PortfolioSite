'use client';

import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { getPlantTexture, PlantTexture } from '../plantTextures';
import { NO_INK_USER_DATA, STANDING_CROSS_GEOMETRY } from './plantGeometry';

// two little leaves on stems, origin at the bottom centre of its cell. all sprite, so no ink outline
export function SmallDripleaf(props: ThreeElements['group']) {
  const groupRef = useRef<Group>(null);
  const { connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'SmallDripleaf' });

  const materials = useMemo(
    () => [createPixelMaterial(getPlantTexture(PlantTexture.SmallDripleaf), { cutOut: true })],
    [],
  );
  usePixelMaterials(materials, connectMaterial);

  return (
    <group {...props} ref={groupRef}>
      <mesh geometry={STANDING_CROSS_GEOMETRY} material={materials[0]} userData={NO_INK_USER_DATA} />
    </group>
  );
}
