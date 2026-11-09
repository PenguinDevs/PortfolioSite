import { BlockKind } from '../minecraft/constants';
import { seededRandom } from '../minecraft/pixelTexture';
import type { Rng } from '../minecraft/pixelTexture';
import type { VoxelBlock } from '../minecraft/VoxelBlocks';
import { buildPillarBlocks, PillarWaist } from '../minecraft/StonePillar';

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

// the ground behind the props steps up towards the back wall, so the cave curves up into it.
// the props row and everything in front of it stays flat
const TERRAIN_Z_FRONT = -3;
const TERRAIN_MAX_HEIGHT = 5;
// average blocks gained per row going back, and how much the noise can push it either way
const TERRAIN_RISE_PER_ROW = 0.8;
const TERRAIN_JITTER = 3;

// overhanging ceiling, its underside is what you see from the alley
const CEILING_Y = 10;
const CEILING_Z_START = -7;
// exclusive, the front edge of the overhang
const CEILING_Z_END = -3;
// share of ceiling cells that hang a block lower than the rest
const CEILING_DROP_CHANCE = 0.2;
// rows at the back where the ceiling curves down into the wall, a block per row
const CEILING_CURVE_ROWS = 2;

// a column in the back layer near the left mouth, so the cave wall reads as curving round.
// [x0, x1) x [z0, z1), with a stubby foot and a thinner overhang joining it to the ceiling
const BACK_PILLAR = { x0: 16, x1: 18, z0: -5, z1: -3 };
const BACK_PILLAR_FLARE = 2;
const BRIDGE_Z_START = -6;

// clay floor around the dripleaf, [x0, x1) x [z0, z1)
const CLAY_POOL = { x0: 38, x1: 44, z0: -6, z1: -2 };

// a small vein of iron in the back wall, in the open stone left of the props so it shows
// from the chest. [x, y] cells, all above the ground and below the ceiling curve
const IRON_VEIN: readonly (readonly [number, number])[] = [[23, 6], [24, 6], [24, 5], [25, 5], [25, 4]];
const IRON_VEIN_CELLS = new Set(IRON_VEIN.map(([x, y]) => `${x},${y}`));

// value noise scale, bigger means larger patches
const PATCH_SCALE = 4;

export interface CaveShell {
  blocks: VoxelBlock[];
  // y of the lowest ceiling cell above a floor cell, for hanging vines and blossoms off it
  ceilingUnderside: (x: number, z: number) => number | undefined;
  // height of the ground standing in a cell, 0 where it is flat, for standing things on top
  surfaceHeight: (x: number, z: number) => number;
}

function cellKey(x: number, z: number): string {
  return `${x},${z}`;
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

function inBackPillar(x: number, z: number): boolean {
  return x >= BACK_PILLAR.x0 && x < BACK_PILLAR.x1 && z >= BACK_PILLAR.z0 && z < BACK_PILLAR.z1;
}

function floorKind(x: number, z: number, rand: Rng): BlockKind {
  if (inClayPool(x, z)) return rand() < 0.85 ? BlockKind.Clay : BlockKind.MossBlock;
  const n = patch(x, z, 1);
  if (n > 0.78) return BlockKind.RootedDirt;
  if (n < 0.12) return BlockKind.Stone;
  return BlockKind.MossBlock;
}

// how many blocks of ground stand in a cell behind the props, growing towards the wall
function terrainHeight(x: number, z: number, inside: number): number {
  if (z > TERRAIN_Z_FRONT || inClayPool(x, z)) return 0;
  const rowsBack = TERRAIN_Z_FRONT - z;
  const rise = rowsBack * TERRAIN_RISE_PER_ROW + (patch(x, z, 8) - 0.5) * TERRAIN_JITTER;
  return Math.max(0, Math.min(TERRAIN_MAX_HEIGHT, Math.round(rise * inside)));
}

// moss on top, a layer of dirt under it and stone below, like a cut through the ground
function terrainKind(x: number, y: number, z: number, height: number): BlockKind {
  const fromTop = height - 1 - y;
  if (fromTop === 0) {
    // mostly moss, with patches of bare stone and roots so the steps don't read as one green slab
    const n = patch(x, z, 9);
    if (n > 0.78) return BlockKind.RootedDirt;
    return n < 0.3 ? BlockKind.Stone : BlockKind.MossBlock;
  }
  if (fromTop === 1) return patch(x + y, z, 10) > 0.5 ? BlockKind.Dirt : BlockKind.RootedDirt;
  return y <= 1 && patch(x, z + y, 11) > 0.55 ? BlockKind.Deepslate : BlockKind.Stone;
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
  const surfaces = new Map<string, number>();

  // ground standing cells also record how high their column reaches
  const stack = (kind: BlockKind, x: number, y: number, z: number) => {
    blocks.push({ kind, x, y, z });
    const key = cellKey(x, z);
    surfaces.set(key, Math.max(surfaces.get(key) ?? 0, y + 1));
  };

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

    // ground behind the props, stepping up towards the back wall
    for (let z = WALL_Z + 1; z <= TERRAIN_Z_FRONT; z++) {
      if (inBackPillar(x, z)) continue;
      const height = terrainHeight(x, z, inside);
      for (let y = 0; y < height; y++) stack(terrainKind(x, y, z, height), x, y, z);
    }

    // back wall, rising from the mouth into a full-height wall. it stays full height behind the
    // back pillar so the overhang joining the pillar to the ceiling has wall behind it
    const wallHeight = inside >= 1 || x >= BACK_PILLAR.x0
      ? WALL_HEIGHT
      : MOUTH_MIN_HEIGHT + Math.round((WALL_HEIGHT - MOUTH_MIN_HEIGHT) * inside * inside) + (rand() < 0.5 ? 0 : 1);
    for (let y = 0; y < wallHeight; y++) {
      // vein cells still roll a wall kind, so the vein never reshuffles the rest of the wall
      const kind = wallKind(x, y, rand);
      blocks.push({ kind: IRON_VEIN_CELLS.has(`${x},${y}`) ? BlockKind.IronOre : kind, x, y, z: WALL_Z });
    }

    // ceiling overhang across the full-height part of the wall, with a ragged front edge,
    // curving down into the wall at the back
    if (inside < 1) continue;
    const frontZ = CEILING_Z_END + (rand() < 0.3 ? 1 : 0) - (rand() < 0.25 ? 1 : 0);
    for (let z = CEILING_Z_START; z < frontZ; z++) {
      const curve = Math.max(0, CEILING_CURVE_ROWS - (z - CEILING_Z_START));
      const underside = CEILING_Y - curve - (rand() < CEILING_DROP_CHANCE ? 1 : 0);
      undersides.set(cellKey(x, z), underside);
      for (let y = underside; y < WALL_HEIGHT; y++) {
        blocks.push({ kind: ceilingKind(x, y, z, underside), x, y, z });
      }
    }
  }

  // the back pillar with curved waist visible on the open left side and stubby foot
  const backPillarBlocks = buildPillarBlocks({
    height: WALL_HEIGHT,
    width: 2,
    depth: 2,
    baseFlare: BACK_PILLAR_FLARE,
    seed: 27,
    waistSide: PillarWaist.Left,
  });
  for (const b of backPillarBlocks) {
    stack(b.kind, BACK_PILLAR.x0 + b.x, b.y, BACK_PILLAR.z0 + b.z);
  }

  // a thinner overhang from the pillar across to the main ceiling, wrapping the left side round
  for (let x = BACK_PILLAR.x0; x < CAVE_START_X + MOUTH_TAPER; x++) {
    for (let z = BRIDGE_Z_START; z < CEILING_Z_END; z++) {
      for (let y = CEILING_Y; y < WALL_HEIGHT; y++) {
        blocks.push({ kind: ceilingKind(x, y, z, CEILING_Y), x, y, z });
      }
    }
  }

  return {
    blocks,
    ceilingUnderside: (x, z) => undersides.get(cellKey(x, z)),
    surfaceHeight: (x, z) => surfaces.get(cellKey(x, z)) ?? 0,
  };
}
