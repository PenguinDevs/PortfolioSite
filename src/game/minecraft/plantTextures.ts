import { RepeatWrapping } from 'three';
import type { CanvasTexture } from 'three';
import { createPixelTexture, hashString, loadVanillaTexture, pickColour, seededRandom, setPixel } from './pixelTexture';
import type { PixelPainter, Rng } from './pixelTexture';

// every lush cave plant texture, the prefix keeps them apart from block and prop textures
export enum PlantTexture {
  AzaleaLeaves = 'plant:azaleaLeaves',
  FloweringAzaleaLeaves = 'plant:floweringAzaleaLeaves',
  AzaleaStem = 'plant:azaleaStem',
  MossCarpet = 'plant:mossCarpet',
  ShortGrass = 'plant:shortGrass',
  TallGrassLower = 'plant:tallGrassLower',
  TallGrassUpper = 'plant:tallGrassUpper',
  CaveVines = 'plant:caveVines',
  CaveVinesTip = 'plant:caveVinesTip',
  GlowBerries = 'plant:glowBerries',
  SporeBlossomBase = 'plant:sporeBlossomBase',
  SporeBlossomFlower = 'plant:sporeBlossomFlower',
  BigDripleafTop = 'plant:bigDripleafTop',
  BigDripleafStem = 'plant:bigDripleafStem',
  SmallDripleaf = 'plant:smallDripleaf',
  HangingRoots = 'plant:hangingRoots',
}

type Texel = readonly [x: number, y: number];

// the four neighbours of a texel, used for little plus shaped flowers
const PLUS_OFFSETS: readonly Texel[] = [[0, -1], [-1, 0], [1, 0], [0, 1]];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// picks along a dark to light palette by t (0 to 1), with a bit of noise so the bands don't look too clean
function shadeColour(palette: readonly string[], t: number, rand: Rng, noise = 0.8): string {
  const index = Math.floor(t * (palette.length - 1) + 0.5 + (rand() - 0.5) * noise);
  return palette[clamp(index, 0, palette.length - 1)];
}

// azalea leaves

const AZALEA_LEAF_PALETTE = ['#3d6620', '#4a7727', '#58882f', '#669838', '#75a742', '#88b850'] as const;
const AZALEA_PETAL_PALETTE = ['#b9488f', '#cf62a8', '#e384c2'] as const;
const AZALEA_FLOWER_CENTRE = '#f7cde6';
// roughly one texel in eleven is see-through, enough to read as leaves without looking threadbare
const AZALEA_LEAF_GAP_CHANCE = 0.09;
// darker hollows and sunlit tips that break the noise up into clumps
const AZALEA_LEAF_CLUMPS = 9;
// flowers sit on a jittered grid so both halves of the texture get some, the sides only show the top half
const AZALEA_FLOWER_COLUMNS = 3;
const AZALEA_FLOWER_ROWS = 2;
const AZALEA_FLOWER_COLUMN_STEP = 5;
const AZALEA_FLOWER_ROW_STEP = 8;

function paintAzaleaLeaves(flowering: boolean): PixelPainter {
  return (ctx, rand, size) => {
    const gaps = new Uint8Array(size * size);
    for (let i = 0; i < gaps.length; i++) gaps[i] = rand() < AZALEA_LEAF_GAP_CHANCE ? 1 : 0;

    const paintLeaf = (x: number, y: number, colour: string) => {
      // clumps can spill one texel past the right and bottom edges
      if (x < size && y < size && !gaps[y * size + x]) setPixel(ctx, x, y, colour);
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) paintLeaf(x, y, pickColour(AZALEA_LEAF_PALETTE, rand));
    }

    for (let i = 0; i < AZALEA_LEAF_CLUMPS; i++) {
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      const colour = rand() < 0.5 ? AZALEA_LEAF_PALETTE[0] : AZALEA_LEAF_PALETTE[AZALEA_LEAF_PALETTE.length - 1];
      paintLeaf(x, y, colour);
      paintLeaf(x + 1, y, colour);
      paintLeaf(x, y + 1, colour);
    }

    if (!flowering) return;

    // flowers fill any gap they land on, blossoms are solid
    for (let column = 0; column < AZALEA_FLOWER_COLUMNS; column++) {
      for (let row = 0; row < AZALEA_FLOWER_ROWS; row++) {
        const cx = 2 + column * AZALEA_FLOWER_COLUMN_STEP + Math.floor(rand() * 2);
        const cy = 2 + row * AZALEA_FLOWER_ROW_STEP + Math.floor(rand() * 4);
        for (const [dx, dy] of PLUS_OFFSETS) setPixel(ctx, cx + dx, cy + dy, pickColour(AZALEA_PETAL_PALETTE, rand));
        setPixel(ctx, cx, cy, AZALEA_FLOWER_CENTRE);
      }
    }
  };
}

// azalea stem, only rows 8 and below show because the leaf cube covers the top half

const AZALEA_BARK_PALETTE = ['#4f361d', '#644526', '#7a5631', '#8d673b'] as const;
const AZALEA_STEM_LEAF = '#58882f';
const AZALEA_STEM_TEXELS: readonly Texel[] = [
  // trunk
  [7, 15], [8, 15], [7, 14], [8, 14], [7, 13], [8, 13], [7, 12], [8, 12], [7, 11], [8, 11],
  // left branch
  [6, 10], [6, 9], [5, 8], [5, 7], [4, 6],
  // right branch
  [9, 10], [9, 9], [10, 8], [10, 7], [11, 6],
  // middle shoot
  [8, 10], [8, 9], [7, 8], [7, 7],
];
const AZALEA_STEM_LEAF_TEXELS: readonly Texel[] = [[4, 9], [3, 8], [11, 9], [12, 8]];

const paintAzaleaStem: PixelPainter = (ctx, rand) => {
  for (const [x, y] of AZALEA_STEM_TEXELS) setPixel(ctx, x, y, pickColour(AZALEA_BARK_PALETTE, rand));
  for (const [x, y] of AZALEA_STEM_LEAF_TEXELS) setPixel(ctx, x, y, AZALEA_STEM_LEAF);
};

// moss carpet, tiles seamlessly because the clump noise wraps around the edges

const MOSS_PALETTE = ['#3a6321', '#467229', '#528131', '#5f8f38', '#6d9d41', '#7dac4c'] as const;
const MOSS_SPECK = '#97c35f';
const MOSS_SPECK_CHANCE = 0.04;
// averaging squashes the noise towards the middle, this stretches it back out before picking a colour
const MOSS_CONTRAST = 2.6;

const paintMoss: PixelPainter = (ctx, rand, size) => {
  const noise = new Float32Array(size * size);
  for (let i = 0; i < noise.length; i++) noise[i] = rand();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let total = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          total += noise[((y + dy + size) % size) * size + ((x + dx + size) % size)];
        }
      }
      const value = (total / 9 - 0.5) * MOSS_CONTRAST + 0.5;
      const index = clamp(Math.floor(value * MOSS_PALETTE.length), 0, MOSS_PALETTE.length - 1);
      setPixel(ctx, x, y, rand() < MOSS_SPECK_CHANCE ? MOSS_SPECK : MOSS_PALETTE[index]);
    }
  }
};

// grass

const GRASS_PALETTE = ['#4f7a39', '#5f8a45', '#6f9a55', '#80ab62', '#8eb971', '#a3c987'] as const;
// rows a blade climbs before it may step sideways
const GRASS_LEAN_STEP = 4;
// wide blades are two texels across for this share of their height
const GRASS_WIDE_SHARE = 0.4;
const SHORT_GRASS_BLADES = 10;
const SHORT_GRASS_MIN_HEIGHT = 4;
const SHORT_GRASS_MAX_HEIGHT = 13;
// tall grass is laid out on one 16 x 32 canvas so the two halves line up, then split into two textures
const TALL_GRASS_LAYOUT_KEY = 'plant:tallGrassLayout';
const TALL_GRASS_VIRTUAL_HEIGHT = 32;
const TALL_GRASS_LONG_BLADES = 8;
const TALL_GRASS_LONG_MIN_HEIGHT = 20;
const TALL_GRASS_LONG_MAX_HEIGHT = 31;
const TALL_GRASS_SHORT_BLADES = 5;
const TALL_GRASS_SHORT_MIN_HEIGHT = 6;
const TALL_GRASS_SHORT_MAX_HEIGHT = 14;

interface GrassBlade {
  x: number;
  height: number;
  // -1 leans left, 1 leans right
  lean: number;
  wide: boolean;
}

function makeGrassBlades(rand: Rng, count: number, minHeight: number, maxHeight: number, size: number): GrassBlade[] {
  // spread the roots evenly across the tuft, a texel in from each edge
  const span = size - 2;
  return Array.from({ length: count }, (_, i) => ({
    x: 1 + Math.floor(((i + rand()) * span) / count),
    height: minHeight + Math.floor(rand() * (maxHeight - minHeight + 1)),
    lean: Math.floor(rand() * 3) - 1,
    wide: rand() < 0.5,
  }));
}

// draws blades growing up from the bottom row of a virtual canvas virtualHeight texels tall,
// rowOffset picks which rows of it land on this texture
function paintGrassBlades(
  ctx: CanvasRenderingContext2D,
  rand: Rng,
  size: number,
  blades: readonly GrassBlade[],
  virtualHeight: number,
  rowOffset: number,
) {
  for (const blade of blades) {
    let x = blade.x;
    for (let i = 0; i < blade.height; i++) {
      if (i > 0 && i % GRASS_LEAN_STEP === 0) x = clamp(x + blade.lean, 0, size - 1);
      const y = virtualHeight - 1 - i - rowOffset;
      if (y < 0 || y >= size) continue;
      const t = i / blade.height;
      setPixel(ctx, x, y, shadeColour(GRASS_PALETTE, t, rand));
      if (blade.wide && t < GRASS_WIDE_SHARE && x + 1 < size) setPixel(ctx, x + 1, y, shadeColour(GRASS_PALETTE, t * 0.6, rand));
    }
  }
}

const paintShortGrass: PixelPainter = (ctx, rand, size) => {
  const blades = makeGrassBlades(rand, SHORT_GRASS_BLADES, SHORT_GRASS_MIN_HEIGHT, SHORT_GRASS_MAX_HEIGHT, size);
  paintGrassBlades(ctx, rand, size, blades, size, 0);
};

function makeTallGrassBlades(size: number): GrassBlade[] {
  // seeded from a fixed key rather than the texture key so both halves get the same layout
  const layoutRand = seededRandom(hashString(TALL_GRASS_LAYOUT_KEY));
  return [
    ...makeGrassBlades(layoutRand, TALL_GRASS_LONG_BLADES, TALL_GRASS_LONG_MIN_HEIGHT, TALL_GRASS_LONG_MAX_HEIGHT, size),
    ...makeGrassBlades(layoutRand, TALL_GRASS_SHORT_BLADES, TALL_GRASS_SHORT_MIN_HEIGHT, TALL_GRASS_SHORT_MAX_HEIGHT, size),
  ];
}

function paintTallGrassHalf(upper: boolean): PixelPainter {
  return (ctx, rand, size) => {
    const rowOffset = upper ? 0 : TALL_GRASS_VIRTUAL_HEIGHT - size;
    paintGrassBlades(ctx, rand, size, makeTallGrassBlades(size), TALL_GRASS_VIRTUAL_HEIGHT, rowOffset);
  };
}

// cave vines

const CAVE_VINE_PALETTE = ['#36501b', '#456524', '#557a2c', '#679036', '#7aa441'] as const;
// stem column per row, starting and ending on the same column so stacked cells join up
const CAVE_VINE_STEM_X = [7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7] as const;
// rows where a leaf sprouts and which side it grows towards
const CAVE_VINE_LEAVES: readonly { row: number; side: -1 | 1 }[] = [
  { row: 2, side: -1 },
  { row: 6, side: 1 },
  { row: 10, side: -1 },
  { row: 13, side: 1 },
];
// a small upturned leaf relative to where it meets the stem, drawn for the left and mirrored for the right
const CAVE_VINE_LEAF_SHAPE: readonly Texel[] = [[-1, 0], [-2, 0], [-2, -1], [-3, -1], [-3, -2]];
// the last row of stem on the tip piece, it curls off just below
const CAVE_VINE_TIP_END_ROW = 11;

function paintCaveVines(tip: boolean): PixelPainter {
  return (ctx, rand, size) => {
    const lastRow = tip ? CAVE_VINE_TIP_END_ROW : size - 1;
    for (let y = 0; y <= lastRow; y++) {
      setPixel(ctx, CAVE_VINE_STEM_X[y], y, CAVE_VINE_PALETTE[1 + Math.floor(rand() * 2)]);
    }
    if (tip) setPixel(ctx, CAVE_VINE_STEM_X[lastRow] - 1, lastRow + 1, CAVE_VINE_PALETTE[2]);

    for (const { row, side } of CAVE_VINE_LEAVES) {
      if (row > lastRow) continue;
      const stemX = CAVE_VINE_STEM_X[row];
      CAVE_VINE_LEAF_SHAPE.forEach(([dx, dy], i) => {
        const t = i / (CAVE_VINE_LEAF_SHAPE.length - 1);
        setPixel(ctx, stemX - dx * side, row + dy, shadeColour(CAVE_VINE_PALETTE, 0.4 + t * 0.6, rand));
      });
    }
  };
}

// glow berries, painted on their own so they can use the glowing material

const GLOW_BERRY_SHADE = '#d06d14';
const GLOW_BERRY_BODY = '#f5a020';
const GLOW_BERRY_LIGHT = '#ffc947';
const GLOW_BERRY_HIGHLIGHT = '#fff0a6';
// each berry hangs just under one of the vine leaves
const GLOW_BERRY_CENTRES: readonly Texel[] = [[4, 4], [11, 8], [4, 12]];

const paintGlowBerries: PixelPainter = (ctx) => {
  for (const [cx, cy] of GLOW_BERRY_CENTRES) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const corner = Math.abs(dx) + Math.abs(dy) === 2;
        setPixel(ctx, cx + dx, cy + dy, corner ? GLOW_BERRY_SHADE : GLOW_BERRY_BODY);
      }
    }
    setPixel(ctx, cx - 1, cy, GLOW_BERRY_LIGHT);
    setPixel(ctx, cx, cy - 1, GLOW_BERRY_LIGHT);
    setPixel(ctx, cx, cy, GLOW_BERRY_HIGHLIGHT);
  }
};

// spore blossom

const SPORE_LEAF_PALETTE = ['#456f2b', '#558236', '#679643', '#7aa94f'] as const;
const SPORE_LEAF_HEART = '#3b5f25';
const SPORE_LEAF_COUNT = 6;
// leaves reach between these radii in texels, lobes push them out to the max
const SPORE_LEAF_MIN_REACH = 2.5;
const SPORE_LEAF_MAX_REACH = 7.6;
const SPORE_LEAF_HEART_RADIUS = 1.6;

const SPORE_STALK = '#4c7a2e';
const SPORE_PINK_PALETTE = ['#a63a7c', '#bf5596', '#d571ad', '#e692c4', '#f2b6d9'] as const;
const SPORE_FLOWER_TOP_ROW = 2;
const SPORE_FLOWER_BOTTOM_ROW = 10;
const SPORE_FLOWER_MIN_HALF_WIDTH = 1.5;
const SPORE_FLOWER_MAX_HALF_WIDTH = 6.5;
// distance from the centre line where the darker petal folds run
const SPORE_FLOWER_FOLD_OFFSET = 2.5;
const SPORE_PETAL_TIP_SPACING = 3;

const paintSporeBlossomBase: PixelPainter = (ctx, rand, size) => {
  const centre = size / 2;
  const reachRange = SPORE_LEAF_MAX_REACH - SPORE_LEAF_MIN_REACH;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - centre;
      const dy = y + 0.5 - centre;
      const radius = Math.hypot(dx, dy);
      const lobe = 0.5 + 0.5 * Math.cos(SPORE_LEAF_COUNT * Math.atan2(dy, dx));
      const reach = SPORE_LEAF_MIN_REACH + reachRange * Math.pow(lobe, 0.7);
      if (radius > reach) continue;
      const colour = radius < SPORE_LEAF_HEART_RADIUS ? SPORE_LEAF_HEART : shadeColour(SPORE_LEAF_PALETTE, radius / reach, rand);
      setPixel(ctx, x, y, colour);
    }
  }
};

const paintSporeBlossomFlower: PixelPainter = (ctx, rand, size) => {
  const centre = size / 2;
  for (let y = 0; y < SPORE_FLOWER_TOP_ROW; y++) {
    setPixel(ctx, centre - 1, y, SPORE_STALK);
    setPixel(ctx, centre, y, SPORE_STALK);
  }

  const rows = SPORE_FLOWER_BOTTOM_ROW - SPORE_FLOWER_TOP_ROW;
  for (let y = SPORE_FLOWER_TOP_ROW; y <= SPORE_FLOWER_BOTTOM_ROW; y++) {
    const t = (y - SPORE_FLOWER_TOP_ROW) / rows;
    const halfWidth = SPORE_FLOWER_MIN_HALF_WIDTH + t * (SPORE_FLOWER_MAX_HALF_WIDTH - SPORE_FLOWER_MIN_HALF_WIDTH);
    for (let x = 0; x < size; x++) {
      const offset = Math.abs(x + 0.5 - centre);
      if (offset > halfWidth) continue;
      const fold = offset === SPORE_FLOWER_FOLD_OFFSET && t > 0.25;
      setPixel(ctx, x, y, fold ? SPORE_PINK_PALETTE[0] : shadeColour(SPORE_PINK_PALETTE, 0.2 + t * 0.6, rand));
    }
  }

  // scalloped petal tips along the bottom edge
  for (let x = 0; x < size; x++) {
    if (Math.abs(x + 0.5 - centre) > SPORE_FLOWER_MAX_HALF_WIDTH) continue;
    if (x % SPORE_PETAL_TIP_SPACING === 1) setPixel(ctx, x, SPORE_FLOWER_BOTTOM_ROW + 1, SPORE_PINK_PALETTE[4]);
  }
};

// big dripleaf

const DRIPLEAF_LEAF_PALETTE = ['#5a8a2e', '#649636', '#6fa13e', '#79aa46'] as const;
const DRIPLEAF_EDGE = '#466f22';
const DRIPLEAF_VEIN = '#90bf5a';
const DRIPLEAF_HEART = '#3c6420';
// the dark centre where the stem meets the leaf, in texels from the middle
const DRIPLEAF_HEART_RADIUS = 1;

const paintBigDripleafTop: PixelPainter = (ctx, rand, size) => {
  const centre = size / 2;
  const last = size - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - centre;
      const dy = y + 0.5 - centre;
      let colour: string;
      if (x === 0 || y === 0 || x === last || y === last) colour = DRIPLEAF_EDGE;
      else if (Math.abs(dx) < DRIPLEAF_HEART_RADIUS && Math.abs(dy) < DRIPLEAF_HEART_RADIUS) colour = DRIPLEAF_HEART;
      // a midrib down the leaf plus two diagonal veins
      else if (dx === -0.5 || Math.abs(dx) === Math.abs(dy)) colour = DRIPLEAF_VEIN;
      else colour = pickColour(DRIPLEAF_LEAF_PALETTE, rand);
      setPixel(ctx, x, y, colour);
    }
  }
};

const DRIPLEAF_STEM_PALETTE = ['#3f6420', '#4c7526', '#5a862e'] as const;
// joints where the stem gets a little thicker, it tiles every block
const DRIPLEAF_STEM_NODE_ROWS = [4, 12] as const;
const DRIPLEAF_STEM_NUB: readonly Texel[] = [[9, 11], [10, 10]];

const paintBigDripleafStem: PixelPainter = (ctx, rand, size) => {
  for (let y = 0; y < size; y++) {
    setPixel(ctx, 7, y, DRIPLEAF_STEM_PALETTE[Math.floor(rand() * 2)]);
    setPixel(ctx, 8, y, DRIPLEAF_STEM_PALETTE[1 + Math.floor(rand() * 2)]);
  }
  for (const row of DRIPLEAF_STEM_NODE_ROWS) {
    setPixel(ctx, 6, row, DRIPLEAF_STEM_PALETTE[0]);
    setPixel(ctx, 9, row, DRIPLEAF_STEM_PALETTE[0]);
  }
  for (const [x, y] of DRIPLEAF_STEM_NUB) setPixel(ctx, x, y, DRIPLEAF_STEM_PALETTE[2]);
};

// small dripleaf, two little leaves on stems of different heights

interface SmallDripleafSprig {
  stemX: number;
  // the first stem row under the leaf, the stem runs from here to the bottom
  stemTop: number;
  // [row, first x, last x] spans making up the leaf, top row first
  spans: readonly (readonly [number, number, number])[];
}

const SMALL_DRIPLEAF_SPRIGS: readonly SmallDripleafSprig[] = [
  { stemX: 5, stemTop: 6, spans: [[3, 2, 6], [4, 1, 8], [5, 2, 8]] },
  { stemX: 10, stemTop: 9, spans: [[6, 10, 13], [7, 9, 15], [8, 9, 14]] },
];
const SMALL_DRIPLEAF_BASE_LEAVES: readonly Texel[] = [[4, 15], [3, 14], [11, 15], [12, 14]];

const paintSmallDripleaf: PixelPainter = (ctx, rand, size) => {
  for (const { stemX, stemTop, spans } of SMALL_DRIPLEAF_SPRIGS) {
    for (let y = stemTop; y < size; y++) setPixel(ctx, stemX, y, DRIPLEAF_STEM_PALETTE[Math.floor(rand() * 2)]);
    spans.forEach(([row, firstX, lastX], i) => {
      const t = 1 - i / (spans.length - 1);
      for (let x = firstX; x <= lastX; x++) setPixel(ctx, x, row, shadeColour(DRIPLEAF_LEAF_PALETTE, t, rand));
    });
    // the middle row gets a vein where it meets the stem
    setPixel(ctx, stemX, spans[1][0], DRIPLEAF_EDGE);
  }
  for (const [x, y] of SMALL_DRIPLEAF_BASE_LEAVES) setPixel(ctx, x, y, DRIPLEAF_LEAF_PALETTE[1]);
};

// hanging roots

const ROOT_PALETTE = ['#9c7b52', '#b08e63', '#c4a276', '#d6b98d', '#e5cda6'] as const;
const ROOT_COUNT = 6;
const ROOT_MIN_LENGTH = 7;
const ROOT_MAX_LENGTH = 15;
const ROOT_WIGGLE_CHANCE = 0.28;
// roots are two texels thick for this many rows where they leave the ceiling
const ROOT_THICK_ROWS = 2;

const paintHangingRoots: PixelPainter = (ctx, rand, size) => {
  const span = size - 3;
  for (let i = 0; i < ROOT_COUNT; i++) {
    let x = 1 + Math.floor(((i + rand() * 0.7) * span) / ROOT_COUNT);
    const length = ROOT_MIN_LENGTH + Math.floor(rand() * (ROOT_MAX_LENGTH - ROOT_MIN_LENGTH + 1));
    for (let y = 0; y < length; y++) {
      if (y > 0 && rand() < ROOT_WIGGLE_CHANCE) x = clamp(x + (rand() < 0.5 ? -1 : 1), 0, size - 1);
      // roots get paler towards their tips
      setPixel(ctx, x, y, shadeColour(ROOT_PALETTE, y / length, rand));
      if (y < ROOT_THICK_ROWS && x + 1 < size) setPixel(ctx, x + 1, y, ROOT_PALETTE[0]);
    }
  }
};

const PLANT_PAINTERS: Record<PlantTexture, PixelPainter> = {
  [PlantTexture.AzaleaLeaves]: paintAzaleaLeaves(false),
  [PlantTexture.FloweringAzaleaLeaves]: paintAzaleaLeaves(true),
  [PlantTexture.AzaleaStem]: paintAzaleaStem,
  [PlantTexture.MossCarpet]: paintMoss,
  [PlantTexture.ShortGrass]: paintShortGrass,
  [PlantTexture.TallGrassLower]: paintTallGrassHalf(false),
  [PlantTexture.TallGrassUpper]: paintTallGrassHalf(true),
  [PlantTexture.CaveVines]: paintCaveVines(false),
  [PlantTexture.CaveVinesTip]: paintCaveVines(true),
  [PlantTexture.GlowBerries]: paintGlowBerries,
  [PlantTexture.SporeBlossomBase]: paintSporeBlossomBase,
  [PlantTexture.SporeBlossomFlower]: paintSporeBlossomFlower,
  [PlantTexture.BigDripleafTop]: paintBigDripleafTop,
  [PlantTexture.BigDripleafStem]: paintBigDripleafStem,
  [PlantTexture.SmallDripleaf]: paintSmallDripleaf,
  [PlantTexture.HangingRoots]: paintHangingRoots,
};

const LUSH_GRASS_TINT = '#8eb971';

const VANILLA_PLANT_FILES: Partial<Record<PlantTexture, { file: string; tint?: string }>> = {
  [PlantTexture.AzaleaLeaves]: { file: 'azalea_side.png' },
  [PlantTexture.FloweringAzaleaLeaves]: { file: 'flowering_azalea_side.png' },
  [PlantTexture.AzaleaStem]: { file: 'azalea_plant.png' },
  [PlantTexture.MossCarpet]: { file: 'moss_block.png' },
  [PlantTexture.ShortGrass]: { file: 'short_grass.png', tint: LUSH_GRASS_TINT },
  [PlantTexture.TallGrassLower]: { file: 'tall_grass_bottom.png', tint: LUSH_GRASS_TINT },
  [PlantTexture.TallGrassUpper]: { file: 'tall_grass_top.png', tint: LUSH_GRASS_TINT },
  [PlantTexture.CaveVines]: { file: 'cave_vines_plant.png' },
  [PlantTexture.CaveVinesTip]: { file: 'cave_vines.png' },
  [PlantTexture.GlowBerries]: { file: 'cave_vines_lit.png' },
  [PlantTexture.SporeBlossomBase]: { file: 'spore_blossom_base.png' },
  [PlantTexture.SporeBlossomFlower]: { file: 'spore_blossom.png' },
  [PlantTexture.BigDripleafTop]: { file: 'big_dripleaf_top.png' },
  [PlantTexture.BigDripleafStem]: { file: 'big_dripleaf_stem.png' },
  [PlantTexture.SmallDripleaf]: { file: 'small_dripleaf_top.png' },
  [PlantTexture.HangingRoots]: { file: 'hanging_roots.png' },
};

// textures stretched over more than one block wrap around instead of clamping
const REPEATING_TEXTURES: ReadonlySet<PlantTexture> = new Set([PlantTexture.MossCarpet, PlantTexture.BigDripleafStem]);

// cached and shared like every pixel texture, so never dispose the result.
// client only, call it inside the Canvas
export function getPlantTexture(key: PlantTexture): CanvasTexture {
  const vanilla = VANILLA_PLANT_FILES[key];
  if (vanilla) {
    return loadVanillaTexture(
      `/assets/minecraft/textures/block/${vanilla.file}`,
      vanilla.tint,
      REPEATING_TEXTURES.has(key),
    );
  }
  const texture = createPixelTexture(key, PLANT_PAINTERS[key]);
  if (REPEATING_TEXTURES.has(key) && texture.wrapS !== RepeatWrapping) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
  }
  return texture;
}
