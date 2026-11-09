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
// chest
// ---------------------------------------------------------------------------

// the chest side texture holds the lid side (rows 1 to 5) stacked on the body side
// (rows 6 to 15), both CHEST_WIDTH_TEXELS wide starting at column 1
export const CHEST_LID_SIDE_ORIGIN: TexelOrigin = { x: 1, y: 1 };
export const CHEST_BODY_SIDE_ORIGIN: TexelOrigin = { x: 1, y: 6 };
// tops, bottoms and the inside are square, starting at texel 1, 1
export const CHEST_FACE_ORIGIN: TexelOrigin = { x: 1, y: 1 };

// chest size in texels, which the model is built from too. a texel short of a full block each
// way, so it sits just inside its cell next to full blocks without looking small beside them
export const CHEST_WIDTH_TEXELS = 15;
export const CHEST_LID_ROWS = 5;
export const CHEST_BODY_ROWS = 10;
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
