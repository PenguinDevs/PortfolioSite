'use client';

import { useMemo } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import type { EntityRevealOptions } from '../hooks';
import { BLOCK_SIZE, BlockKind } from './constants';
import { hashString, seededRandom } from './pixelTexture';
import type { Rng } from './pixelTexture';
import { VoxelBlocks } from './VoxelBlocks';
import type { VoxelBlock } from './VoxelBlocks';

export type StonePillarProps = {
  // blocks tall
  height: number;
  width?: 1 | 2;
  depth?: 1 | 2;
  // how many of the lowest layers get widened
  baseFlare?: number;
  seed?: number;
} & ThreeElements['group'];

// the bottom layer rings the shaft one block out, minus a few knocked out blocks
const CORNER_KNOCKOUT_CHANCE = 0.5;
const EDGE_KNOCKOUT_CHANCE = 0.15;
// higher flare layers only widen on some sides, this is the chance for the first of them
// and it tapers off towards the top of the flare
const SIDE_FLARE_CHANCE = 0.55;
const SIDE_CELL_KNOCKOUT_CHANCE = 0.25;

// material odds, anything not picked stays plain stone
const DEEPSLATE_CHANCE_BY_LAYER = [0.3, 0.15];
const MOSS_EXPOSED_FLARE_CHANCE = 0.6;
const MOSS_COVERED_FLARE_CHANCE = 0.25;
const MOSS_SHAFT_FOOT_CHANCE = 0.2;
const MOSSY_COBBLE_BOTTOM_CHANCE = 0.18;
const MOSSY_COBBLE_TOP_CHANCE = 0.04;
const COBBLE_CHANCE = 0.08;
const ANDESITE_CHANCE = 0.12;

const PILLAR_REVEAL_OPTIONS: EntityRevealOptions = { perfLabel: 'StonePillar' };

enum PillarSide {
  Left,
  Right,
  Back,
  Front,
}

const PILLAR_SIDES = [PillarSide.Left, PillarSide.Right, PillarSide.Back, PillarSide.Front];

interface PillarCell {
  x: number;
  y: number;
  z: number;
  flare: boolean;
}

// which side of the shaft a flare cell sticks out from, undefined for corners
function flareSide(x: number, z: number, width: number, depth: number): PillarSide | undefined {
  const outX = x < 0 || x >= width;
  const outZ = z < 0 || z >= depth;
  if (outX && outZ) return undefined;
  if (x < 0) return PillarSide.Left;
  if (x >= width) return PillarSide.Right;
  return z < 0 ? PillarSide.Back : PillarSide.Front;
}

function pickKind(rand: Rng, cell: PillarCell, topExposed: boolean, height: number): BlockKind {
  const { y, flare } = cell;

  // moss creeps over the foot, thickest where nothing sits on top of it
  if (flare && rand() < (topExposed ? MOSS_EXPOSED_FLARE_CHANCE : MOSS_COVERED_FLARE_CHANCE)) return BlockKind.MossBlock;
  if (!flare && y === 0 && rand() < MOSS_SHAFT_FOOT_CHANCE) return BlockKind.MossBlock;

  if (y < DEEPSLATE_CHANCE_BY_LAYER.length && rand() < DEEPSLATE_CHANCE_BY_LAYER[y]) return BlockKind.Deepslate;

  const heightT = height > 1 ? y / (height - 1) : 0;
  const mossyChance = MOSSY_COBBLE_BOTTOM_CHANCE + (MOSSY_COBBLE_TOP_CHANCE - MOSSY_COBBLE_BOTTOM_CHANCE) * heightT;
  const roll = rand();
  if (roll < mossyChance) return BlockKind.MossyCobblestone;
  if (roll < mossyChance + COBBLE_CHANCE) return BlockKind.Cobblestone;
  if (roll < mossyChance + COBBLE_CHANCE + ANDESITE_CHANCE) return BlockKind.Andesite;
  return BlockKind.Stone;
}

// cells use the shaft's own grid, x in [0, width) and z in [0, depth), flare cells spill
// one block outside that
function buildPillar(height: number, width: number, depth: number, baseFlare: number, seed: number): VoxelBlock[] {
  const rand = seededRandom(hashString(`stonePillar:${seed}`));
  const layers = Math.max(0, Math.floor(height));
  const flareLayers = Math.min(Math.max(0, Math.floor(baseFlare)), layers);
  const cells: PillarCell[] = [];
  const occupied = new Set<string>();
  const add = (x: number, y: number, z: number, flare: boolean) => {
    cells.push({ x, y, z, flare });
    occupied.add(`${x},${y},${z}`);
  };

  for (let y = 0; y < layers; y++) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) add(x, y, z, false);
    }
    if (y >= flareLayers) continue;

    // sides this layer widens on, the bottom layer goes all the way round
    const widened = new Set<PillarSide>();
    if (y === 0) {
      for (const side of PILLAR_SIDES) widened.add(side);
    } else {
      const chance = SIDE_FLARE_CHANCE * (flareLayers - y) / Math.max(1, flareLayers - 1);
      for (const side of PILLAR_SIDES) if (rand() < chance) widened.add(side);
      // the layer just above the ring always steps out somewhere so the foot looks stubby
      if (y === 1 && widened.size === 0) widened.add(PILLAR_SIDES[Math.floor(rand() * PILLAR_SIDES.length)]);
    }

    for (let x = -1; x <= width; x++) {
      for (let z = -1; z <= depth; z++) {
        const inShaft = x >= 0 && x < width && z >= 0 && z < depth;
        if (inShaft) continue;
        const side = flareSide(x, z, width, depth);

        if (y === 0) {
          const knockout = side === undefined ? CORNER_KNOCKOUT_CHANCE : EDGE_KNOCKOUT_CHANCE;
          if (rand() >= knockout) add(x, y, z, true);
          continue;
        }

        // upper flare layers skip corners and only rest on blocks below, so nothing overhangs
        if (side === undefined || !widened.has(side)) continue;
        if (!occupied.has(`${x},${y - 1},${z}`)) continue;
        if (rand() >= SIDE_CELL_KNOCKOUT_CHANCE) add(x, y, z, true);
      }
    }
  }

  return cells.map((cell) => ({
    kind: pickKind(rand, cell, !occupied.has(`${cell.x},${cell.y + 1},${cell.z}`), layers),
    x: cell.x,
    y: cell.y,
    z: cell.z,
  }));
}

// a natural cave column, width x depth blocks thick with a stubby mossy foot. centred on the
// group origin in x and z with its bottom on y = 0, and the same shape every time for a seed
export function StonePillar({ height, width = 2, depth = 1, baseFlare = 2, seed = 0, ...groupProps }: StonePillarProps) {
  const blocks = useMemo(
    () => buildPillar(height, width, depth, baseFlare, seed),
    [height, width, depth, baseFlare, seed],
  );

  return (
    <group {...groupProps}>
      <VoxelBlocks
        blocks={blocks}
        inkSeed={seed}
        revealOptions={PILLAR_REVEAL_OPTIONS}
        position={[(-width / 2) * BLOCK_SIZE, 0, (-depth / 2) * BLOCK_SIZE]}
      />
    </group>
  );
}
