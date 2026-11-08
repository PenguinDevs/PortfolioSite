import type { CanvasTexture } from 'three';
import { createPixelTexture, pickColour, setPixel } from '../pixelTexture';
import type { PixelPainter, Rng } from '../pixelTexture';
import type { TexelOrigin } from '../propTextures';

// textures for the modelled crafting table. every part samples a small patch of one of
// these, so the origins below say where each kind of patch lives on its texture

export enum CraftingTableTextureKey {
  Planks = 'prop:craftingTable:planks',
  DarkWood = 'prop:craftingTable:darkWood',
  Leather = 'prop:craftingTable:leather',
  Metal = 'prop:craftingTable:metal',
}

// ---------------------------------------------------------------------------
// palettes, all picked by hand
// ---------------------------------------------------------------------------

const PLANK_GRAIN = ['#b98f57', '#ae8650', '#c39a60', '#a37c47'] as const;
const PLANK_HIGHLIGHT = ['#cba468', '#c49d63'] as const;
const PLANK_STREAK = '#94703f';
const PLANK_SEAM = '#6d4f2d';
const KNOT_RING = '#7d5a34';
const KNOT_CORE = '#5b3e22';

const DARK_WOOD = ['#4b3019', '#553720', '#432a15', '#5c3d23'] as const;
const DARK_WOOD_STREAK = '#36220f';
const DARK_WOOD_HIGHLIGHT = '#6a4729';

const LEATHER = ['#b0602b', '#a65826', '#bb6a32', '#9c5023'] as const;
const LEATHER_SCUFF = '#87441d';
const LEATHER_SHEEN = '#c7783c';
const LEATHER_STITCH = '#e3b27a';

const METAL = ['#b9bfc5', '#c4cad0', '#adb3ba'] as const;
const METAL_SHINE = ['#e4e8ec', '#d6dbe0'] as const;
const METAL_DARK = ['#7b828a', '#6c737b', '#858c94'] as const;

// ---------------------------------------------------------------------------
// layout of each texture
// ---------------------------------------------------------------------------

// planks run in horizontal boards: a lighter top row, grain, then a dark seam row
const PLANK_BOARD_HEIGHT = 4;
// a knot painted into the planks, raised knots sample exactly this patch
export const KNOT_ORIGIN: TexelOrigin = { x: 11, y: 5 };
export const KNOT_SIZE = 2;
// grain only patches (highlight row plus grain, no seam row) for raised boards up to 5 x 3 texels
export const PLANK_BOARD_ORIGINS: readonly TexelOrigin[] = [
  { x: 1, y: 8 },
  { x: 6, y: 0 },
  { x: 3, y: 12 },
  { x: 8, y: 4 },
];
// long grain strip for the skirting boards along the bottom of each side, 12 x 2 texels
export const PLANK_SKIRTING_ORIGIN: TexelOrigin = { x: 2, y: 12 };
// the core sides start one row down so the bottom seam lands on the floor
export const PLANK_SIDE_ORIGIN: TexelOrigin = { x: 0, y: 1 };

// dark wood: the first columns have vertical grain for posts, straps and handles,
// the rest has horizontal grain for the trim and grid bars
const DARK_VERTICAL_COLUMNS = 4;
export const DARK_POST_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const DARK_HANDLE_ORIGIN: TexelOrigin = { x: 1, y: 3 };
export const DARK_TRIM_ORIGIN: TexelOrigin = { x: DARK_VERTICAL_COLUMNS, y: 0 };
export const DARK_BAR_ORIGIN: TexelOrigin = { x: DARK_VERTICAL_COLUMNS, y: 5 };

// leather mat with a stitched seam one texel in from the edge
const STITCH_INSET = 1;
export const LEATHER_MAT_ORIGIN: TexelOrigin = { x: 2, y: 1 };
// the mat is notched at the corners around the posts, these two strips fill the sides
export const LEATHER_LEFT_WING_ORIGIN: TexelOrigin = { x: 1, y: 2 };
export const LEATHER_RIGHT_WING_ORIGIN: TexelOrigin = { x: 14, y: 2 };
// drapes and grips take patches from the stitch free middle
export const LEATHER_PLAIN_ORIGINS: readonly TexelOrigin[] = [
  { x: 3, y: 3 },
  { x: 7, y: 4 },
  { x: 5, y: 7 },
  { x: 8, y: 6 },
  { x: 4, y: 5 },
];

// metal: two bright rows along the top, a darker band down the right
const METAL_SHINE_ROWS = 2;
const METAL_DARK_COLUMN = 12;
export const METAL_SHINE_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const METAL_ORIGIN: TexelOrigin = { x: 2, y: METAL_SHINE_ROWS };
export const METAL_DARK_ORIGIN: TexelOrigin = { x: METAL_DARK_COLUMN, y: METAL_SHINE_ROWS };

// ---------------------------------------------------------------------------
// painting helpers
// ---------------------------------------------------------------------------

function fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, width, height);
}

function fillNoise(
  ctx: CanvasRenderingContext2D,
  rand: Rng,
  palette: readonly string[],
  x: number,
  y: number,
  width: number,
  height: number,
) {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      setPixel(ctx, col, row, pickColour(palette, rand));
    }
  }
}

// ---------------------------------------------------------------------------
// painters
// ---------------------------------------------------------------------------

const paintPlanks: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, PLANK_GRAIN, 0, 0, size, size);
  for (let boardTop = 0; boardTop < size; boardTop += PLANK_BOARD_HEIGHT) {
    // light top edge so each board looks slightly rounded over
    fillNoise(ctx, rand, PLANK_HIGHLIGHT, 0, boardTop, size, 1);
    fillRect(ctx, 0, boardTop + PLANK_BOARD_HEIGHT - 1, size, 1, PLANK_SEAM);

    // butt joint where two boards meet, staggered per board
    const jointX = 2 + Math.floor(rand() * (size - 4));
    fillRect(ctx, jointX, boardTop, 1, PLANK_BOARD_HEIGHT - 1, PLANK_SEAM);

    const streakLength = 2 + Math.floor(rand() * 4);
    const streakX = Math.floor(rand() * (size - streakLength));
    const streakY = boardTop + 1 + Math.floor(rand() * (PLANK_BOARD_HEIGHT - 2));
    fillRect(ctx, streakX, streakY, streakLength, 1, PLANK_STREAK);
  }

  // knot with a ring of darker grain around it
  const { x, y } = KNOT_ORIGIN;
  fillRect(ctx, x - 1, y, 1, KNOT_SIZE, KNOT_RING);
  fillRect(ctx, x + KNOT_SIZE, y, 1, KNOT_SIZE, KNOT_RING);
  fillRect(ctx, x, y - 1, KNOT_SIZE, 1, KNOT_RING);
  fillRect(ctx, x, y, KNOT_SIZE, KNOT_SIZE, KNOT_CORE);
  setPixel(ctx, x + 1, y, KNOT_RING);
};

const paintDarkWood: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, DARK_WOOD, 0, 0, size, size);

  // vertical grain: each column gets a broken streak
  for (let col = 0; col < DARK_VERTICAL_COLUMNS; col++) {
    const start = Math.floor(rand() * size);
    const length = 3 + Math.floor(rand() * 6);
    for (let row = start; row < start + length; row++) {
      setPixel(ctx, col, row % size, col % 2 === 0 ? DARK_WOOD_STREAK : DARK_WOOD_HIGHLIGHT);
    }
  }

  // horizontal grain on the rest
  const horizontalWidth = size - DARK_VERTICAL_COLUMNS;
  for (let row = 0; row < size; row++) {
    if (rand() < 0.35) continue;
    const length = 2 + Math.floor(rand() * 5);
    const start = DARK_VERTICAL_COLUMNS + Math.floor(rand() * (horizontalWidth - length));
    fillRect(ctx, start, row, length, 1, rand() < 0.7 ? DARK_WOOD_STREAK : DARK_WOOD_HIGHLIGHT);
  }
};

const LEATHER_SCUFF_COUNT = 9;
const LEATHER_SHEEN_COUNT = 7;
const METAL_GLINT_COUNT = 5;

const paintLeather: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, LEATHER, 0, 0, size, size);

  for (let i = 0; i < LEATHER_SCUFF_COUNT; i++) {
    const x = Math.floor(rand() * (size - 1));
    const y = Math.floor(rand() * size);
    fillRect(ctx, x, y, rand() < 0.5 ? 2 : 1, 1, LEATHER_SCUFF);
  }
  for (let i = 0; i < LEATHER_SHEEN_COUNT; i++) {
    setPixel(ctx, Math.floor(rand() * size), Math.floor(rand() * size), LEATHER_SHEEN);
  }

  // dashed stitching around the mat, every other texel
  const far = size - 1 - STITCH_INSET;
  for (let i = STITCH_INSET + 1; i < far; i += 2) {
    setPixel(ctx, i, STITCH_INSET, LEATHER_STITCH);
    setPixel(ctx, i, far, LEATHER_STITCH);
    setPixel(ctx, STITCH_INSET, i, LEATHER_STITCH);
    setPixel(ctx, far, i, LEATHER_STITCH);
  }
};

const paintMetal: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, METAL, 0, 0, size, size);
  fillNoise(ctx, rand, METAL_SHINE, 0, 0, size, METAL_SHINE_ROWS);
  fillNoise(ctx, rand, METAL_DARK, METAL_DARK_COLUMN, METAL_SHINE_ROWS, size - METAL_DARK_COLUMN, size - METAL_SHINE_ROWS);
  // the odd bright glint on the plain metal
  for (let i = 0; i < METAL_GLINT_COUNT; i++) {
    const x = Math.floor(rand() * METAL_DARK_COLUMN);
    const y = METAL_SHINE_ROWS + Math.floor(rand() * (size - METAL_SHINE_ROWS));
    setPixel(ctx, x, y, METAL_SHINE[0]);
  }
};

const PAINTERS: Readonly<Record<CraftingTableTextureKey, PixelPainter>> = {
  [CraftingTableTextureKey.Planks]: paintPlanks,
  [CraftingTableTextureKey.DarkWood]: paintDarkWood,
  [CraftingTableTextureKey.Leather]: paintLeather,
  [CraftingTableTextureKey.Metal]: paintMetal,
};

// cached per key, only call this on the client inside the Canvas
export function getCraftingTableTexture(key: CraftingTableTextureKey): CanvasTexture {
  return createPixelTexture(key, PAINTERS[key]);
}
