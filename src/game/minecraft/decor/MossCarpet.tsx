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
import { BoxGeometryFace, inkSolidMeshesOnly, remapBoxFaceUvs, TEXEL } from './plantGeometry';

const INK_SEED = 72;
const INK_WIDTH = 2;

const CARPET_THICKNESS = TEXEL;
// the carpet's edges show a one texel strip off the top of the moss texture
const SIDE_V_MIN = 1 - CARPET_THICKNESS / BLOCK_SIZE;

// one box for the whole patch, the moss texture wraps so every block gets 16 x 16 texels
function createCarpetGeometry(width: number, depth: number): BoxGeometry {
  const geometry = new BoxGeometry(width * BLOCK_SIZE, CARPET_THICKNESS, depth * BLOCK_SIZE);
  remapBoxFaceUvs(geometry, BoxGeometryFace.PosY, width, 0, depth);
  remapBoxFaceUvs(geometry, BoxGeometryFace.NegY, width, 0, depth);
  remapBoxFaceUvs(geometry, BoxGeometryFace.PosX, depth, SIDE_V_MIN, 1);
  remapBoxFaceUvs(geometry, BoxGeometryFace.NegX, depth, SIDE_V_MIN, 1);
  remapBoxFaceUvs(geometry, BoxGeometryFace.PosZ, width, SIDE_V_MIN, 1);
  remapBoxFaceUvs(geometry, BoxGeometryFace.NegZ, width, SIDE_V_MIN, 1);
  // shift so the origin cell sits at the -x -z corner of the patch
  geometry.translate(((width - 1) * BLOCK_SIZE) / 2, CARPET_THICKNESS / 2, ((depth - 1) * BLOCK_SIZE) / 2);
  return geometry;
}

export type MossCarpetProps = ThreeElements['group'] & {
  // blocks covered along +x, counting the origin cell
  width?: number;
  // blocks covered along +z, counting the origin cell
  depth?: number;
};

// a one texel thick layer of moss. the origin is the bottom centre of the first cell, so the patch
// covers x from -0.5 to width - 0.5, z from -0.5 to depth - 0.5 and y from 0 to 1/16 (in blocks)
export function MossCarpet({ width = 1, depth = 1, ...props }: MossCarpetProps) {
  const groupRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'MossCarpet' });

  const materials = useMemo(() => [createPixelMaterial(getPlantTexture(PlantTexture.MossCarpet))], []);
  usePixelMaterials(materials, connectMaterial);

  const geometry = useMemo(() => createCarpetGeometry(width, depth), [width, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group {...props} ref={groupRef}>
      <mesh geometry={geometry} material={materials[0]} />

      {/* keyed on the size so the outline is rebuilt when the patch changes shape */}
      <InkEdgesGroup
        key={`${width}x${depth}`}
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
