'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { Group, Mesh, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { InkEdgesGroup } from '../../shaders';
import { INK_EDGE_COLOUR } from '../../constants';
import { LightingMode } from '../../types';
import { BLOCK_SIZE } from '../constants';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import {
  PROP_TEXEL,
  PropTextureKey,
  createTexelBox,
  createTexelPlane,
  flickerBrightness,
  flickerFrame,
  getPropTexture,
} from '../propTextures';

// the direction a wall torch leans out, i.e. away from the wall it is mounted on
export enum WallFacing {
  PlusX = 'plusX',
  MinusX = 'minusX',
  PlusZ = 'plusZ',
}

const INK_SEED = 127;

// sizes in texels
const STICK_WIDTH = 2;
const STICK_HEIGHT = 8;
const HEAD_HEIGHT = 2;
const FLAME_SIZE = 4;

const STICK_POSITION: [number, number, number] = [0, (STICK_HEIGHT / 2) * PROP_TEXEL, 0];
const HEAD_POSITION: [number, number, number] = [0, (STICK_HEIGHT + HEAD_HEIGHT / 2) * PROP_TEXEL, 0];
const FLAME_POSITION: [number, number, number] = [0, (STICK_HEIGHT + HEAD_HEIGHT + FLAME_SIZE / 2) * PROP_TEXEL, 0];
// two crossed flame sprites so the flame has some body from every angle
const FLAME_ROTATION_A: [number, number, number] = [0, Math.PI / 4, 0];
const FLAME_ROTATION_B: [number, number, number] = [0, -Math.PI / 4, 0];

// wall torches pivot about the bottom of the stick, which sits low on the wall face
const WALL_TILT = (22.5 * Math.PI) / 180;
const WALL_MOUNT_HEIGHT = 3.5 * PROP_TEXEL;
const WALL_DISTANCE = BLOCK_SIZE / 2;

interface TorchMount {
  position: [number, number, number];
  rotation: [number, number, number];
}

const FLOOR_MOUNT: TorchMount = { position: [0, 0, 0], rotation: [0, 0, 0] };

// the wall is half a block behind the origin, opposite to the facing direction
const WALL_MOUNTS: Readonly<Record<WallFacing, TorchMount>> = {
  [WallFacing.PlusX]: { position: [-WALL_DISTANCE, WALL_MOUNT_HEIGHT, 0], rotation: [0, 0, -WALL_TILT] },
  [WallFacing.MinusX]: { position: [WALL_DISTANCE, WALL_MOUNT_HEIGHT, 0], rotation: [0, 0, WALL_TILT] },
  [WallFacing.PlusZ]: { position: [0, WALL_MOUNT_HEIGHT, -WALL_DISTANCE], rotation: [WALL_TILT, 0, 0] },
};

const FLAME_FRAME_RATE = 8;
const NO_INK = { noInk: true };

// kept at module level so the ink edges effect doesn't rebuild every render
const hasInk = (mesh: Mesh) => !mesh.userData.noInk;

export type TorchProps = ThreeElements['group'] & {
  // mount on a wall leaning out this way, leave it out to stand upright on the floor
  wallFacing?: WallFacing;
};

// wooden torch with a glowing tip. the origin is the bottom centre of the block space the
// torch occupies, so a wall torch's wall face is half a block behind the origin
export const Torch = forwardRef<Group, TorchProps>(function Torch({ wallFacing, ...props }, ref) {
  const groupRef = useRef<Group>(null);
  const meshesRef = useRef<Group>(null);
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'Torch' });

  const geometries = useMemo(
    () => ({
      stick: createTexelBox(STICK_WIDTH, STICK_HEIGHT, STICK_WIDTH),
      head: createTexelBox(STICK_WIDTH, HEAD_HEIGHT, STICK_WIDTH),
      flame: createTexelPlane(FLAME_SIZE, FLAME_SIZE),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometries.stick.dispose();
      geometries.head.dispose();
      geometries.flame.dispose();
    },
    [geometries],
  );

  const { materials, stick, head, flame, flameFrames } = useMemo(() => {
    const stickMaterial = createPixelMaterial(getPropTexture(PropTextureKey.TorchStick));
    const headMaterial = createPixelMaterial(getPropTexture(PropTextureKey.TorchHead), { glow: true });
    const frames = [getPropTexture(PropTextureKey.TorchFlameA), getPropTexture(PropTextureKey.TorchFlameB)];
    const flameMaterial = createPixelMaterial(frames[0], { cutOut: true, glow: true });
    return {
      materials: [stickMaterial, headMaterial, flameMaterial],
      stick: stickMaterial,
      head: headMaterial,
      flame: flameMaterial,
      flameFrames: frames,
    };
  }, []);
  usePixelMaterials(materials, connectMaterial);

  // random phase so a row of torches doesn't flicker in sync
  const phase = useMemo(() => Math.random() * 10, []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const brightness = flickerBrightness(time, phase);
    flame.uniforms.uMap.value = flameFrames[flickerFrame(time, phase, FLAME_FRAME_RATE)];
    (flame.uniforms.uMapTint.value as Vector3).setScalar(brightness);
    (head.uniforms.uMapTint.value as Vector3).setScalar(brightness);
  });

  useImperativeHandle(ref, () => groupRef.current!);

  const mount = wallFacing ? WALL_MOUNTS[wallFacing] : FLOOR_MOUNT;

  return (
    <group ref={groupRef} {...props}>
      <group ref={meshesRef} position={mount.position} rotation={mount.rotation}>
        <mesh geometry={geometries.stick} material={stick} position={STICK_POSITION} castShadow />
        <mesh geometry={geometries.head} material={head} position={HEAD_POSITION} userData={NO_INK} />
        <mesh
          geometry={geometries.flame}
          material={flame}
          position={FLAME_POSITION}
          rotation={FLAME_ROTATION_A}
          userData={NO_INK}
        />
        <mesh
          geometry={geometries.flame}
          material={flame}
          position={FLAME_POSITION}
          rotation={FLAME_ROTATION_B}
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
