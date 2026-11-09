'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, LineSegments, Mesh, Object3D } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { easeInOutCubic } from '../../math';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import {
  BoxFaceIndex,
  CHEST_BODY_ROWS,
  CHEST_BODY_SIDE_ORIGIN,
  CHEST_FACE_ORIGIN,
  CHEST_LID_ROWS,
  CHEST_LID_SIDE_ORIGIN,
  CHEST_WIDTH_TEXELS,
  PROP_TEXEL,
  PropTextureKey,
  createTexelBox,
  getPropTexture,
} from '../propTextures';
import type { BoxFaceOrigins, TexelOrigin } from '../propTextures';

const INK_SEED = 97;

// latch size in texels, the chest's own size comes from its textures
const LATCH_WIDTH = 2;
const LATCH_HEIGHT = 4;
const LATCH_DEPTH = 1;

const HALF_DEPTH = (CHEST_WIDTH_TEXELS / 2) * PROP_TEXEL;
const BODY_POSITION: [number, number, number] = [0, (CHEST_BODY_ROWS / 2) * PROP_TEXEL, 0];
// the lid pivots about its back bottom edge, which is the hinge on top of the body
const HINGE_POSITION: [number, number, number] = [0, CHEST_BODY_ROWS * PROP_TEXEL, -HALF_DEPTH];
const LID_POSITION: [number, number, number] = [0, (CHEST_LID_ROWS / 2) * PROP_TEXEL, HALF_DEPTH];
// latch hangs off the lid front, centred on the seam between lid and body
const LATCH_POSITION: [number, number, number] = [0, 0, CHEST_WIDTH_TEXELS * PROP_TEXEL + (LATCH_DEPTH / 2) * PROP_TEXEL];

// negative so the front edge swings up and back towards -z
const LID_OPEN_ANGLE = -(80 * Math.PI) / 180;
const LID_SWING_SECONDS = 0.25;

const SIDE_FACES = [BoxFaceIndex.PlusX, BoxFaceIndex.MinusX, BoxFaceIndex.PlusZ, BoxFaceIndex.MinusZ] as const;
const CAP_FACES = [BoxFaceIndex.PlusY, BoxFaceIndex.MinusY] as const;

function chestFaceOrigins(sideOrigin: TexelOrigin): BoxFaceOrigins {
  const origins: BoxFaceOrigins = {};
  for (const face of SIDE_FACES) origins[face] = sideOrigin;
  for (const face of CAP_FACES) origins[face] = CHEST_FACE_ORIGIN;
  return origins;
}

// kept at module level so the ink edges effect doesn't rebuild every render
const hasInk = (mesh: Mesh) => !mesh.userData.noInk;
const skipRaycast: Object3D['raycast'] = () => {};

export type ChestProps = ThreeElements['group'] & {
  // the lid swings open or shut whenever this flips
  open: boolean;
};

// wooden chest, latch on the front (+z). pointer handlers on the group fire anywhere on the chest
export const Chest = forwardRef<Group, ChestProps>(function Chest({ open, ...props }, ref) {
  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  // 0 is shut, 1 is fully open, starts settled at whatever open is on mount
  const swingRef = useRef(open ? 1 : 0);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'Chest' });

  const geometries = useMemo(
    () => ({
      body: createTexelBox(CHEST_WIDTH_TEXELS, CHEST_BODY_ROWS, CHEST_WIDTH_TEXELS, chestFaceOrigins(CHEST_BODY_SIDE_ORIGIN)),
      lid: createTexelBox(CHEST_WIDTH_TEXELS, CHEST_LID_ROWS, CHEST_WIDTH_TEXELS, chestFaceOrigins(CHEST_LID_SIDE_ORIGIN)),
      latch: createTexelBox(LATCH_WIDTH, LATCH_HEIGHT, LATCH_DEPTH),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometries.body.dispose();
      geometries.lid.dispose();
      geometries.latch.dispose();
    },
    [geometries],
  );

  const { materials, bodyMaterials, lidMaterials, latch } = useMemo(() => {
    const side = createPixelMaterial(getPropTexture(PropTextureKey.ChestSide));
    const top = createPixelMaterial(getPropTexture(PropTextureKey.ChestTop));
    const inside = createPixelMaterial(getPropTexture(PropTextureKey.ChestInside));
    const latchMaterial = createPixelMaterial(getPropTexture(PropTextureKey.ChestLatch));
    return {
      materials: [side, top, inside, latchMaterial],
      // +x, -x, +y, -y, +z, -z. the body's top and the lid's underside show the hollow inside
      bodyMaterials: [side, side, inside, top, side, side],
      lidMaterials: [side, side, top, inside, side, side],
      latch: latchMaterial,
    };
  }, []);
  usePixelMaterials(materials, connectMaterial);

  // the ink lines are children of the meshes and three raycasts lines with a whole world unit
  // of slack, which would make pointer handlers fire well outside the chest. child effects run
  // first, so the lines are already attached here
  useEffect(() => {
    meshesRef.current?.traverse((child) => {
      if ((child as LineSegments).isLineSegments) child.raycast = skipRaycast;
    });
  }, []);

  useFrame((_, delta) => {
    const lid = lidRef.current;
    if (!lid) return;
    const target = open ? 1 : 0;
    const step = delta / LID_SWING_SECONDS;
    const swing = swingRef.current;
    swingRef.current = target > swing ? Math.min(swing + step, target) : Math.max(swing - step, target);
    lid.rotation.x = LID_OPEN_ANGLE * easeInOutCubic(swingRef.current);
  });

  useImperativeHandle(ref, () => groupRef.current!);

  return (
    <group ref={groupRef} {...props}>
      <group ref={meshesRef}>
        <mesh geometry={geometries.body} material={bodyMaterials} position={BODY_POSITION} castShadow />
        <group ref={lidRef} position={HINGE_POSITION}>
          <mesh geometry={geometries.lid} material={lidMaterials} position={LID_POSITION} castShadow />
          <mesh geometry={geometries.latch} material={latch} position={LATCH_POSITION} castShadow />
        </group>
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
