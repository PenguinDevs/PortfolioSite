'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { BLOCK_SIZE, PIXEL_TEXTURE_SIZE } from '../constants';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { PropTextureKey, createTexelBox, getPropTexture } from '../propTextures';

const INK_SEED = 71;
const BLOCK_POSITION: [number, number, number] = [0, BLOCK_SIZE / 2, 0];

// kept at module level so the ink edges effect doesn't rebuild every render
const hasInk = (mesh: Mesh) => !mesh.userData.noInk;

export type CraftingTableProps = ThreeElements['group'];

// full crafting table block, saw on the front (+z), hammer on the +x side
export const CraftingTable = forwardRef<Group, CraftingTableProps>(function CraftingTable(props, ref) {
  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'CraftingTable' });

  const geometry = useMemo(() => createTexelBox(PIXEL_TEXTURE_SIZE, PIXEL_TEXTURE_SIZE, PIXEL_TEXTURE_SIZE), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const { materials, faceMaterials } = useMemo(() => {
    const top = createPixelMaterial(getPropTexture(PropTextureKey.CraftingTableTop));
    const front = createPixelMaterial(getPropTexture(PropTextureKey.CraftingTableFront));
    const toolSide = createPixelMaterial(getPropTexture(PropTextureKey.CraftingTableToolSide));
    const plainSide = createPixelMaterial(getPropTexture(PropTextureKey.OakPlanks));
    return {
      materials: [top, front, toolSide, plainSide],
      // +x, -x, +y, -y, +z, -z
      faceMaterials: [toolSide, plainSide, top, plainSide, front, plainSide],
    };
  }, []);
  usePixelMaterials(materials, connectMaterial);

  useImperativeHandle(ref, () => groupRef.current!);

  return (
    <group ref={groupRef} {...props}>
      <group ref={meshesRef}>
        <mesh geometry={geometry} material={faceMaterials} position={BLOCK_POSITION} castShadow />
      </group>
      <InkEdgesGroup
        target={meshesRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={INK_SEED}
        width={2}
        drawProgress={drawProgress}
        filter={hasInk}
      />
    </group>
  );
});
