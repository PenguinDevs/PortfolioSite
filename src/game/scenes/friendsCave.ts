import { BlockKind } from '../minecraft/constants';
import { seededRandom } from '../minecraft/pixelTexture';
import type { Rng } from '../minecraft/pixelTexture';
import type { VoxelBlock } from '../minecraft/VoxelBlocks';

// everything here is in block cells, relative to the end of the projects (the view more slot).
// a cell (x, y, z) spans [x, x + 1] x [y, y + 1] x [z, z + 1]

export const CAVE_START_X = 13;
export const CAVE_COLUMNS = 36;
const CAVE_SEED = 31;

// back wall cells sit in this row, so the wall face is at z = -7
const WALL_Z = -8;
export const WALL_FACE_Z = WALL_Z + 1;
// tall enough that the wall runs off the top of the frame
const WALL_HEIGHT = 13;
// columns over which the wall falls away at each end, which gives the cave its mouth
const MOUTH_TAPER = 7;
const MOUTH_MIN_HEIGHT = 2;

// floor cells sit one block down so their tops line up with the alley ground
const FLOOR_Y = -1;
const FLOOR_Z_START = -7;
// exclusive. the moss runs under the penguin's path and thins out towards the camera from
// FLOOR_FRAY_Z, so the nav at the bottom of the screen still sits on plain alley floor
const FLOOR_Z_END = 6;
const FLOOR_FRAY_Z = 3;

// overhanging ceiling, its underside is what you see from the alley
const CEILING_Y = 10;
const CEILING_Z_START = -7;
// exclusive, the front edge of the overhang
const CEILING_Z_END = -3;
// share of ceiling cells that hang a block lower than the rest
const CEILING_DROP_CHANCE = 0.2;

// clay floor around the dripleaf, [x0, x1) x [z0, z1)
const CLAY_POOL = { x0: 38, x1: 44, z0: -6, z1: -2 };

// value noise scale, bigger means larger patches
const PATCH_SCALE = 4;

export interface CaveShell {
  blocks: VoxelBlock[];
  // y of the lowest ceiling cell above a floor cell, for hanging vines and blossoms off it
  ceilingUnderside: (x: number, z: number) => number | undefined;
}

function hashUnit(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// smooth 2d value noise in 0..1, grows natural looking patches instead of speckle
function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hashUnit(x0, y0, seed) + (hashUnit(x0 + 1, y0, seed) - hashUnit(x0, y0, seed)) * sx;
  const bottom = hashUnit(x0, y0 + 1, seed) + (hashUnit(x0 + 1, y0 + 1, seed) - hashUnit(x0, y0 + 1, seed)) * sx;
  return top + (bottom - top) * sy;
}

function patch(a: number, b: number, layer: number): number {
  return valueNoise(a / PATCH_SCALE, b / PATCH_SCALE, CAVE_SEED + layer * 101);
}

function inClayPool(x: number, z: number): boolean {
  return x >= CLAY_POOL.x0 && x < CLAY_POOL.x1 && z >= CLAY_POOL.z0 && z < CLAY_POOL.z1;
}

function floorKind(x: number, z: number, rand: Rng): BlockKind {
  if (inClayPool(x, z)) return rand() < 0.85 ? BlockKind.Clay : BlockKind.MossBlock;
  const n = patch(x, z, 1);
  if (n > 0.78) return BlockKind.RootedDirt;
  if (n < 0.12) return BlockKind.Stone;
  return BlockKind.MossBlock;
}

function wallKind(x: number, y: number, rand: Rng): BlockKind {
  // deepslate creeps in along the bottom of the wall
  if (y <= 1 && rand() < 0.5) return BlockKind.Deepslate;
  if (patch(x, y, 2) > 0.7) return BlockKind.MossBlock;
  if (patch(x, y, 3) > 0.74) return BlockKind.Andesite;
  if (y >= CEILING_Y - 2 && patch(x, y, 4) > 0.6) return BlockKind.RootedDirt;
  return rand() < 0.06 ? BlockKind.Cobblestone : BlockKind.Stone;
}

function ceilingKind(x: number, y: number, z: number, underside: number): BlockKind {
  if (y > underside) return BlockKind.Stone;
  // moss carpets the underside, with patches of azalea roots poking through
  return patch(x, z, 5) > 0.68 ? BlockKind.RootedDirt : BlockKind.MossBlock;
}

export function buildCaveShell(): CaveShell {
  const rand = seededRandom(CAVE_SEED);
  const blocks: VoxelBlock[] = [];
  const undersides = new Map<string, number>();

  for (let i = 0; i < CAVE_COLUMNS; i++) {
    const x = CAVE_START_X + i;
    const fromEnd = Math.min(i, CAVE_COLUMNS - 1 - i);
    // 0 at the very ends of the cave, 1 once inside the mouth
    const inside = Math.min(fromEnd / MOUTH_TAPER, 1);

    // floor. the moss spills out of the mouth in blobs rather than scattered single blocks
    for (let z = FLOOR_Z_START; z < FLOOR_Z_END; z++) {
      if (inside < 1 && patch(x, z, 7) > inside * 0.9 + 0.15) continue;
      const fray = (z - FLOOR_FRAY_Z + 1) / (FLOOR_Z_END - FLOOR_FRAY_Z + 1);
      if (z >= FLOOR_FRAY_Z && patch(x, z, 6) < fray) continue;
      blocks.push({ kind: floorKind(x, z, rand), x, y: FLOOR_Y, z });
    }

    // back wall, rising from the mouth into a full-height wall
    const wallHeight = inside >= 1
      ? WALL_HEIGHT
      : MOUTH_MIN_HEIGHT + Math.round((WALL_HEIGHT - MOUTH_MIN_HEIGHT) * inside * inside) + (rand() < 0.5 ? 0 : 1);
    for (let y = 0; y < wallHeight; y++) {
      blocks.push({ kind: wallKind(x, y, rand), x, y, z: WALL_Z });
    }

    // ceiling overhang across the full-height part of the wall, with a ragged front edge
    if (inside < 1) continue;
    const frontZ = CEILING_Z_END + (rand() < 0.3 ? 1 : 0) - (rand() < 0.25 ? 1 : 0);
    for (let z = CEILING_Z_START; z < frontZ; z++) {
      const underside = rand() < CEILING_DROP_CHANCE ? CEILING_Y - 1 : CEILING_Y;
      undersides.set(`${x},${z}`, underside);
      for (let y = underside; y < WALL_HEIGHT; y++) {
        blocks.push({ kind: ceilingKind(x, y, z, underside), x, y, z });
      }
    }
  }

  return {
    blocks,
    ceilingUnderside: (x, z) => undersides.get(`${x},${z}`),
  };
}
