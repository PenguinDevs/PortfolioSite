'use client';

import { useMemo, useRef } from 'react';
import { BoxGeometry } from 'three';
import type { Group } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { BLOCK_SIZE } from '../constants';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { getPlantTexture, PlantTexture } from '../plantTextures';
import {
  BOX_SIDE_FACES,
  inkSolidMeshesOnly,
  NO_INK_USER_DATA,
  remapBoxFaceUvs,
  STANDING_CROSS_GEOMETRY,
  TEXEL,
} from './plantGeometry';

const INK_SEED = 71;
const INK_WIDTH = 2;

// the leafy canopy fills the top half of the block, the woody stems show underneath it
const LEAF_CUBE_HEIGHT = 8 * TEXEL;
const LEAF_CUBE_CENTRE_Y = BLOCK_SIZE - LEAF_CUBE_HEIGHT / 2;

const LEAF_CUBE_GEOMETRY = (() => {
  const geometry = new BoxGeometry(BLOCK_SIZE, LEAF_CUBE_HEIGHT, BLOCK_SIZE);
  // the sides are half a block tall, so they show the top half of the texture to keep texels square
  const sideVMin = 1 - LEAF_CUBE_HEIGHT / BLOCK_SIZE;
  for (const face of BOX_SIDE_FACES) remapBoxFaceUvs(geometry, face, 1, sideVMin, 1);
  return geometry;
})();

export type AzaleaBushProps = ThreeElements['group'] & {
  // flowering azalea has pink blossoms dotted through its leaves
  flowering?: boolean;
};

// one block bush, origin at the bottom centre of its cell
export function AzaleaBush({ flowering = false, ...props }: AzaleaBushProps) {
  const groupRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'AzaleaBush' });

  const materials = useMemo(() => {
    const leaves = flowering ? PlantTexture.FloweringAzaleaLeaves : PlantTexture.AzaleaLeaves;
    return [
      createPixelMaterial(getPlantTexture(leaves), { cutOut: true }),
      createPixelMaterial(getPlantTexture(PlantTexture.AzaleaStem), { cutOut: true }),
    ];
  }, [flowering]);
  usePixelMaterials(materials, connectMaterial);
  const [leafMaterial, stemMaterial] = materials;

  return (
    <group {...props} ref={groupRef}>
      <mesh geometry={LEAF_CUBE_GEOMETRY} material={leafMaterial} position-y={LEAF_CUBE_CENTRE_Y} />
      <mesh geometry={STANDING_CROSS_GEOMETRY} material={stemMaterial} userData={NO_INK_USER_DATA} />

      <InkEdgesGroup
        target={groupRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={INK_SEED}
        width={INK_WIDTH}
        drawProgress={drawProgress}
        filter={inkSolidMeshesOnly}
      />
    </group>
  );
}
