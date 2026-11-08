import type { CanvasTexture } from 'three';
import { BlockFace, BlockKind } from './constants';
import { createPixelTexture, loadVanillaTexture, setPixel } from './pixelTexture';
import type { PixelPainter, Rng } from './pixelTexture';

// every palette in here runs from darkest to lightest so noise values map straight onto it
type Palette = readonly string[];

// which part of a block a texture covers, used to build the texture keys
enum TextureVariant {
  All = 'all',
  Top = 'top',
  Side = 'side',
}

// --- palettes, all hand picked ---

const STONE_PALETTE: Palette = ['#6c6c6c', '#757575', '#7e7e7e', '#868686', '#8f8f8f'];
const STONE_STREAK = '#626262';
const STONE_FLECK = '#9b9b9b';

interface CobblePalette {
  stones: Palette;
  highlight: string;
  shadow: string;
  mortar: string;
  mortarDark: string;
}

const COBBLE_PALETTE: CobblePalette = {
  stones: ['#6e6e6e', '#787878', '#828282', '#8c8c8c'],
  highlight: '#a2a2a2',
  shadow: '#5a5a5a',
  mortar: '#474747',
  mortarDark: '#3a3a3a',
};

const MOSS_ON_STONE_PALETTE: Palette = ['#4a6b29', '#557a2f', '#638c37', '#709c41'];

const ANDESITE_PALETTE: Palette = ['#868688', '#919193', '#9c9c9e', '#a7a7a8', '#b2b2b3'];

const DEEPSLATE_PALETTE: Palette = ['#36363c', '#3f3f46', '#48484f', '#515159', '#5b5b63'];
const DEEPSLATE_GRAIN_DARK = '#2e2e33';
const DEEPSLATE_GRAIN_LIGHT = '#62626b';
const DEEPSLATE_SEAM = '#2a2a2f';

const MOSS_BLOCK_PALETTE: Palette = ['#4e792f', '#5a8837', '#669641', '#71a74d', '#7db257', '#89bd63'];
const MOSS_BLOCK_DARK = '#436727';
const MOSS_BLOCK_LIGHT = '#98c870';

const DIRT_PALETTE: Palette = ['#6c4930', '#785338', '#845e42', '#8f684a', '#9a7353'];
const DIRT_PEBBLE = '#8a827b';

const ROOT_PALETTE: Palette = ['#b89670', '#c7a882', '#d6bc95'];
const ROOT_SHADOW = '#5a3d28';

const CLAY_PALETTE: Palette = ['#959bab', '#9ba1b1', '#a0a6b6', '#a5abbb'];
const CLAY_DARK = '#8a90a0';
const CLAY_LIGHT = '#b0b6c5';

// --- painting helpers ---

// maps a 0..1 value onto a dark to light palette
function shade(palette: Palette, value: number): string {
  const index = Math.floor(Math.min(Math.max(value, 0), 1) * palette.length);
  return palette[Math.min(index, palette.length - 1)];
}

function wrap(value: number, size: number): number {
  return ((value % size) + size) % size;
}

// signed offset that takes the short way round a tiling texture
function wrappedOffset(delta: number, size: number): number {
  if (delta > size / 2) return delta - size;
  if (delta < -size / 2) return delta + size;
  return delta;
}

function smoothStep(t: number): number {
  return t * t * (3 - 2 * t);
}

// smooth value noise in 0..1 that tiles across the texture, cellsX by cellsY lattice cells
function createValueNoise(rand: Rng, size: number, cellsX: number, cellsY = cellsX) {
  const lattice = new Float32Array(cellsX * cellsY);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const at = (cx: number, cy: number) => lattice[wrap(cy, cellsY) * cellsX + wrap(cx, cellsX)];

  return (x: number, y: number) => {
    // sample at texel centres
    const gx = ((x + 0.5) / size) * cellsX;
    const gy = ((y + 0.5) / size) * cellsY;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = smoothStep(gx - x0);
    const ty = smoothStep(gy - y0);
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

interface CellSample {
  // index of the nearest cell centre
  cell: number;
  // offset from that centre to the texel, in texels
  dx: number;
  dy: number;
  // distance from the texel to the nearest cell border
  edgeDistance: number;
}

// tiling voronoi cells, one jittered centre per grid square, used for cobbles and slate plates
function createCells(rand: Rng, size: number, grid: number, jitter: number) {
  const step = size / grid;
  const centres: { x: number; y: number }[] = [];
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const margin = (1 - jitter) / 2;
      centres.push({ x: (gx + margin + rand() * jitter) * step, y: (gy + margin + rand() * jitter) * step });
    }
  }

  const sample = (x: number, y: number): CellSample => {
    const px = x + 0.5;
    const py = y + 0.5;
    let nearest = 0;
    let nearestDistSq = Infinity;
    for (let i = 0; i < centres.length; i++) {
      const dx = wrappedOffset(px - centres[i].x, size);
      const dy = wrappedOffset(py - centres[i].y, size);
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearest = i;
      }
    }

    // distance to the border with each other cell is measured along the line between the centres
    let edgeDistance = Infinity;
    for (let i = 0; i < centres.length; i++) {
      if (i === nearest) continue;
      const dx = wrappedOffset(px - centres[i].x, size);
      const dy = wrappedOffset(py - centres[i].y, size);
      const cx = wrappedOffset(centres[nearest].x - centres[i].x, size);
      const cy = wrappedOffset(centres[nearest].y - centres[i].y, size);
      const between = Math.sqrt(cx * cx + cy * cy);
      if (between === 0) continue;
      const distance = (dx * dx + dy * dy - nearestDistSq) / (2 * between);
      edgeDistance = Math.min(edgeDistance, distance);
    }

    return {
      cell: nearest,
      dx: wrappedOffset(px - centres[nearest].x, size),
      dy: wrappedOffset(py - centres[nearest].y, size),
      edgeDistance,
    };
  };

  return { count: centres.length, sample };
}

// --- painters ---

const COBBLE_GRID = 3;
const COBBLE_JITTER = 0.6;
const COBBLE_MORTAR_WIDTH = 0.55;
const COBBLE_RIM_WIDTH = 1.6;
const COBBLE_DARK_MORTAR_CHANCE = 0.3;
const COBBLE_FLECK_CHANCE = 0.15;

// rounded stones with a lit top left rim, a shaded bottom right rim and dark mortar between them.
// returns a mask of mortar texels so overlays can grow into the gaps first
function paintCobble(ctx: CanvasRenderingContext2D, rand: Rng, size: number, palette: CobblePalette): Uint8Array {
  const cells = createCells(rand, size, COBBLE_GRID, COBBLE_JITTER);
  const tones: number[] = [];
  for (let i = 0; i < cells.count; i++) tones.push(rand());

  const mortar = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { cell, dx, dy, edgeDistance } = cells.sample(x, y);
      if (edgeDistance < COBBLE_MORTAR_WIDTH) {
        mortar[y * size + x] = 1;
        setPixel(ctx, x, y, rand() < COBBLE_DARK_MORTAR_CHANCE ? palette.mortarDark : palette.mortar);
        continue;
      }

      // canvas y runs down, so dx + dy > 0 is the bottom right of a stone
      const towardsLight = -(dx + dy);
      if (edgeDistance < COBBLE_RIM_WIDTH && towardsLight > 0.5) {
        setPixel(ctx, x, y, palette.highlight);
      } else if (edgeDistance < COBBLE_RIM_WIDTH && towardsLight < -0.5) {
        setPixel(ctx, x, y, palette.shadow);
      } else {
        const fleck = rand() < COBBLE_FLECK_CHANCE ? (rand() - 0.5) * 0.5 : 0;
        setPixel(ctx, x, y, shade(palette.stones, tones[cell] + fleck));
      }
    }
  }
  return mortar;
}

const STONE_STREAK_COUNT = 6;
const STONE_FLECK_COUNT = 5;

const paintStone: PixelPainter = (ctx, rand, size) => {
  const noise = createValueNoise(rand, size, 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      setPixel(ctx, x, y, shade(STONE_PALETTE, noise(x, y) * 0.55 + rand() * 0.45));
    }
  }
  // short smudgy streaks and a few pale flecks, like the grain in real stone
  for (let i = 0; i < STONE_STREAK_COUNT; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const length = 2 + Math.floor(rand() * 2);
    for (let j = 0; j < length; j++) setPixel(ctx, wrap(x + j, size), y, STONE_STREAK);
  }
  for (let i = 0; i < STONE_FLECK_COUNT; i++) {
    setPixel(ctx, Math.floor(rand() * size), Math.floor(rand() * size), STONE_FLECK);
  }
};

const paintCobblestone: PixelPainter = (ctx, rand, size) => {
  paintCobble(ctx, rand, size, COBBLE_PALETTE);
};

const MOSS_PATCH_THRESHOLD = 0.56;
// mortar holds onto moss more easily than the stone faces
const MOSS_MORTAR_BONUS = 0.12;
const MOSS_STRAY_CHANCE = 0.04;

const paintMossyCobblestone: PixelPainter = (ctx, rand, size) => {
  const mortar = paintCobble(ctx, rand, size, COBBLE_PALETTE);
  const noise = createValueNoise(rand, size, 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inMortar = mortar[y * size + x] === 1;
      const growth = noise(x, y) + (inMortar ? MOSS_MORTAR_BONUS : 0);
      if (growth > MOSS_PATCH_THRESHOLD || rand() < MOSS_STRAY_CHANCE) {
        // moss in the gaps sits in shadow, so it gets the darker greens
        const value = inMortar ? rand() * 0.5 : 0.3 + rand() * 0.7;
        setPixel(ctx, x, y, shade(MOSS_ON_STONE_PALETTE, value));
      }
    }
  }
};

const ANDESITE_SWIRL_BANDS = 2.5;
const ANDESITE_FLECK_CHANCE = 0.1;

const paintAndesite: PixelPainter = (ctx, rand, size) => {
  const broad = createValueNoise(rand, size, 3);
  const fine = createValueNoise(rand, size, 8);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // folding the noise into a triangle wave turns its contours into swirly bands
      const swirl = (broad(x, y) + fine(x, y) * 0.35) * ANDESITE_SWIRL_BANDS;
      let value = Math.abs((swirl % 1) * 2 - 1);
      if (rand() < ANDESITE_FLECK_CHANCE) value = rand();
      setPixel(ctx, x, y, shade(ANDESITE_PALETTE, value));
    }
  }
};

const DEEPSLATE_DARK_GRAIN_COUNT = 7;
const DEEPSLATE_LIGHT_GRAIN_COUNT = 4;

// layered rock, so the sides get long horizontal grain
const paintDeepslateSide: PixelPainter = (ctx, rand, size) => {
  const layers = createValueNoise(rand, size, 2, 8);
  const rows: number[] = [];
  for (let y = 0; y < size; y++) rows.push(rand());

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = rows[y] * 0.4 + layers(x, y) * 0.4 + rand() * 0.2;
      setPixel(ctx, x, y, shade(DEEPSLATE_PALETTE, value));
    }
  }

  const drawRuns = (count: number, minLength: number, extraLength: number, colour: string) => {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      const length = minLength + Math.floor(rand() * extraLength);
      for (let j = 0; j < length; j++) setPixel(ctx, wrap(x + j, size), y, colour);
    }
  };
  drawRuns(DEEPSLATE_DARK_GRAIN_COUNT, 3, 4, DEEPSLATE_GRAIN_DARK);
  drawRuns(DEEPSLATE_LIGHT_GRAIN_COUNT, 2, 3, DEEPSLATE_GRAIN_LIGHT);
};

const DEEPSLATE_PLATE_GRID = 2;
const DEEPSLATE_PLATE_JITTER = 0.7;
const DEEPSLATE_SEAM_WIDTH = 0.5;
// seams are broken up so the top reads as cracked plates rather than tiles
const DEEPSLATE_SEAM_GAP_CHANCE = 0.25;

// the cut end of the layers, blotchy plates split by thin cracks
const paintDeepslateTop: PixelPainter = (ctx, rand, size) => {
  const plates = createCells(rand, size, DEEPSLATE_PLATE_GRID, DEEPSLATE_PLATE_JITTER);
  const tones: number[] = [];
  for (let i = 0; i < plates.count; i++) tones.push(0.3 + rand() * 0.5);
  const blotches = createValueNoise(rand, size, 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { cell, edgeDistance } = plates.sample(x, y);
      if (edgeDistance < DEEPSLATE_SEAM_WIDTH && rand() > DEEPSLATE_SEAM_GAP_CHANCE) {
        setPixel(ctx, x, y, DEEPSLATE_SEAM);
        continue;
      }
      const value = tones[cell] * 0.5 + blotches(x, y) * 0.3 + rand() * 0.2;
      setPixel(ctx, x, y, shade(DEEPSLATE_PALETTE, value));
    }
  }
};

const MOSS_CLUMP_COUNT = 9;
const MOSS_HIGHLIGHT_COUNT = 7;

const paintMossBlock: PixelPainter = (ctx, rand, size) => {
  const noise = createValueNoise(rand, size, 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      setPixel(ctx, x, y, shade(MOSS_BLOCK_PALETTE, noise(x, y) * 0.5 + rand() * 0.5));
    }
  }
  // little shadowed tufts with a lit texel on top give the mottled, fuzzy look
  for (let i = 0; i < MOSS_CLUMP_COUNT; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    setPixel(ctx, x, y, MOSS_BLOCK_DARK);
    setPixel(ctx, wrap(x + (rand() < 0.5 ? 1 : 0), size), wrap(y + 1, size), MOSS_BLOCK_DARK);
  }
  for (let i = 0; i < MOSS_HIGHLIGHT_COUNT; i++) {
    setPixel(ctx, Math.floor(rand() * size), Math.floor(rand() * size), MOSS_BLOCK_LIGHT);
  }
};

const DIRT_PEBBLE_COUNT = 4;

const paintDirt: PixelPainter = (ctx, rand, size) => {
  const noise = createValueNoise(rand, size, 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      setPixel(ctx, x, y, shade(DIRT_PALETTE, noise(x, y) * 0.3 + rand() * 0.7));
    }
  }
  for (let i = 0; i < DIRT_PEBBLE_COUNT; i++) {
    setPixel(ctx, Math.floor(rand() * size), Math.floor(rand() * size), DIRT_PEBBLE);
  }
};

const ROOT_STRAND_COUNT = 5;
const ROOT_MIN_LENGTH = 6;
const ROOT_EXTRA_LENGTH = 7;
const ROOT_DRIFT_CHANCE = 0.35;
const ROOT_BRANCH_CHANCE = 0.2;
const ROOT_BRANCH_MAX_LENGTH = 3;

// dirt threaded with pale roots that wander mostly downwards and fork now and then
const paintRootedDirt: PixelPainter = (ctx, rand, size) => {
  paintDirt(ctx, rand, size);

  const roots = new Uint8Array(size * size);
  const mark = (x: number, y: number) => {
    roots[wrap(y, size) * size + wrap(x, size)] = 1;
  };

  for (let i = 0; i < ROOT_STRAND_COUNT; i++) {
    let x = Math.floor(rand() * size);
    let y = Math.floor(rand() * size);
    const length = ROOT_MIN_LENGTH + Math.floor(rand() * ROOT_EXTRA_LENGTH);
    for (let step = 0; step < length; step++) {
      mark(x, y);
      if (rand() < ROOT_BRANCH_CHANCE) {
        const direction = rand() < 0.5 ? -1 : 1;
        const branchLength = 1 + Math.floor(rand() * ROOT_BRANCH_MAX_LENGTH);
        for (let b = 1; b <= branchLength; b++) mark(x + direction * b, y + (b > 1 ? 1 : 0));
      }
      if (rand() < ROOT_DRIFT_CHANCE) x += rand() < 0.5 ? -1 : 1;
      else y += 1;
    }
  }

  // each root casts a texel of shadow below it, painted first so the roots stay on top
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (roots[y * size + x]) setPixel(ctx, x, wrap(y + 1, size), ROOT_SHADOW);
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (roots[y * size + x]) setPixel(ctx, x, y, shade(ROOT_PALETTE, rand()));
    }
  }
};

const CLAY_SPECK_COUNT = 6;

const paintClay: PixelPainter = (ctx, rand, size) => {
  const noise = createValueNoise(rand, size, 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      setPixel(ctx, x, y, shade(CLAY_PALETTE, noise(x, y) * 0.7 + rand() * 0.3));
    }
  }
  for (let i = 0; i < CLAY_SPECK_COUNT; i++) {
    const colour = i % 2 === 0 ? CLAY_DARK : CLAY_LIGHT;
    setPixel(ctx, Math.floor(rand() * size), Math.floor(rand() * size), colour);
  }
};

// --- lookup ---

interface BlockTextureSpec {
  key: string;
  paint: PixelPainter;
}

type BlockFaceTextures = Record<BlockFace, BlockTextureSpec>;

function textureSpec(kind: BlockKind, variant: TextureVariant, paint: PixelPainter): BlockTextureSpec {
  return { key: `block:${kind}:${variant}`, paint };
}

// one shared texture for blocks that look the same from every side
function sameOnEveryFace(kind: BlockKind, paint: PixelPainter): BlockFaceTextures {
  const spec = textureSpec(kind, TextureVariant.All, paint);
  return { [BlockFace.Top]: spec, [BlockFace.Side]: spec, [BlockFace.Bottom]: spec };
}

const deepslateEnds = textureSpec(BlockKind.Deepslate, TextureVariant.Top, paintDeepslateTop);

const BLOCK_TEXTURES: Record<BlockKind, BlockFaceTextures> = {
  [BlockKind.Stone]: sameOnEveryFace(BlockKind.Stone, paintStone),
  [BlockKind.Cobblestone]: sameOnEveryFace(BlockKind.Cobblestone, paintCobblestone),
  [BlockKind.MossyCobblestone]: sameOnEveryFace(BlockKind.MossyCobblestone, paintMossyCobblestone),
  [BlockKind.Andesite]: sameOnEveryFace(BlockKind.Andesite, paintAndesite),
  [BlockKind.Deepslate]: {
    [BlockFace.Top]: deepslateEnds,
    [BlockFace.Side]: textureSpec(BlockKind.Deepslate, TextureVariant.Side, paintDeepslateSide),
    [BlockFace.Bottom]: deepslateEnds,
  },
  [BlockKind.MossBlock]: sameOnEveryFace(BlockKind.MossBlock, paintMossBlock),
  [BlockKind.Dirt]: sameOnEveryFace(BlockKind.Dirt, paintDirt),
  [BlockKind.RootedDirt]: sameOnEveryFace(BlockKind.RootedDirt, paintRootedDirt),
  [BlockKind.Clay]: sameOnEveryFace(BlockKind.Clay, paintClay),
};

// cache key of the texture a block face uses. faces that share a texture share a key,
// so the voxel mesher can batch them into one mesh
export function getBlockTextureKey(kind: BlockKind, face: BlockFace): string {
  return BLOCK_TEXTURES[kind][face].key;
}

const VANILLA_TEXTURE_FILES: Record<BlockKind, Partial<Record<BlockFace, string>>> = {
  [BlockKind.Stone]: { [BlockFace.Side]: 'stone.png' },
  [BlockKind.Cobblestone]: { [BlockFace.Side]: 'cobblestone.png' },
  [BlockKind.MossyCobblestone]: { [BlockFace.Side]: 'mossy_cobblestone.png' },
  [BlockKind.Andesite]: { [BlockFace.Side]: 'andesite.png' },
  [BlockKind.Deepslate]: {
    [BlockFace.Top]: 'deepslate_top.png',
    [BlockFace.Bottom]: 'deepslate_top.png',
    [BlockFace.Side]: 'deepslate.png',
  },
  [BlockKind.MossBlock]: { [BlockFace.Side]: 'moss_block.png' },
  [BlockKind.Dirt]: { [BlockFace.Side]: 'dirt.png' },
  [BlockKind.RootedDirt]: { [BlockFace.Side]: 'rooted_dirt.png' },
  [BlockKind.Clay]: { [BlockFace.Side]: 'clay.png' },
};

// loads authentic Minecraft block texture if available, falling back to procedural painter
export function getBlockTexture(kind: BlockKind, face: BlockFace): CanvasTexture {
  const file = VANILLA_TEXTURE_FILES[kind]?.[face] ?? VANILLA_TEXTURE_FILES[kind]?.[BlockFace.Side];
  if (file) {
    return loadVanillaTexture(`/assets/minecraft/textures/block/${file}`);
  }
  const spec = BLOCK_TEXTURES[kind][face];
  return createPixelTexture(spec.key, spec.paint);
}
