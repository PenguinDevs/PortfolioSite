import type { CanvasTexture } from 'three';
import { createPixelTexture, pickColour, setPixel } from '../pixelTexture';
import type { PixelPainter, Rng } from '../pixelTexture';
import type { TexelOrigin } from '../propTextures';

// textures for the 3D furnace. each part samples a small patch of one of these,
// the origins below say where each kind of patch sits on its texture

export enum FurnaceTextureKey {
  Stones = 'prop:furnace:3d:stones',
  Frame = 'prop:furnace:3d:frame',
  Band = 'prop:furnace:3d:band',
  Wall = 'prop:furnace:3d:wall',
  Back = 'prop:furnace:3d:back',
  Grate = 'prop:furnace:3d:grate',
  Bark = 'prop:furnace:3d:bark',
  Charred = 'prop:furnace:3d:charred',
  Ash = 'prop:furnace:3d:ash',
  Ember = 'prop:furnace:3d:ember',
  FlameA = 'prop:furnace:3d:flameA',
  FlameB = 'prop:furnace:3d:flameB',
  VentGlow = 'prop:furnace:3d:ventGlow',
}

// ---------------------------------------------------------------------------
// sampling origins for the model boxes
// ---------------------------------------------------------------------------

// the stone texture is cobble with highlights and shadows baked in;
// origin 0,0 suits most faces
export const STONE_ORIGIN: TexelOrigin = { x: 0, y: 0 };

// frame, band, wall and back are uniform across the face so origin 0,0 is fine
export const FRAME_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const BAND_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const WALL_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const BACK_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const GRATE_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const BARK_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const CHARRED_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const ASH_ORIGIN: TexelOrigin = { x: 0, y: 0 };
export const EMBER_ORIGIN: TexelOrigin = { x: 0, y: 0 };

// ---------------------------------------------------------------------------
// palettes, all picked by hand, original art
// ---------------------------------------------------------------------------

// cobblestone panel
const COBBLE_STONE = ['#7f7f7c', '#898985', '#747470', '#919190'] as const;
const COBBLE_HIGHLIGHT = '#a5a5a1';
const COBBLE_SHADOW = '#5f5f5c';
const COBBLE_MORTAR = '#4c4c49';
const COBBLE_SPECKLE = '#6a6a67';

// raised frame ring (slightly lighter stone)
const FRAME_STONE = ['#9a9a96', '#a2a29e', '#929290', '#a8a8a4'] as const;
const FRAME_BEVEL_LIGHT = '#b8b8b4';
const FRAME_BEVEL_DARK = '#6e6e6b';
const FRAME_MORTAR = '#585855';

// smooth stone band (bottom portion)
const BAND_STONE = ['#a0a09c', '#a8a8a4', '#999995', '#aeaeaa'] as const;
const BAND_HIGHLIGHT = '#c0c0bc';
const BAND_EDGE = '#6f6f6c';
const BAND_JOINT = '#808080';

// dark interior walls
const WALL_BRICK = ['#2a2724', '#302c28', '#252220', '#332f2c'] as const;
const WALL_JOINT = '#1c1a18';
const WALL_SOOT = '#181614';

// back wall (very dark)
const BACK_STONE = ['#1a1816', '#201d1b', '#161412', '#231f1d'] as const;
const BACK_JOINT = '#0f0d0c';

// metal grate bars
const GRATE_METAL = ['#6e737a', '#787d84', '#636870'] as const;
const GRATE_SHINE = '#969ca3';
const GRATE_DARK = '#4a4f56';

// log bark
const LOG_BARK = ['#5a3a20', '#4e3219', '#63411f', '#472b15'] as const;
const LOG_END = '#6e4a2d';
const LOG_RING = '#3e2a16';

// charred wood (unlit logs)
const CHARRED_WOOD = ['#2a2320', '#302926', '#252019', '#1f1a16'] as const;
const CHARRED_CRACK = '#151210';

// ash on the chamber floor
const ASH_TONE = ['#3d3834', '#45403c', '#363230', '#4c4642'] as const;
const ASH_LIGHT = '#5a5450';
const ASH_DARK = '#2c2926';

// glowing embers
const EMBER_HOT = ['#ff8a22', '#ffad38', '#e86e18'] as const;
const EMBER_WARM = ['#ff6014', '#d94e10'] as const;
const EMBER_DIM = '#a33a0c';

// flame palette
const FLAME_TIP = '#d94a1c';
const FLAME_OUTER = '#ff8c22';
const FLAME_BODY = '#ffc740';
const FLAME_CORE = '#ffe688';

// vent glow
const VENT_GLOW = ['#ff9030', '#ffb050', '#e87020'] as const;
const VENT_EDGE = '#a04010';

// ---------------------------------------------------------------------------
// painting helpers
// ---------------------------------------------------------------------------

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  width: number, height: number,
  colour: string,
) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, width, height);
}

function fillNoise(
  ctx: CanvasRenderingContext2D,
  rand: Rng,
  palette: readonly string[],
  x: number, y: number,
  width: number, height: number,
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

// cobblestone with irregular stone shapes, mortar and lighting
const paintStones: PixelPainter = (ctx, rand, size) => {
  // fill with mortar first
  fillRect(ctx, 0, 0, size, size, COBBLE_MORTAR);

  // lay 4 courses of stones, each 4 texels tall with staggered joints
  const courseHeight = 4;
  for (let course = 0; course < 4; course++) {
    const cy = course * courseHeight;
    // each course has 2 to 3 stones of varying width
    let cx = 0;
    while (cx < size) {
      const remaining = size - cx;
      if (remaining <= 0) break;
      // pick a stone width between 3 and 7, leave room for at least one more or fill the row
      const maxW = Math.min(remaining, 7);
      const minW = Math.min(3, maxW);
      const stoneW = minW + Math.floor(rand() * (maxW - minW + 1));
      // stone body is inset by mortar on right and bottom edges
      const bodyW = cx + stoneW >= size ? stoneW : stoneW - 1;
      const bodyH = courseHeight - 1;

      // base colour
      const baseColour = pickColour(COBBLE_STONE, rand);
      fillRect(ctx, cx, cy, bodyW, bodyH, baseColour);

      // noisy fill
      for (let py = cy; py < cy + bodyH; py++) {
        for (let px = cx; px < cx + bodyW; px++) {
          if (rand() < 0.35) {
            setPixel(ctx, px, py, pickColour(COBBLE_STONE, rand));
          }
        }
      }

      // highlight on top edge
      for (let px = cx; px < cx + bodyW; px++) {
        if (rand() < 0.6) setPixel(ctx, px, cy, COBBLE_HIGHLIGHT);
      }
      // shadow on bottom edge
      for (let px = cx; px < cx + bodyW; px++) {
        if (rand() < 0.5) setPixel(ctx, px, cy + bodyH - 1, COBBLE_SHADOW);
      }
      // speckles
      for (let i = 0; i < 2; i++) {
        const sx = cx + Math.floor(rand() * bodyW);
        const sy = cy + Math.floor(rand() * bodyH);
        setPixel(ctx, sx, sy, COBBLE_SPECKLE);
      }

      cx += stoneW;
    }
  }
};

// frame ring: lighter stone with bevelled edges
const paintFrame: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, FRAME_STONE, 0, 0, size, size);

  // bevel: top and left rows lighter, bottom and right rows darker
  for (let i = 0; i < size; i++) {
    setPixel(ctx, i, 0, FRAME_BEVEL_LIGHT);
    setPixel(ctx, 0, i, FRAME_BEVEL_LIGHT);
    setPixel(ctx, i, size - 1, FRAME_BEVEL_DARK);
    setPixel(ctx, size - 1, i, FRAME_BEVEL_DARK);
  }

  // a couple of mortar joints
  if (size >= 8) {
    fillRect(ctx, 0, Math.floor(size / 2), size, 1, FRAME_MORTAR);
    fillRect(ctx, Math.floor(size / 3), 0, 1, size, FRAME_MORTAR);
  }
};

// smooth stone band for the lower portion
const paintBand: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, BAND_STONE, 0, 0, size, size);
  // bright top row for the ledge
  for (let i = 0; i < size; i++) {
    setPixel(ctx, i, 0, BAND_HIGHLIGHT);
  }
  // dark bottom edge
  for (let i = 0; i < size; i++) {
    setPixel(ctx, i, size - 1, BAND_EDGE);
  }
  // slab joints
  if (size >= 8) {
    fillRect(ctx, 5, 1, 1, size - 2, BAND_JOINT);
    fillRect(ctx, 11, 1, 1, size - 2, BAND_JOINT);
  }
};

// dark interior walls with small brick rows
const paintWall: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, WALL_BRICK, 0, 0, size, size);
  // horizontal joint rows every 3 texels
  for (let y = 2; y < size; y += 3) {
    for (let x = 0; x < size; x++) {
      setPixel(ctx, x, y, WALL_JOINT);
    }
  }
  // soot streaks near the top
  for (let x = 0; x < size; x++) {
    if (rand() < 0.4) setPixel(ctx, x, 0, WALL_SOOT);
    if (rand() < 0.3) setPixel(ctx, x, 1, WALL_SOOT);
  }
};

// very dark back wall
const paintBack: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, BACK_STONE, 0, 0, size, size);
  // faint joints
  for (let y = 3; y < size; y += 4) {
    for (let x = 0; x < size; x++) {
      if (rand() < 0.6) setPixel(ctx, x, y, BACK_JOINT);
    }
  }
};

// metal grate for the bars
const paintGrate: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, GRATE_METAL, 0, 0, size, size);
  // shine highlight on top row
  for (let x = 0; x < size; x++) {
    if (rand() < 0.5) setPixel(ctx, x, 0, GRATE_SHINE);
  }
  // dark bottom row
  for (let x = 0; x < size; x++) {
    if (rand() < 0.5) setPixel(ctx, x, size - 1, GRATE_DARK);
  }
};

// log bark for the lit logs
const paintBark: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, LOG_BARK, 0, 0, size, size);
  // end grain ring on the left columns
  if (size >= 4) {
    const endW = 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < endW; x++) {
        setPixel(ctx, x, y, rand() < 0.4 ? LOG_RING : LOG_END);
      }
    }
  }
};

// charred wood for unlit logs
const paintCharred: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, CHARRED_WOOD, 0, 0, size, size);
  // crack lines
  for (let i = 0; i < 3; i++) {
    const cx = Math.floor(rand() * size);
    const cy = Math.floor(rand() * size);
    setPixel(ctx, cx, cy, CHARRED_CRACK);
    if (cx + 1 < size) setPixel(ctx, cx + 1, cy, CHARRED_CRACK);
  }
};

// ash on the hearth floor
const paintAsh: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, ASH_TONE, 0, 0, size, size);
  // lighter and darker spots
  for (let i = 0; i < 4; i++) {
    setPixel(ctx, Math.floor(rand() * size), Math.floor(rand() * size), ASH_LIGHT);
    setPixel(ctx, Math.floor(rand() * size), Math.floor(rand() * size), ASH_DARK);
  }
};

// glowing ember bed
const paintEmber: PixelPainter = (ctx, rand, size) => {
  fillNoise(ctx, rand, EMBER_HOT, 0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (rand() < 0.25) setPixel(ctx, x, y, pickColour(EMBER_WARM, rand));
      if (rand() < 0.1) setPixel(ctx, x, y, EMBER_DIM);
    }
  }
};

// flame sprite: ragged column of fire across the texture
function paintFlame(ctx: CanvasRenderingContext2D, rand: Rng, size: number) {
  // transparent background
  ctx.clearRect(0, 0, size, size);

  const maxHeight = size - 2;
  let flameH = 1 + Math.floor(rand() * maxHeight);
  for (let col = 0; col < size; col++) {
    flameH += Math.floor(rand() * 5) - 2;
    flameH = Math.max(1, Math.min(maxHeight, flameH));
    for (let i = 0; i < flameH; i++) {
      const row = size - 1 - i;
      const fromTop = flameH - 1 - i;
      let colour = FLAME_BODY;
      if (fromTop === 0) colour = FLAME_TIP;
      else if (fromTop === 1) colour = FLAME_OUTER;
      else if (i === 0) colour = FLAME_CORE;
      setPixel(ctx, col, row, colour);
    }
  }
  // ember row on the bottom
  for (let x = 0; x < size; x++) {
    setPixel(ctx, x, size - 1, pickColour(EMBER_HOT, rand));
  }
}

const paintFlameA: PixelPainter = (ctx, rand, size) => paintFlame(ctx, rand, size);
const paintFlameB: PixelPainter = (ctx, rand, size) => paintFlame(ctx, rand, size);

// vent glow strip
const paintVentGlow: PixelPainter = (ctx, rand, size) => {
  ctx.clearRect(0, 0, size, size);
  // glow fills most of the texture
  fillNoise(ctx, rand, VENT_GLOW, 1, 1, size - 2, size - 2);
  // darker edges
  for (let y = 0; y < size; y++) {
    setPixel(ctx, 0, y, VENT_EDGE);
    setPixel(ctx, size - 1, y, VENT_EDGE);
  }
  for (let x = 0; x < size; x++) {
    setPixel(ctx, x, 0, VENT_EDGE);
    setPixel(ctx, x, size - 1, VENT_EDGE);
  }
};

// ---------------------------------------------------------------------------
// registry
// ---------------------------------------------------------------------------

const PAINTERS: Readonly<Record<FurnaceTextureKey, PixelPainter>> = {
  [FurnaceTextureKey.Stones]: paintStones,
  [FurnaceTextureKey.Frame]: paintFrame,
  [FurnaceTextureKey.Band]: paintBand,
  [FurnaceTextureKey.Wall]: paintWall,
  [FurnaceTextureKey.Back]: paintBack,
  [FurnaceTextureKey.Grate]: paintGrate,
  [FurnaceTextureKey.Bark]: paintBark,
  [FurnaceTextureKey.Charred]: paintCharred,
  [FurnaceTextureKey.Ash]: paintAsh,
  [FurnaceTextureKey.Ember]: paintEmber,
  [FurnaceTextureKey.FlameA]: paintFlameA,
  [FurnaceTextureKey.FlameB]: paintFlameB,
  [FurnaceTextureKey.VentGlow]: paintVentGlow,
};

// cached per key, only call this on the client inside the Canvas
export function getFurnaceTexture(key: FurnaceTextureKey): CanvasTexture {
  return createPixelTexture(key, PAINTERS[key]);
}
