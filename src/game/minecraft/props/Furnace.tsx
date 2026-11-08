'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { BLOCK_SIZE, PIXEL_TEXTURE_SIZE } from '../constants';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import {
  PropTextureKey,
  createTexelBox,
  createTexelPlane,
  flickerBrightness,
  flickerFrame,
  getPropTexture,
} from '../propTextures';

const INK_SEED = 83;
const BLOCK_POSITION: [number, number, number] = [0, BLOCK_SIZE / 2, 0];
// the fire overlay floats just in front of the front face to avoid z fighting
const FIRE_OVERLAY_GAP = 0.002;
const FIRE_POSITION: [number, number, number] = [0, BLOCK_SIZE / 2, BLOCK_SIZE / 2 + FIRE_OVERLAY_GAP];
// how many times a second the flames may swap frames
const FIRE_FRAME_RATE = 7;
const NO_INK = { noInk: true };

// kept at module level so the ink edges effect doesn't rebuild every render
const hasInk = (mesh: Mesh) => !mesh.userData.noInk;

export type FurnaceProps = ThreeElements['group'] & {
  // shows a flickering fire in the opening
  lit?: boolean;
};

// cobblestone furnace block with a smooth stone top, the fire opening faces +z
export const Furnace = forwardRef<Group, FurnaceProps>(function Furnace({ lit = true, ...props }, ref) {
  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'Furnace' });

  const geometries = useMemo(
    () => ({
      block: createTexelBox(PIXEL_TEXTURE_SIZE, PIXEL_TEXTURE_SIZE, PIXEL_TEXTURE_SIZE),
      fire: createTexelPlane(PIXEL_TEXTURE_SIZE, PIXEL_TEXTURE_SIZE),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometries.block.dispose();
      geometries.fire.dispose();
    },
    [geometries],
  );

  const { materials, faceMaterials, fire, fireFrames } = useMemo(() => {
    const cobble = createPixelMaterial(getPropTexture(PropTextureKey.Cobble));
    const top = createPixelMaterial(getPropTexture(PropTextureKey.FurnaceTop));
    const front = createPixelMaterial(getPropTexture(PropTextureKey.FurnaceFront));
    const frames = [getPropTexture(PropTextureKey.FurnaceFireA), getPropTexture(PropTextureKey.FurnaceFireB)];
    const fireMaterial = createPixelMaterial(frames[0], { cutOut: true, glow: true });
    return {
      materials: [cobble, top, front, fireMaterial],
      // +x, -x, +y, -y, +z, -z
      faceMaterials: [cobble, cobble, top, top, front, cobble],
      fire: fireMaterial,
      fireFrames: frames,
    };
  }, []);
  usePixelMaterials(materials, connectMaterial);

  // random phase so neighbouring furnaces don't flicker in sync
  const phase = useMemo(() => Math.random() * 10, []);

  useFrame(({ clock }) => {
    if (!lit) return;
    const time = clock.elapsedTime;
    fire.uniforms.uMap.value = fireFrames[flickerFrame(time, phase, FIRE_FRAME_RATE)];
    (fire.uniforms.uMapTint.value as Vector3).setScalar(flickerBrightness(time, phase));
  });

  useImperativeHandle(ref, () => groupRef.current!);

  return (
    <group ref={groupRef} {...props}>
      <group ref={meshesRef}>
        <mesh geometry={geometries.block} material={faceMaterials} position={BLOCK_POSITION} castShadow />
        <mesh geometry={geometries.fire} material={fire} position={FIRE_POSITION} visible={lit} userData={NO_INK} />
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
