import type { CanvasTexture } from 'three';
import { createPixelTexture, pickColour, setPixel } from '../pixelTexture';
import type { PixelPainter, Rng } from '../pixelTexture';
import type { TexelOrigin } from '../propTextures';

// textures for the modelled crafting table. every part samples a small patch of one of
// these, so the origins below say where each kind of patch lives on its texture

export enum CraftingTableTextureKey {
  Planks = 'prop:craftingTable:planks',
  Panel = 'prop:craftingTable:panel',
  Trim = 'prop:craftingTable:trim',
  Bar = 'prop:craftingTable:bar',
  Post = 'prop:craftingTable:post',
  Metal = 'prop:craftingTable:metal',
}

// ---------------------------------------------------------------------------
// palettes, all picked by hand
// ---------------------------------------------------------------------------

// light warm oak for the sides, the work surface a shade lighter again
const PLANK_GRAIN = ['#c49a5e', '#b98f55', '#cfa66a', '#ad874f'] as const;
const PLANK_STREAK = '#a07a47';
const PLANK_SEAM = '#80603a';
const PLANK_NAIL = '#6f5333';

const PANEL_GRAIN = ['#d6b07a', '#cca671', '#dcb983', '#c79f68'] as const;
const PANEL_STREAK = '#bc955f';
const PANEL_SEAM = '#a88152';

// medium dark brown edging, the grid bars a little darker so they stand out on the panel
const TRIM_WOOD = ['#76502e', '#6e4a2a', '#7d5734', '#684627'] as const;
const TRIM_STREAK = '#5e3f23';
const BAR_WOOD = ['#5d4024', '#553a20', '#634628'] as const;
const BAR_STREAK = '#4b331c';

const POST_WOOD = ['#6e4a2a', '#76502e', '#664426'] as const;
const POST_STREAK = '#573a20';
const POST_HIGHLIGHT = '#85603a';

const METAL = ['#b9bfc5', '#c4cad0', '#adb3ba'] as const;
const METAL_SHINE = ['#e4e8ec', '#d6dbe0'] as const;
const METAL_DARK = ['#7b828a', '#6c737b', '#858c94'] as const;

// ---------------------------------------------------------------------------
// layout of each texture
// ---------------------------------------------------------------------------

// boards of uneven heights, each ending in a seam row. the sides of the body sample from
// row 2, so the bottom seam sits on the floor and the top row hides under the trim
const PLANK_BOARD_HEIGHTS = [4, 3, 5, 4] as const;
export const PLANK_SIDE_ORIGIN: TexelOrigin = { x: 0, y: 2 };
// seam free patches lining up with the boards painted on the body, so a raised board
// looks like that board pushed out a texel
export const PLANK_MIDDLE_BOARD_ORIGIN: TexelOrigin = { x: 1, y: 7 };
export const PLANK_UPPER_BOARD_ORIGIN: TexelOrigin = { x: 3, y: 4 };
export const PLANK_LOWER_BOARD_ORIGIN: TexelOrigin = { x: 8, y: 12 };

// work surface boards run front to back. the panel samples 12 x 12 from texel 1, 1, which puts
// its seams evenly either side of the middle
const PANEL_BOARD_WIDTH = 4;
export const PANEL_ORIGIN: TexelOrigin = { x: 1, y: 1 };

// the trim and the grid bars each fill a whole texture, so even the 14 texel long grid
// bars sample real grain along their full length instead of running off the edge
export const TRIM_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const BAR_ORIGIN: TexelOrigin = { x: 0, y: 0 };

export const POST_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const HANDLE_ORIGIN: TexelOrigin = { x: 5, y: 3 };

// metal: two bright rows along the top, a darker band down the right
const METAL_SHINE_ROWS = 2;
const METAL_DARK_COLUMN = 12;
const METAL_GLINT_COUNT = 5;
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

// a few short grain streaks running along the rows of a rectangle
function streakRows(
  ctx: CanvasRenderingContext2D,
  rand: Rng,
  colour: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  for (let row = y; row < y + height; row++) {
    if (rand() < 0.4) continue;
    const length = 2 + Math.floor(rand() * 4);
    const start = x + Math.floor(rand() * (width - length));
    fillRect(ctx, start, row, length, 1, colour);
  }
}

// ---------------------------------------------------------------------------
// painters
// ---------------------------------------------------------------------------

// horizontal boards with a seam under each, one butt joint per board with a nail either
// side of it, joints staggered so no two line up
const paintPlanks: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, PLANK_GRAIN, 0, 0, size, size);

  let boardTop = 0;
  let lastJoint = -1;
  for (const height of PLANK_BOARD_HEIGHTS) {
    const grainRows = height - 1;
    fillRect(ctx, 0, boardTop + grainRows, size, 1, PLANK_SEAM);
    streakRows(ctx, rand, PLANK_STREAK, 0, boardTop, size, grainRows);

    let joint = 3 + Math.floor(rand() * (size - 6));
    if (Math.abs(joint - lastJoint) < 4) joint = (joint + size / 2) % size;
    lastJoint = joint;
    fillRect(ctx, joint, boardTop, 1, grainRows, PLANK_SEAM);

    const nailRow = boardTop + Math.floor(grainRows / 2);
    setPixel(ctx, joint - 1, nailRow, PLANK_NAIL);
    setPixel(ctx, joint + 1, nailRow, PLANK_NAIL);
    boardTop += height;
  }
};

// boards running top to bottom of the canvas, which is front to back on the table
const paintPanel: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, PANEL_GRAIN, 0, 0, size, size);
  for (let col = 0; col < size; col++) {
    if (col % PANEL_BOARD_WIDTH === PANEL_BOARD_WIDTH - 1) {
      fillRect(ctx, col, 0, 1, size, PANEL_SEAM);
      continue;
    }
    if (rand() < 0.5) continue;
    const length = 2 + Math.floor(rand() * 5);
    fillRect(ctx, col, Math.floor(rand() * (size - length)), 1, length, PANEL_STREAK);
  }
};

const paintTrim: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, TRIM_WOOD, 0, 0, size, size);
  streakRows(ctx, rand, TRIM_STREAK, 0, 0, size, size);
};

// a little darker than the trim so the grid stands out on the panel
const paintBar: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, BAR_WOOD, 0, 0, size, size);
  streakRows(ctx, rand, BAR_STREAK, 0, 0, size, size);
};

// vertical grain for the corner posts and tool handles
const paintPost: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, POST_WOOD, 0, 0, size, size);
  for (let col = 0; col < size; col++) {
    const start = Math.floor(rand() * size);
    const length = 3 + Math.floor(rand() * 6);
    const colour = rand() < 0.65 ? POST_STREAK : POST_HIGHLIGHT;
    for (let row = start; row < start + length; row++) setPixel(ctx, col, row % size, colour);
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
  [CraftingTableTextureKey.Panel]: paintPanel,
  [CraftingTableTextureKey.Trim]: paintTrim,
  [CraftingTableTextureKey.Bar]: paintBar,
  [CraftingTableTextureKey.Post]: paintPost,
  [CraftingTableTextureKey.Metal]: paintMetal,
};

// cached per key, only call this on the client inside the Canvas
export function getCraftingTableTexture(key: CraftingTableTextureKey): CanvasTexture {
  return createPixelTexture(key, PAINTERS[key]);
}
