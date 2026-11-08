'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh, ShaderMaterial } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { Outline, TableMaterial, buildCraftingTableParts } from './craftingTableModel';
import { CraftingTableTextureKey, getCraftingTableTexture } from './craftingTableTextures';

const INK_SEED = 71;

const MATERIAL_TEXTURES: Readonly<Record<TableMaterial, CraftingTableTextureKey>> = {
  [TableMaterial.Planks]: CraftingTableTextureKey.Planks,
  [TableMaterial.DarkWood]: CraftingTableTextureKey.DarkWood,
  [TableMaterial.Leather]: CraftingTableTextureKey.Leather,
  [TableMaterial.Metal]: CraftingTableTextureKey.Metal,
};

// kept at module level so the ink edges effect doesn't rebuild every render
const hasInk = (mesh: Mesh) => !mesh.userData.noInk;

export type CraftingTableProps = ThreeElements['group'];

// full crafting table block modelled in relief: dark corner posts and trim, a leather mat
// draping over the edges with a raised grid on top, saw and hammer on the front (+z),
// chisel and spanner on the +x side and pliers on the -x side
export const CraftingTable = forwardRef<Group, CraftingTableProps>(function CraftingTable(props, ref) {
  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'CraftingTable' });

  const parts = useMemo(buildCraftingTableParts, []);
  useEffect(
    () => () => {
      for (const part of parts) part.geometry.dispose();
    },
    [parts],
  );

  const { materials, materialFor } = useMemo(() => {
    const byMaterial = {} as Record<TableMaterial, ShaderMaterial>;
    for (const material of Object.values(TableMaterial)) {
      byMaterial[material] = createPixelMaterial(getCraftingTableTexture(MATERIAL_TEXTURES[material]));
    }
    return { materials: Object.values(byMaterial), materialFor: byMaterial };
  }, []);
  usePixelMaterials(materials, connectMaterial);

  const meshes = useMemo(
    () =>
      parts.map((part) => ({
        key: `${part.material}:${part.outline}`,
        geometry: part.geometry,
        material: materialFor[part.material],
        userData: { noInk: part.outline === Outline.Plain },
      })),
    [parts, materialFor],
  );

  useImperativeHandle(ref, () => groupRef.current!);

  return (
    <group ref={groupRef} {...props}>
      <group ref={meshesRef}>
        {meshes.map(({ key, geometry, material, userData }) => (
          <mesh key={key} geometry={geometry} material={material} userData={userData} castShadow />
        ))}
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
