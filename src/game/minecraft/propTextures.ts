import { BoxGeometry, PlaneGeometry } from 'three';
import type { BufferGeometry, CanvasTexture } from 'three';
import { BLOCK_SIZE, PIXEL_TEXTURE_SIZE } from './constants';
import { createPixelTexture, pickColour, setPixel } from './pixelTexture';
import type { PixelPainter, Rng } from './pixelTexture';

// one texel of a prop in world units, props are modelled in sixteenths of a block
export const PROP_TEXEL = BLOCK_SIZE / PIXEL_TEXTURE_SIZE;

// ---------------------------------------------------------------------------
// texel sized geometry
// ---------------------------------------------------------------------------

// face order of three's BoxGeometry, each face owns four consecutive vertices
export enum BoxFaceIndex {
  PlusX = 0,
  MinusX = 1,
  PlusY = 2,
  MinusY = 3,
  PlusZ = 4,
  MinusZ = 5,
}

const BOX_FACES = [
  BoxFaceIndex.PlusX,
  BoxFaceIndex.MinusX,
  BoxFaceIndex.PlusY,
  BoxFaceIndex.MinusY,
  BoxFaceIndex.PlusZ,
  BoxFaceIndex.MinusZ,
] as const;

const VERTICES_PER_FACE = 4;

// top left texel of the patch a face samples, canvas coordinates so y runs downwards
export interface TexelOrigin {
  x: number;
  y: number;
}

export type BoxFaceOrigins = Partial<Record<BoxFaceIndex, TexelOrigin>>;

const TOP_LEFT: TexelOrigin = { x: 0, y: 0 };

// squeezes the 0..1 uvs of one quad onto a width x height texel patch of the texture
function cropQuadUvs(geometry: BufferGeometry, firstVertex: number, origin: TexelOrigin, width: number, height: number) {
  const uv = geometry.getAttribute('uv');
  const u0 = origin.x / PIXEL_TEXTURE_SIZE;
  const u1 = (origin.x + width) / PIXEL_TEXTURE_SIZE;
  // canvas row 0 is the top of the texture (v = 1)
  const vTop = 1 - origin.y / PIXEL_TEXTURE_SIZE;
  const vBottom = 1 - (origin.y + height) / PIXEL_TEXTURE_SIZE;
  for (let i = firstVertex; i < firstVertex + VERTICES_PER_FACE; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), vBottom + uv.getY(i) * (vTop - vBottom));
  }
  uv.needsUpdate = true;
}

// width and height in texels of a box face, in the same order the uvs run
function boxFaceSize(face: BoxFaceIndex, width: number, height: number, depth: number): [number, number] {
  switch (face) {
    case BoxFaceIndex.PlusX:
    case BoxFaceIndex.MinusX:
      return [depth, height];
    case BoxFaceIndex.PlusY:
    case BoxFaceIndex.MinusY:
      return [width, depth];
    case BoxFaceIndex.PlusZ:
    case BoxFaceIndex.MinusZ:
      return [width, height];
  }
}

// centred box measured in texels where every face shows its texture texel for texel,
// sampling from the top left of the texture unless that face has its own origin
export function createTexelBox(width: number, height: number, depth: number, origins: BoxFaceOrigins = {}): BoxGeometry {
  const geometry = new BoxGeometry(width * PROP_TEXEL, height * PROP_TEXEL, depth * PROP_TEXEL);
  for (const face of BOX_FACES) {
    const [faceWidth, faceHeight] = boxFaceSize(face, width, height, depth);
    cropQuadUvs(geometry, face * VERTICES_PER_FACE, origins[face] ?? TOP_LEFT, faceWidth, faceHeight);
  }
  return geometry;
}

// centred upright plane measured in texels, sampled texel for texel like createTexelBox
export function createTexelPlane(width: number, height: number, origin: TexelOrigin = TOP_LEFT): PlaneGeometry {
  const geometry = new PlaneGeometry(width * PROP_TEXEL, height * PROP_TEXEL);
  cropQuadUvs(geometry, 0, origin, width, height);
  return geometry;
}

// ---------------------------------------------------------------------------
// flicker helpers for glowing textures
// ---------------------------------------------------------------------------

// brightness multiplier hovering just around 1, two detuned waves so it never looks periodic
export function flickerBrightness(time: number, phase: number): number {
  return 1 + 0.06 * Math.sin(time * 11.3 + phase) + 0.04 * Math.sin(time * 23.7 + phase * 1.7);
}

// picks frame 0 or 1 of a two frame animation, changing at most `rate` times a second
// in an irregular pattern so flames don't tick like a clock
export function flickerFrame(time: number, phase: number, rate: number): number {
  const step = Math.floor((time + phase) * rate);
  return (Math.imul(step, 0x9e3779b1) >>> 15) & 1;
}

// ---------------------------------------------------------------------------
// palettes, all picked by hand
// ---------------------------------------------------------------------------

const OAK_GRAIN = ['#b48c55', '#a8814b', '#bd955c', '#9c7643'] as const;
const OAK_STREAK = '#8d6a3b';
const OAK_SEAM = '#6f5130';
const CRAFT_LIP = ['#c39b62', '#b8915a', '#cba46b'] as const;
const CRAFT_LIP_SHADOW = '#4a321b';
const CRAFT_LEG = ['#7a5631', '#6e4c2a', '#835d35'] as const;
const CRAFT_RIM = '#3f2b16';
const CRAFT_GRID_LINE = '#55391d';
const CRAFT_CELL = ['#d2ab74', '#c9a26b', '#d9b47e'] as const;

const TOOL_HANDLE = '#4a2f17';
const TOOL_METAL = '#a9b0b7';
const TOOL_METAL_LIGHT = '#d6dbe0';
const TOOL_METAL_DARK = '#737a82';

const COBBLE = ['#7d7d7a', '#878784', '#72726f', '#8f8f8b'] as const;
const COBBLE_MORTAR = '#4a4a48';
const COBBLE_HIGHLIGHT = '#a3a39f';
const COBBLE_SHADOW = '#5e5e5b';
const SMOOTH_STONE = ['#9a9a96', '#a1a19d', '#94948f'] as const;
const SMOOTH_STONE_EDGE = '#6c6c69';
const SMOOTH_STONE_RIM = '#b0b0ac';
const FURNACE_LINTEL = '#7f7f7b';
const FURNACE_INSIDE = ['#1e1b19', '#24201d', '#2b2622'] as const;
const FURNACE_INSIDE_SHADOW = '#141210';
const FURNACE_ASH = ['#3b3531', '#4a423c', '#332e2a'] as const;
const FURNACE_VENT = '#2a2725';

const FIRE_TIP = '#d9481a';
const FIRE_OUTER = '#ff8a1f';
const FIRE_BODY = '#ffc53d';
const FIRE_CORE = '#ffe486';
const FIRE_EMBERS = ['#ff7a1a', '#ffb02e', '#e8501a'] as const;

const CHEST_GRAIN = ['#a66f34', '#9a6530', '#b07a3c', '#8f5c2a'] as const;
const CHEST_SEAM = '#6e4520';
const CHEST_TRIM = '#4f2f12';
const CHEST_INSIDE = ['#2e1d0d', '#3a2512', '#33210f'] as const;
const CHEST_INSIDE_SHADOW = '#1f1408';
const LATCH_LIGHT = '#dcdcd6';
const LATCH_METAL = ['#c4c4c0', '#b8b8b3'] as const;
const LATCH_DARK = '#6a6a66';

const LANTERN_METAL = ['#3b3f46', '#33373d', '#43484f'] as const;
const LANTERN_RIM = '#24272c';
const LANTERN_BAR = '#4f5660';
const LANTERN_CORE = ['#ffd27a', '#ffc45a', '#ffe1a0'] as const;
const LANTERN_CORE_HOT = '#fff2c8';
const CHAIN_METAL = '#3d434c';
const CHAIN_HIGHLIGHT = '#5e6773';

const TORCH_STICK = ['#6e4b26', '#7a542b', '#62421f'] as const;
const TORCH_HEAD = ['#ffd75e', '#ffe58f', '#ffc93f'] as const;
const FLAME_TIP = '#e0521b';
const FLAME_OUTER = '#ff9a2e';
const FLAME_BODY = '#ffd24a';
const FLAME_CORE = '#fff4c2';

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
  bias = 1,
) {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      setPixel(ctx, col, row, pickColour(palette, rand, bias));
    }
  }
}

// one pixel wide outline just inside the given rectangle
function strokeRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, colour: string) {
  fillRect(ctx, x, y, width, 1, colour);
  fillRect(ctx, x, y + height - 1, width, 1, colour);
  fillRect(ctx, x, y, 1, height, colour);
  fillRect(ctx, x + width - 1, y, 1, height, colour);
}

// draws a little pixel map, characters missing from the colour table are left untouched
function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  x: number,
  y: number,
  colours: Readonly<Record<string, string>>,
) {
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      const colour = colours[rows[row][col]];
      if (colour) setPixel(ctx, x + col, y + row, colour);
    }
  }
}

// horizontal boards with a darker seam under each one, a staggered butt joint per board
// and the odd grain streak
function paintPlanks(
  ctx: CanvasRenderingContext2D,
  rand: Rng,
  x: number,
  y: number,
  width: number,
  height: number,
  boardHeight: number,
  grain: readonly string[],
  streak: string,
  seam: string,
) {
  fillNoise(ctx, rand, grain, x, y, width, height);
  for (let boardTop = 0; boardTop < height; boardTop += boardHeight) {
    const seamRow = boardTop + boardHeight - 1;
    if (seamRow < height) fillRect(ctx, x, y + seamRow, width, 1, seam);

    const grainRows = Math.min(boardHeight - 1, height - boardTop);
    const jointX = x + Math.floor(rand() * width);
    fillRect(ctx, jointX, y + boardTop, 1, grainRows, seam);

    if (grainRows > 0) {
      const streakLength = 2 + Math.floor(rand() * 3);
      const streakX = x + Math.floor(rand() * Math.max(1, width - streakLength));
      const streakY = y + boardTop + Math.floor(rand() * grainRows);
      fillRect(ctx, streakX, streakY, streakLength, 1, streak);
    }
  }
}

// ---------------------------------------------------------------------------
// crafting table
// ---------------------------------------------------------------------------

const CRAFT_LIP_ROWS = 3;
const CRAFT_LEG_WIDTH = 2;
const CRAFT_BOARD_HEIGHT = 4;
// grid lines on the top, cells are the two texel gaps between them
const CRAFT_GRID_LINES = [3, 6, 9, 12] as const;
const CRAFT_GRID_START = CRAFT_GRID_LINES[0];
const CRAFT_GRID_SPAN = CRAFT_GRID_LINES[CRAFT_GRID_LINES.length - 1] - CRAFT_GRID_START + 1;

const TOOL_COLOURS: Readonly<Record<string, string>> = {
  H: TOOL_HANDLE,
  M: TOOL_METAL,
  L: TOOL_METAL_LIGHT,
  D: TOOL_METAL_DARK,
};

// handle on the left with a finger hole, blade tapering to the right, teeth along the bottom
const SAW_SPRITE = [
  'HHH.........',
  'H.HLLLLLLLLL',
  'HHHMMMMMMMMM',
  '.HHMMMMMMMM.',
  '...D.D.D.D..',
] as const;

// claw hammer standing on its grip
const HAMMER_SPRITE = [
  '.LLLLLL',
  'MMMMMMM',
  'D..H.DD',
  '...H...',
  '...H...',
  '...H...',
  '...H...',
  '...H...',
  '..HHH..',
] as const;

// shared look of every crafting table side: tabletop lip, corner legs and boards between
const paintCraftingSide: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, CRAFT_LIP, 0, 0, size, CRAFT_LIP_ROWS);
  fillRect(ctx, 0, CRAFT_LIP_ROWS, size, 1, CRAFT_LIP_SHADOW);

  const bodyTop = CRAFT_LIP_ROWS + 1;
  const bodyHeight = size - bodyTop;
  fillNoise(ctx, rand, CRAFT_LEG, 0, bodyTop, CRAFT_LEG_WIDTH, bodyHeight);
  fillNoise(ctx, rand, CRAFT_LEG, size - CRAFT_LEG_WIDTH, bodyTop, CRAFT_LEG_WIDTH, bodyHeight);
  paintPlanks(
    ctx,
    rand,
    CRAFT_LEG_WIDTH,
    bodyTop,
    size - CRAFT_LEG_WIDTH * 2,
    bodyHeight,
    CRAFT_BOARD_HEIGHT,
    OAK_GRAIN,
    OAK_STREAK,
    OAK_SEAM,
  );
};

const paintCraftingTop: PixelPainter = (ctx, rand, size) => {
  paintPlanks(ctx, rand, 0, 0, size, size, CRAFT_BOARD_HEIGHT, OAK_GRAIN, OAK_STREAK, OAK_SEAM);
  strokeRect(ctx, 0, 0, size, size, CRAFT_RIM);

  fillNoise(ctx, rand, CRAFT_CELL, CRAFT_GRID_START, CRAFT_GRID_START, CRAFT_GRID_SPAN, CRAFT_GRID_SPAN);
  for (const line of CRAFT_GRID_LINES) {
    fillRect(ctx, line, CRAFT_GRID_START, 1, CRAFT_GRID_SPAN, CRAFT_GRID_LINE);
    fillRect(ctx, CRAFT_GRID_START, line, CRAFT_GRID_SPAN, 1, CRAFT_GRID_LINE);
  }
};

const paintCraftingFront: PixelPainter = (ctx, rand, size) => {
  paintCraftingSide(ctx, rand, size);
  drawSprite(ctx, SAW_SPRITE, 2, 6, TOOL_COLOURS);
};

const paintCraftingToolSide: PixelPainter = (ctx, rand, size) => {
  paintCraftingSide(ctx, rand, size);
  drawSprite(ctx, HAMMER_SPRITE, 5, 5, TOOL_COLOURS);
};

const paintOakPlanks: PixelPainter = (ctx, rand, size) => {
  paintPlanks(ctx, rand, 0, 0, size, size, CRAFT_BOARD_HEIGHT, OAK_GRAIN, OAK_STREAK, OAK_SEAM);
};

// ---------------------------------------------------------------------------
// furnace
// ---------------------------------------------------------------------------

const COBBLE_STONE_COUNT = 10;
// pixels closer than this to the border between two stones become mortar
const COBBLE_MORTAR_WIDTH = 0.9;
const COBBLE_SPECKLE_CHANCE = 0.15;

// shortest distance between two coordinates on a texture that wraps around
function wrappedDelta(a: number, b: number, size: number): number {
  const delta = Math.abs(a - b);
  return Math.min(delta, size - delta);
}

// rounded stones packed together with dark mortar between them, worked out as a
// tiling voronoi so the texture repeats cleanly across neighbouring blocks
const paintCobble: PixelPainter = (ctx, rand, size) => {
  const stoneX: number[] = [];
  const stoneY: number[] = [];
  const stoneColour: string[] = [];
  for (let i = 0; i < COBBLE_STONE_COUNT; i++) {
    stoneX.push(rand() * size);
    stoneY.push(rand() * size);
    stoneColour.push(pickColour(COBBLE, rand));
  }

  const nearest = new Int8Array(size * size);
  const mortar = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let best = Infinity;
      let second = Infinity;
      let bestIndex = 0;
      for (let i = 0; i < COBBLE_STONE_COUNT; i++) {
        const dx = wrappedDelta(x + 0.5, stoneX[i], size);
        const dy = wrappedDelta(y + 0.5, stoneY[i], size);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < best) {
          second = best;
          best = distance;
          bestIndex = i;
        } else if (distance < second) {
          second = distance;
        }
      }
      nearest[y * size + x] = bestIndex;
      mortar[y * size + x] = second - best < COBBLE_MORTAR_WIDTH ? 1 : 0;
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      if (mortar[index]) {
        setPixel(ctx, x, y, COBBLE_MORTAR);
        continue;
      }
      // light catches the top of each stone, the bottom sits in shadow
      const above = mortar[((y + size - 1) % size) * size + x];
      const below = mortar[((y + 1) % size) * size + x];
      let colour = stoneColour[nearest[index]];
      if (above) colour = COBBLE_HIGHLIGHT;
      else if (below) colour = COBBLE_SHADOW;
      else if (rand() < COBBLE_SPECKLE_CHANCE) colour = pickColour(COBBLE, rand);
      setPixel(ctx, x, y, colour);
    }
  }
};

const paintSmoothStone: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, SMOOTH_STONE, 0, 0, size, size);
  strokeRect(ctx, 0, 0, size, size, SMOOTH_STONE_EDGE);
  strokeRect(ctx, 1, 1, size - 2, size - 2, SMOOTH_STONE_RIM);
};

// fire opening on the furnace front, the fire overlay lines up with these
const FURNACE_FRAME = { x: 3, y: 6, width: 10, height: 9 } as const;
const FURNACE_OPENING = { x: 4, y: 8, width: 8, height: 6 } as const;
const FURNACE_VENT_RECT = { x: 6, y: 2, width: 4, height: 2 } as const;

const paintFurnaceFront: PixelPainter = (ctx, rand, size) => {
  paintCobble(ctx, rand, size);

  // smooth stone surround with a darker outline
  fillNoise(ctx, rand, SMOOTH_STONE, FURNACE_FRAME.x, FURNACE_FRAME.y, FURNACE_FRAME.width, FURNACE_FRAME.height);
  strokeRect(ctx, FURNACE_FRAME.x, FURNACE_FRAME.y, FURNACE_FRAME.width, FURNACE_FRAME.height, SMOOTH_STONE_EDGE);
  fillRect(ctx, FURNACE_OPENING.x, FURNACE_OPENING.y - 1, FURNACE_OPENING.width, 1, FURNACE_LINTEL);

  // sooty hole with a shadow under the lintel and ash on the floor
  const { x, y, width, height } = FURNACE_OPENING;
  fillNoise(ctx, rand, FURNACE_INSIDE, x, y, width, height);
  fillRect(ctx, x, y, width, 1, FURNACE_INSIDE_SHADOW);
  fillNoise(ctx, rand, FURNACE_ASH, x, y + height - 1, width, 1);

  // small chimney slot near the top
  fillRect(ctx, FURNACE_VENT_RECT.x - 1, FURNACE_VENT_RECT.y - 1, FURNACE_VENT_RECT.width + 2, FURNACE_VENT_RECT.height + 2, SMOOTH_STONE_EDGE);
  fillRect(ctx, FURNACE_VENT_RECT.x, FURNACE_VENT_RECT.y, FURNACE_VENT_RECT.width, FURNACE_VENT_RECT.height, FURNACE_VENT);
};

// tallest flame column inside the opening, the bottom row is always embers
const FIRE_MAX_HEIGHT = FURNACE_OPENING.height - 2;

// transparent everywhere except the furnace opening, where a bed of embers carries
// a ragged row of flames. each frame key gets a different seed so the two frames differ
const paintFurnaceFire: PixelPainter = (ctx, rand) => {
  const { x, y, width, height } = FURNACE_OPENING;
  const emberRow = y + height - 1;
  fillNoise(ctx, rand, FIRE_EMBERS, x, emberRow, width, 1);

  let flameHeight = 1 + Math.floor(rand() * FIRE_MAX_HEIGHT);
  for (let col = x; col < x + width; col++) {
    // neighbouring columns stay within a texel or two so the flames look like one fire
    flameHeight += Math.floor(rand() * 5) - 2;
    flameHeight = Math.max(1, Math.min(FIRE_MAX_HEIGHT, flameHeight));
    for (let i = 0; i < flameHeight; i++) {
      const row = emberRow - 1 - i;
      const fromTop = flameHeight - 1 - i;
      let colour = FIRE_BODY;
      if (fromTop === 0) colour = FIRE_TIP;
      else if (fromTop === 1) colour = FIRE_OUTER;
      else if (i === 0) colour = FIRE_CORE;
      setPixel(ctx, col, row, colour);
    }
  }
};

// ---------------------------------------------------------------------------
// chest
// ---------------------------------------------------------------------------

// the chest side texture holds the lid side (rows 1 to 5) stacked on the body side
// (rows 6 to 15), both 14 texels wide starting at column 1
export const CHEST_LID_SIDE_ORIGIN: TexelOrigin = { x: 1, y: 1 };
export const CHEST_BODY_SIDE_ORIGIN: TexelOrigin = { x: 1, y: 6 };
// tops, bottoms and the inside are 14 x 14 starting at texel 1, 1
export const CHEST_FACE_ORIGIN: TexelOrigin = { x: 1, y: 1 };

const CHEST_WIDTH_TEXELS = 14;
const CHEST_LID_ROWS = 5;
const CHEST_BODY_ROWS = 10;
const CHEST_BOARD_HEIGHT = 4;

const paintChestSide: PixelPainter = (ctx, rand) => {
  const x = CHEST_LID_SIDE_ORIGIN.x;
  const lidY = CHEST_LID_SIDE_ORIGIN.y;
  const bodyY = CHEST_BODY_SIDE_ORIGIN.y;

  fillNoise(ctx, rand, CHEST_GRAIN, x, lidY, CHEST_WIDTH_TEXELS, CHEST_LID_ROWS);
  strokeRect(ctx, x, lidY, CHEST_WIDTH_TEXELS, CHEST_LID_ROWS, CHEST_TRIM);

  paintPlanks(ctx, rand, x, bodyY, CHEST_WIDTH_TEXELS, CHEST_BODY_ROWS, CHEST_BOARD_HEIGHT + 1, CHEST_GRAIN, CHEST_SEAM, CHEST_SEAM);
  strokeRect(ctx, x, bodyY, CHEST_WIDTH_TEXELS, CHEST_BODY_ROWS, CHEST_TRIM);
};

const paintChestTop: PixelPainter = (ctx, rand) => {
  const { x, y } = CHEST_FACE_ORIGIN;
  paintPlanks(ctx, rand, x, y, CHEST_WIDTH_TEXELS, CHEST_WIDTH_TEXELS, CHEST_BOARD_HEIGHT, CHEST_GRAIN, CHEST_SEAM, CHEST_SEAM);
  strokeRect(ctx, x, y, CHEST_WIDTH_TEXELS, CHEST_WIDTH_TEXELS, CHEST_TRIM);
};

// hollow inside seen when the lid is up: thin wooden walls around a dark well
const paintChestInside: PixelPainter = (ctx, rand) => {
  const { x, y } = CHEST_FACE_ORIGIN;
  fillNoise(ctx, rand, CHEST_GRAIN, x, y, CHEST_WIDTH_TEXELS, CHEST_WIDTH_TEXELS);
  fillNoise(ctx, rand, CHEST_INSIDE, x + 1, y + 1, CHEST_WIDTH_TEXELS - 2, CHEST_WIDTH_TEXELS - 2);
  fillRect(ctx, x + 1, y + 1, CHEST_WIDTH_TEXELS - 2, 1, CHEST_INSIDE_SHADOW);
};

// latch faces sample the top left corner: a 2 x 4 front, 1 x 4 sides and a 2 x 1 top
const paintChestLatch: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, LATCH_METAL, 0, 0, size, size);
  fillRect(ctx, 0, 0, size, 1, LATCH_LIGHT);
  fillRect(ctx, 0, 3, size, 1, LATCH_DARK);
};

// ---------------------------------------------------------------------------
// lantern
// ---------------------------------------------------------------------------

// sides of the 6 x 7 lantern cage, windows are cut out so the glowing core shows through
const LANTERN_SIDE_SPRITE = [
  'RRRRRR',
  'M....M',
  'M....M',
  'MBBBBM',
  'M....M',
  'M....M',
  'RRRRRR',
] as const;

const paintLanternSide: PixelPainter = (ctx, rand) => {
  drawSprite(ctx, LANTERN_SIDE_SPRITE, 0, 0, { R: LANTERN_RIM, B: LANTERN_BAR });
  // the frame posts get a little noise so they don't look flat
  const lastColumn = LANTERN_SIDE_SPRITE[0].length - 1;
  for (let row = 1; row < LANTERN_SIDE_SPRITE.length - 1; row++) {
    setPixel(ctx, 0, row, pickColour(LANTERN_METAL, rand));
    setPixel(ctx, lastColumn, row, pickColour(LANTERN_METAL, rand));
  }
};

const paintLanternMetal: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, LANTERN_METAL, 0, 0, size, size);
};

// warm light with a hotter middle, the two frame keys get different speckles
const paintLanternCore: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, LANTERN_CORE, 0, 0, size, size);
  fillRect(ctx, 1, 1, 2, 3, LANTERN_CORE_HOT);
  for (let i = 0; i < 3; i++) {
    setPixel(ctx, Math.floor(rand() * 4), Math.floor(rand() * 5), LANTERN_CORE_HOT);
  }
};

// period of the chain pattern in texels: a face-on link then a side-on link
export const CHAIN_PATTERN_ROWS = 6;
const CHAIN_LINK = ['.M.', 'H.M', 'M.M', '.M.', '.H.', '.M.'] as const;

const paintLanternChain: PixelPainter = (ctx, _rand, size) => {
  for (let y = 0; y < size; y += CHAIN_PATTERN_ROWS) {
    drawSprite(ctx, CHAIN_LINK, 0, y, { M: CHAIN_METAL, H: CHAIN_HIGHLIGHT });
  }
};

// ---------------------------------------------------------------------------
// torch
// ---------------------------------------------------------------------------

const FLAME_COLOURS: Readonly<Record<string, string>> = {
  r: FLAME_TIP,
  o: FLAME_OUTER,
  y: FLAME_BODY,
  w: FLAME_CORE,
};

// 4 x 4 flame sitting on the torch head, two frames that lean different ways
const FLAME_SPRITE_A = ['..r.', '.oo.', '.oyo', 'oywy'] as const;
const FLAME_SPRITE_B = ['.r..', '.oo.', 'oyo.', 'ywyo'] as const;

const paintTorchStick: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, TORCH_STICK, 0, 0, size, size);
};

const paintTorchHead: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, TORCH_HEAD, 0, 0, size, size);
};

const paintTorchFlameA: PixelPainter = (ctx) => {
  drawSprite(ctx, FLAME_SPRITE_A, 0, 0, FLAME_COLOURS);
};

const paintTorchFlameB: PixelPainter = (ctx) => {
  drawSprite(ctx, FLAME_SPRITE_B, 0, 0, FLAME_COLOURS);
};

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------

export enum PropTextureKey {
  CraftingTableTop = 'prop:craftingTable:top',
  CraftingTableFront = 'prop:craftingTable:front',
  CraftingTableToolSide = 'prop:craftingTable:toolSide',
  OakPlanks = 'prop:oakPlanks',
  Cobble = 'prop:furnace:cobble',
  FurnaceTop = 'prop:furnace:top',
  FurnaceFront = 'prop:furnace:front',
  FurnaceFireA = 'prop:furnace:fireA',
  FurnaceFireB = 'prop:furnace:fireB',
  ChestSide = 'prop:chest:side',
  ChestTop = 'prop:chest:top',
  ChestInside = 'prop:chest:inside',
  ChestLatch = 'prop:chest:latch',
  LanternSide = 'prop:lantern:side',
  LanternMetal = 'prop:lantern:metal',
  LanternCoreA = 'prop:lantern:coreA',
  LanternCoreB = 'prop:lantern:coreB',
  LanternChain = 'prop:lantern:chain',
  TorchStick = 'prop:torch:stick',
  TorchHead = 'prop:torch:head',
  TorchFlameA = 'prop:torch:flameA',
  TorchFlameB = 'prop:torch:flameB',
}

const PROP_PAINTERS: Readonly<Record<PropTextureKey, PixelPainter>> = {
  [PropTextureKey.CraftingTableTop]: paintCraftingTop,
  [PropTextureKey.CraftingTableFront]: paintCraftingFront,
  [PropTextureKey.CraftingTableToolSide]: paintCraftingToolSide,
  [PropTextureKey.OakPlanks]: paintOakPlanks,
  [PropTextureKey.Cobble]: paintCobble,
  [PropTextureKey.FurnaceTop]: paintSmoothStone,
  [PropTextureKey.FurnaceFront]: paintFurnaceFront,
  [PropTextureKey.FurnaceFireA]: paintFurnaceFire,
  [PropTextureKey.FurnaceFireB]: paintFurnaceFire,
  [PropTextureKey.ChestSide]: paintChestSide,
  [PropTextureKey.ChestTop]: paintChestTop,
  [PropTextureKey.ChestInside]: paintChestInside,
  [PropTextureKey.ChestLatch]: paintChestLatch,
  [PropTextureKey.LanternSide]: paintLanternSide,
  [PropTextureKey.LanternMetal]: paintLanternMetal,
  [PropTextureKey.LanternCoreA]: paintLanternCore,
  [PropTextureKey.LanternCoreB]: paintLanternCore,
  [PropTextureKey.LanternChain]: paintLanternChain,
  [PropTextureKey.TorchStick]: paintTorchStick,
  [PropTextureKey.TorchHead]: paintTorchHead,
  [PropTextureKey.TorchFlameA]: paintTorchFlameA,
  [PropTextureKey.TorchFlameB]: paintTorchFlameB,
};

// cached per key, only call this on the client inside the Canvas
export function getPropTexture(key: PropTextureKey): CanvasTexture {
  return createPixelTexture(key, PROP_PAINTERS[key]);
}
