'use client';

import { Fragment, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../../hooks';
import { BLOCK_SIZE } from '../constants';
import { createPixelMaterial, usePixelMaterials } from '../materials';
import { getPlantTexture, PlantTexture } from '../plantTextures';
import { hashString, seededRandom } from '../pixelTexture';
import { HANGING_CROSS_GEOMETRY, NO_INK_USER_DATA } from './plantGeometry';

// share of cells that carry berries when no pattern is given
const DEFAULT_BERRY_CHANCE = 0.4;

// the berry sprite shares its planes with the vine, so it is pulled forward in the depth buffer to win
const BERRY_POLYGON_OFFSET_FACTOR = -1;
const BERRY_POLYGON_OFFSET_UNITS = -4;

// a slow pendulum swing about the attachment point, angles in radians
const SWAY_SPEED = 0.7;
const SWAY_ROLL = 0.03;
const SWAY_PITCH = 0.018;
const SWAY_PITCH_RATE = 0.73;
const SWAY_PITCH_OFFSET = 1.1;
// phase shift per world unit along x so neighbouring vines drift out of step
const SWAY_PHASE_PER_UNIT = 1.3;

const worldPosition = new Vector3();

function createDefaultBerryPattern(cells: number, seed: number): boolean[] {
  const rand = seededRandom(hashString(`caveVines:${seed}:${cells}`));
  return Array.from({ length: cells }, () => rand() < DEFAULT_BERRY_CHANCE);
}

export type CaveVinesProps = ThreeElements['group'] & {
  // how many blocks the vine hangs down from the origin
  length: number;
  // one entry per block counting down from the top, true cells carry glow berries
  berryPattern?: readonly boolean[];
  // varies the default berry pattern between vines of the same length
  seed?: number;
};

// ceiling vine, origin at the top centre of the cell it hangs from, grows down `length` blocks
export function CaveVines({ length, berryPattern, seed = 0, ...props }: CaveVinesProps) {
  const groupRef = useRef<Group>(null);
  const swayRef = useRef<Group>(null);
  const swayPhase = useRef<number | null>(null);
  const { connectMaterial } = useEntityReveal(groupRef, { perfLabel: 'CaveVines' });

  const materials = useMemo(() => {
    const berries = createPixelMaterial(getPlantTexture(PlantTexture.GlowBerries), { cutOut: true, glow: true });
    berries.polygonOffset = true;
    berries.polygonOffsetFactor = BERRY_POLYGON_OFFSET_FACTOR;
    berries.polygonOffsetUnits = BERRY_POLYGON_OFFSET_UNITS;
    return [
      createPixelMaterial(getPlantTexture(PlantTexture.CaveVines), { cutOut: true }),
      createPixelMaterial(getPlantTexture(PlantTexture.CaveVinesTip), { cutOut: true }),
      berries,
    ];
  }, []);
  usePixelMaterials(materials, connectMaterial);
  const [vineMaterial, tipMaterial, berryMaterial] = materials;

  const cells = Math.max(0, Math.floor(length));
  const berries = useMemo(
    () => berryPattern ?? createDefaultBerryPattern(cells, seed),
    [berryPattern, cells, seed],
  );

  useFrame(({ clock }) => {
    const sway = swayRef.current;
    if (!sway) return;
    if (swayPhase.current === null) {
      sway.getWorldPosition(worldPosition);
      swayPhase.current = worldPosition.x * SWAY_PHASE_PER_UNIT;
    }
    const t = clock.elapsedTime * SWAY_SPEED + swayPhase.current;
    sway.rotation.z = Math.sin(t) * SWAY_ROLL;
    sway.rotation.x = Math.sin(t * SWAY_PITCH_RATE + SWAY_PITCH_OFFSET) * SWAY_PITCH;
  });

  return (
    <group {...props} ref={groupRef}>
      <group ref={swayRef}>
        {Array.from({ length: cells }, (_, i) => (
          <Fragment key={i}>
            <mesh
              geometry={HANGING_CROSS_GEOMETRY}
              material={i === cells - 1 ? tipMaterial : vineMaterial}
              position-y={-i * BLOCK_SIZE}
              userData={NO_INK_USER_DATA}
            />
            {berries[i] && (
              <mesh
                geometry={HANGING_CROSS_GEOMETRY}
                material={berryMaterial}
                position-y={-i * BLOCK_SIZE}
                userData={NO_INK_USER_DATA}
              />
            )}
          </Fragment>
        ))}
      </group>
    </group>
  );
}
