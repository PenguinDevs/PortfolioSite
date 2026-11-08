'use client';

import { useEffect, useMemo, useRef } from 'react';
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
  createCrossedQuadGeometry,
  inkSolidMeshesOnly,
  NO_INK_USER_DATA,
  remapBoxFaceUvs,
  TEXEL,
} from './plantGeometry';

const INK_SEED = 73;
const INK_WIDTH = 2;

const LEAF_SIZE = 15 * TEXEL;
const LEAF_THICKNESS = TEXEL;

const LEAF_GEOMETRY = (() => {
  const geometry = new BoxGeometry(LEAF_SIZE, LEAF_THICKNESS, LEAF_SIZE);
  // the thin edges show the darker rim along the top row of the leaf texture
  const sideVMin = 1 - LEAF_THICKNESS / BLOCK_SIZE;
  for (const face of BOX_SIDE_FACES) remapBoxFaceUvs(geometry, face, 1, sideVMin, 1);
  return geometry;
})();

export type BigDripleafProps = ThreeElements['group'] & {
  // blocks of stem under the leaf
  stemHeight?: number;
};

// tall stem with a flat leaf platform, origin at the bottom centre of its cell.
// the leaf spans y from stemHeight to stemHeight + 1/16 (in blocks)
export function BigDripleaf({ stemHeight = 1, ...props }: BigDripleafProps) {
  const groupRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'BigDripleaf' });

  const materials = useMemo(
    () => [
      createPixelMaterial(getPlantTexture(PlantTexture.BigDripleafTop)),
      createPixelMaterial(getPlantTexture(PlantTexture.BigDripleafStem), { cutOut: true }),
    ],
    [],
  );
  usePixelMaterials(materials, connectMaterial);
  const [leafMaterial, stemMaterial] = materials;

  // the stem texture wraps, so it repeats once per block however tall the stem is
  const stemGeometry = useMemo(
    () => createCrossedQuadGeometry(stemHeight * BLOCK_SIZE, 0, stemHeight),
    [stemHeight],
  );
  useEffect(() => () => stemGeometry.dispose(), [stemGeometry]);

  return (
    <group {...props} ref={groupRef}>
      <mesh
        geometry={LEAF_GEOMETRY}
        material={leafMaterial}
        position-y={stemHeight * BLOCK_SIZE + LEAF_THICKNESS / 2}
      />
      <mesh geometry={stemGeometry} material={stemMaterial} userData={NO_INK_USER_DATA} />

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
