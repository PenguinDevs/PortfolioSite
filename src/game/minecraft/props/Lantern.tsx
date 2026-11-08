'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import {
  CHAIN_PATTERN_ROWS,
  PROP_TEXEL,
  PropTextureKey,
  createTexelBox,
  createTexelPlane,
  flickerBrightness,
  flickerFrame,
  getPropTexture,
} from '../propTextures';

const INK_SEED = 113;

// sizes in texels
const CAGE_WIDTH = 6;
const CAGE_HEIGHT = 7;
const CORE_WIDTH = 4;
const CORE_HEIGHT = 5;
const CAP_WIDTH = 4;
const CAP_HEIGHT = 2;
const HANDLE_POST_HEIGHT = 2;
const HANDLE_WIDTH = 4;
const HANDLE_THICKNESS = 1;
const LANTERN_HEIGHT = CAGE_HEIGHT + CAP_HEIGHT + HANDLE_POST_HEIGHT + HANDLE_THICKNESS;
const CHAIN_WIDTH = 3;
const CHAIN_LENGTH = CHAIN_PATTERN_ROWS;

const CAGE_POSITION: [number, number, number] = [0, (CAGE_HEIGHT / 2) * PROP_TEXEL, 0];
const CAP_POSITION: [number, number, number] = [0, (CAGE_HEIGHT + CAP_HEIGHT / 2) * PROP_TEXEL, 0];
const HANDLE_POST_Y = (CAGE_HEIGHT + CAP_HEIGHT + HANDLE_POST_HEIGHT / 2) * PROP_TEXEL;
const HANDLE_POST_X = ((HANDLE_WIDTH - HANDLE_THICKNESS) / 2) * PROP_TEXEL;
const HANDLE_LEFT_POSITION: [number, number, number] = [-HANDLE_POST_X, HANDLE_POST_Y, 0];
const HANDLE_RIGHT_POSITION: [number, number, number] = [HANDLE_POST_X, HANDLE_POST_Y, 0];
const HANDLE_BAR_POSITION: [number, number, number] = [0, (LANTERN_HEIGHT - HANDLE_THICKNESS / 2) * PROP_TEXEL, 0];
const CHAIN_POSITION: [number, number, number] = [0, (LANTERN_HEIGHT + CHAIN_LENGTH / 2) * PROP_TEXEL, 0];
// the two chain planes cross like a plant sprite, offset by half a link so one shows a
// face-on link where the other shows a side-on one
const CHAIN_ROTATION_A: [number, number, number] = [0, Math.PI / 4, 0];
const CHAIN_ROTATION_B: [number, number, number] = [0, -Math.PI / 4, 0];
const CHAIN_B_ORIGIN = { x: 0, y: CHAIN_PATTERN_ROWS / 2 };

const STANDING_OFFSET: [number, number, number] = [0, 0, 0];
// hanging lanterns put their origin at the top of the chain
const HANGING_OFFSET: [number, number, number] = [0, -(LANTERN_HEIGHT + CHAIN_LENGTH) * PROP_TEXEL, 0];

// lanterns flicker more gently than open flames
const CORE_FRAME_RATE = 4;
const NO_INK = { noInk: true };

// kept at module level so the ink edges effect doesn't rebuild every render
const hasInk = (mesh: Mesh) => !mesh.userData.noInk;

export type LanternProps = ThreeElements['group'] & {
  // hang from a short chain with the origin at the attachment point instead of standing on the floor
  hanging?: boolean;
};

// small metal lantern with a glowing core showing through its windows
export const Lantern = forwardRef<Group, LanternProps>(function Lantern({ hanging = false, ...props }, ref) {
  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'Lantern' });

  const geometries = useMemo(
    () => ({
      cage: createTexelBox(CAGE_WIDTH, CAGE_HEIGHT, CAGE_WIDTH),
      core: createTexelBox(CORE_WIDTH, CORE_HEIGHT, CORE_WIDTH),
      cap: createTexelBox(CAP_WIDTH, CAP_HEIGHT, CAP_WIDTH),
      handlePost: createTexelBox(HANDLE_THICKNESS, HANDLE_POST_HEIGHT, HANDLE_THICKNESS),
      handleBar: createTexelBox(HANDLE_WIDTH, HANDLE_THICKNESS, HANDLE_THICKNESS),
      chainA: createTexelPlane(CHAIN_WIDTH, CHAIN_LENGTH),
      chainB: createTexelPlane(CHAIN_WIDTH, CHAIN_LENGTH, CHAIN_B_ORIGIN),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const geometry of Object.values(geometries)) geometry.dispose();
    },
    [geometries],
  );

  const { materials, cageMaterials, metal, core, coreFrames, chain } = useMemo(() => {
    const side = createPixelMaterial(getPropTexture(PropTextureKey.LanternSide), { cutOut: true });
    const metalMaterial = createPixelMaterial(getPropTexture(PropTextureKey.LanternMetal));
    const frames = [getPropTexture(PropTextureKey.LanternCoreA), getPropTexture(PropTextureKey.LanternCoreB)];
    const coreMaterial = createPixelMaterial(frames[0], { glow: true });
    const chainMaterial = createPixelMaterial(getPropTexture(PropTextureKey.LanternChain), { cutOut: true });
    return {
      materials: [side, metalMaterial, coreMaterial, chainMaterial],
      // +x, -x, +y, -y, +z, -z
      cageMaterials: [side, side, metalMaterial, metalMaterial, side, side],
      metal: metalMaterial,
      core: coreMaterial,
      coreFrames: frames,
      chain: chainMaterial,
    };
  }, []);
  usePixelMaterials(materials, connectMaterial);

  // random phase so neighbouring lanterns don't flicker in sync
  const phase = useMemo(() => Math.random() * 10, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    core.uniforms.uMap.value = coreFrames[flickerFrame(time, phase, CORE_FRAME_RATE)];
    (core.uniforms.uMapTint.value as Vector3).setScalar(flickerBrightness(time, phase));
  });

  useImperativeHandle(ref, () => groupRef.current!);

  return (
    <group ref={groupRef} {...props}>
      <group ref={meshesRef} position={hanging ? HANGING_OFFSET : STANDING_OFFSET}>
        <mesh geometry={geometries.cage} material={cageMaterials} position={CAGE_POSITION} castShadow />
        <mesh geometry={geometries.cap} material={metal} position={CAP_POSITION} castShadow />
        <mesh geometry={geometries.core} material={core} position={CAGE_POSITION} userData={NO_INK} />
        <mesh geometry={geometries.handlePost} material={metal} position={HANDLE_LEFT_POSITION} userData={NO_INK} />
        <mesh geometry={geometries.handlePost} material={metal} position={HANDLE_RIGHT_POSITION} userData={NO_INK} />
        <mesh geometry={geometries.handleBar} material={metal} position={HANDLE_BAR_POSITION} userData={NO_INK} />
        <mesh
          geometry={geometries.chainA}
          material={chain}
          position={CHAIN_POSITION}
          rotation={CHAIN_ROTATION_A}
          visible={hanging}
          userData={NO_INK}
        />
        <mesh
          geometry={geometries.chainB}
          material={chain}
          position={CHAIN_POSITION}
          rotation={CHAIN_ROTATION_B}
          visible={hanging}
          userData={NO_INK}
        />
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
