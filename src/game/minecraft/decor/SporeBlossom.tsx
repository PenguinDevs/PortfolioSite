'use client';

import { useMemo, useRef } from 'react';
import { PlaneGeometry } from 'three';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { BLOCK_SIZE } from '../constants';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { getPlantTexture, PlantTexture } from '../plantTextures';
import { HANGING_CROSS_GEOMETRY, NO_INK_USER_DATA, TEXEL } from './plantGeometry';

// everything hangs half a texel below the ceiling so the leaves never z fight with the block above
const CEILING_GAP = TEXEL / 2;

// flat ring of leaves lying against the ceiling, the normal points up like the other sprites
const LEAF_RING_GEOMETRY = new PlaneGeometry(BLOCK_SIZE, BLOCK_SIZE).rotateX(-Math.PI / 2);

// ceiling flower, origin at the top centre of the cell it hangs in. all sprite, so no ink outline
export function SporeBlossom(props: ThreeElements['group']) {
  const groupRef = useRef<Group>(null);
  const { connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'SporeBlossom' });

  const materials = useMemo(
    () => [
      createPixelMaterial(getPlantTexture(PlantTexture.SporeBlossomBase), { cutOut: true }),
      createPixelMaterial(getPlantTexture(PlantTexture.SporeBlossomFlower), { cutOut: true }),
    ],
    [],
  );
  usePixelMaterials(materials, connectMaterial);
  const [leafMaterial, flowerMaterial] = materials;

  return (
    <group {...props} ref={groupRef}>
      <mesh geometry={LEAF_RING_GEOMETRY} material={leafMaterial} position-y={-CEILING_GAP} userData={NO_INK_USER_DATA} />
      <mesh geometry={HANGING_CROSS_GEOMETRY} material={flowerMaterial} position-y={-CEILING_GAP} userData={NO_INK_USER_DATA} />
    </group>
  );
}
