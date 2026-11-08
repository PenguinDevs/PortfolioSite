import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BoxFaceIndex, PROP_TEXEL, createTexelBox } from '../propTextures';
import type { BoxFaceOrigins, TexelOrigin } from '../propTextures';
import {
  STONE_ORIGIN,
  FRAME_ORIGIN,
  BAND_ORIGIN,
  WALL_ORIGIN,
  GRATE_ORIGIN,
  BARK_ORIGIN,
  CHARRED_ORIGIN,
  EMBER_ORIGIN,
} from './furnaceTextures';

// the furnace is built from texel boxes merged into one geometry per material
// and outline class. everything is measured in texels: x and z run -8..8
// across the block and y runs 0..16 up from the floor

export enum FurnaceMaterial {
  Stones = 'stones',
  Frame = 'frame',
  Band = 'band',
  Wall = 'wall',
  Grate = 'grate',
  Bark = 'bark',
  Charred = 'charred',
  Ember = 'ember',
}

// big features get ink outlines, small relief stays plain
export enum Outline {
  Ink = 'ink',
  Plain = 'plain',
}

export interface FurnacePart {
  material: FurnaceMaterial;
  outline: Outline;
  geometry: BufferGeometry;
}

interface PieceStyle {
  material: FurnaceMaterial;
  outline: Outline;
}

const STONES_INK: PieceStyle = { material: FurnaceMaterial.Stones, outline: Outline.Ink };
const STONES_PLAIN: PieceStyle = { material: FurnaceMaterial.Stones, outline: Outline.Plain };
const FRAME_INK: PieceStyle = { material: FurnaceMaterial.Frame, outline: Outline.Ink };
const BAND_INK: PieceStyle = { material: FurnaceMaterial.Band, outline: Outline.Ink };
const WALL_PLAIN: PieceStyle = { material: FurnaceMaterial.Wall, outline: Outline.Plain };
const GRATE_PLAIN: PieceStyle = { material: FurnaceMaterial.Grate, outline: Outline.Plain };
const EMBER_PLAIN: PieceStyle = { material: FurnaceMaterial.Ember, outline: Outline.Plain };

// [from, to] in texels, exclusive upper bound
type Span = readonly [number, number];

const HALF = 8;
// frame ring is 2 texels wide around each face
const FRAME_W = 2;
// inner edge of the frame in each axis
const INNER = HALF - FRAME_W; // 6

// smooth stone band covers the bottom 3 texel rows
const BAND_TOP = 3;

// fire opening on the front (+z): 8 wide, 5 tall, 5 deep from the panel face
const FIRE_X: Span = [-4, 4];
const FIRE_Y: Span = [BAND_TOP, 8];
const OPEN_DEPTH = 5; // both openings share this depth

// upper opening: 8 wide, 4 tall, same depth
const UPPER_X: Span = [-4, 4];
const UPPER_Y: Span = [10, 14];

// shelf divider between the two openings
const SHELF_Y: Span = [8, 10];

// the panel face sits at the inner edge of the frame
const PANEL_Z = INNER; // z = 6
// opening back walls sit here
const BACK_Z = PANEL_Z - OPEN_DEPTH; // z = 1

// vent slit positions on the +x side (y values)
const VENT_Y_POSITIONS = [10, 12] as const;
const VENT_WIDTH = 4; // z extent
const VENT_DEPTH = 2; // x extent inward from the panel face

// grate bar x offsets from centre (vertical bars) in the upper opening
const GRATE_BAR_X = [-2, 1] as const;
// horizontal crossbar y position
const GRATE_CROSS_Y = 12;

// ---------------------------------------------------------------------------
// origin helper: maps all box faces to the same texture origin
// ---------------------------------------------------------------------------

function sameOrigin(origin: TexelOrigin): BoxFaceOrigins {
  return {
    [BoxFaceIndex.PlusX]: origin,
    [BoxFaceIndex.MinusX]: origin,
    [BoxFaceIndex.PlusY]: origin,
    [BoxFaceIndex.MinusY]: origin,
    [BoxFaceIndex.PlusZ]: origin,
    [BoxFaceIndex.MinusZ]: origin,
  };
}

// ---------------------------------------------------------------------------
// builder: collects boxes into buckets by material + outline, then merges
// ---------------------------------------------------------------------------

class FurnaceBuilder {
  private readonly buckets = new Map<string, { style: PieceStyle; boxes: BufferGeometry[] }>();

  box(style: PieceStyle, x: Span, y: Span, z: Span, origin: TexelOrigin) {
    const w = x[1] - x[0];
    const h = y[1] - y[0];
    const d = z[1] - z[0];
    if (w <= 0 || h <= 0 || d <= 0) return;
    const geometry = createTexelBox(w, h, d, sameOrigin(origin));
    geometry.translate(
      ((x[0] + x[1]) / 2) * PROP_TEXEL,
      ((y[0] + y[1]) / 2) * PROP_TEXEL,
      ((z[0] + z[1]) / 2) * PROP_TEXEL,
    );

    const key = `${style.material}:${style.outline}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { style, boxes: [] };
      this.buckets.set(key, bucket);
    }
    bucket.boxes.push(geometry);
  }

  build(): FurnacePart[] {
    const parts: FurnacePart[] = [];
    for (const { style, boxes } of this.buckets.values()) {
      if (boxes.length === 0) continue;
      const geometry = mergeGeometries(boxes);
      for (const box of boxes) box.dispose();
      if (!geometry) throw new Error('furnace: failed to merge geometry');
      parts.push({ material: style.material, outline: style.outline, geometry });
    }
    return parts;
  }
}

// ---------------------------------------------------------------------------
// body: band, frame, and the core split around the two openings
// ---------------------------------------------------------------------------

function addBody(b: FurnaceBuilder) {
  // smooth stone band covering the full block base
  b.box(BAND_INK, [-HALF, HALF], [0, BAND_TOP], [-HALF, HALF], BAND_ORIGIN);

  // four corner posts from the top of the band to the top of the block
  for (const sx of [-1, 1] as const) {
    for (const sz of [-1, 1] as const) {
      const px: Span = sx < 0 ? [-HALF, -INNER] : [INNER, HALF];
      const pz: Span = sz < 0 ? [-HALF, -INNER] : [INNER, HALF];
      b.box(FRAME_INK, px, [BAND_TOP, 16], pz, FRAME_ORIGIN);
    }
  }

  // top rails between posts (y 14..16)
  const topY: Span = [16 - FRAME_W, 16];
  b.box(FRAME_INK, [-INNER, INNER], topY, [-HALF, -INNER], FRAME_ORIGIN);  // back
  b.box(FRAME_INK, [-INNER, INNER], topY, [INNER, HALF], FRAME_ORIGIN);    // front
  b.box(FRAME_INK, [-HALF, -INNER], topY, [-INNER, INNER], FRAME_ORIGIN);  // left
  b.box(FRAME_INK, [INNER, HALF], topY, [-INNER, INNER], FRAME_ORIGIN);    // right

  // the core (panel region inside the frame, above the band) is split into pieces
  // that leave the fire and upper openings empty on the front face.
  // openings carve x [-4,4], z [BACK_Z, PANEL_Z] at their respective y ranges
  //
  // back slab: behind both openings
  b.box(STONES_INK, [-INNER, INNER], [BAND_TOP, 16 - FRAME_W], [-INNER, BACK_Z], STONE_ORIGIN);

  // left and right columns flanking the openings (split at the shelf)
  for (const side of [-1, 1] as const) {
    const cx: Span = side < 0 ? [-INNER, FIRE_X[0]] : [FIRE_X[1], INNER];
    b.box(STONES_INK, cx, [BAND_TOP, SHELF_Y[0]], [BACK_Z, PANEL_Z], STONE_ORIGIN);  // lower
    b.box(STONES_INK, cx, [SHELF_Y[1], 16 - FRAME_W], [BACK_Z, PANEL_Z], STONE_ORIGIN); // upper
    b.box(STONES_INK, cx, SHELF_Y, [BACK_Z, PANEL_Z], STONE_ORIGIN);                 // shelf level
  }

  // shelf spanning the full panel width between the two openings
  b.box(BAND_INK, FIRE_X, SHELF_Y, [BACK_Z, PANEL_Z], BAND_ORIGIN);
}

// ---------------------------------------------------------------------------
// opening interiors: dark back walls inside each recess
// ---------------------------------------------------------------------------

function addOpeningInteriors(b: FurnaceBuilder) {
  // fire back wall: sits just in front of the back slab
  b.box(WALL_PLAIN, FIRE_X, FIRE_Y, [BACK_Z, BACK_Z + 1], WALL_ORIGIN);
  // upper opening back wall
  b.box(WALL_PLAIN, UPPER_X, UPPER_Y, [BACK_Z, BACK_Z + 1], WALL_ORIGIN);
}

// ---------------------------------------------------------------------------
// vent slits on the +x side: shallow cuts with glow planes added by component
// ---------------------------------------------------------------------------

function addVentRecesses(b: FurnaceBuilder) {
  // the vents cut into the right side of the core, which is the right column pieces.
  // since the right columns are already placed as solid boxes, we add small dark boxes
  // inset from the panel face to suggest the vent slot. the slot is shallow enough that
  // a thin dark box on the face reads as a recess
  const ventPanelX = INNER; // +x panel face position
  for (const vy of VENT_Y_POSITIONS) {
    // dark back of the vent slot, sits just inside the +x face
    b.box(WALL_PLAIN,
      [ventPanelX - VENT_DEPTH, ventPanelX - VENT_DEPTH + 1],
      [vy, vy + 1],
      [-VENT_WIDTH / 2, VENT_WIDTH / 2],
      WALL_ORIGIN,
    );
  }
}

// ---------------------------------------------------------------------------
// grate bars in the upper opening
// ---------------------------------------------------------------------------

function addGrate(b: FurnaceBuilder) {
  // vertical bars: 1 wide, full height of upper opening, 1 deep, set 2 texels back
  const barZ: Span = [PANEL_Z - 3, PANEL_Z - 2];
  for (const bx of GRATE_BAR_X) {
    b.box(GRATE_PLAIN, [bx, bx + 1], UPPER_Y, barZ, GRATE_ORIGIN);
  }
  // horizontal crossbar: spans the opening width, 1 tall
  // split into pieces between the vertical bars to avoid overlapping geometry
  const crossY: Span = [GRATE_CROSS_Y, GRATE_CROSS_Y + 1];
  b.box(GRATE_PLAIN, [UPPER_X[0], GRATE_BAR_X[0]], crossY, barZ, GRATE_ORIGIN);
  b.box(GRATE_PLAIN, [GRATE_BAR_X[0] + 1, GRATE_BAR_X[1]], crossY, barZ, GRATE_ORIGIN);
  b.box(GRATE_PLAIN, [GRATE_BAR_X[1] + 1, UPPER_X[1]], crossY, barZ, GRATE_ORIGIN);
}

// ---------------------------------------------------------------------------
// raised relief stones on the side, top and back panels
// ---------------------------------------------------------------------------

function addRelief(b: FurnaceBuilder) {
  // stones stand 1 texel proud of the recessed panel face (flush with the frame)

  // front face (+z): narrow strips beside the openings
  b.box(STONES_PLAIN, [-INNER, FIRE_X[0]], [SHELF_Y[1], UPPER_Y[0]],
    [PANEL_Z, PANEL_Z + 1], STONE_ORIGIN);
  b.box(STONES_PLAIN, [FIRE_X[1], INNER], [SHELF_Y[1], UPPER_Y[0]],
    [PANEL_Z, PANEL_Z + 1], STONE_ORIGIN);

  // top face (+y): a few raised stones on the recessed top panel
  const topPanel = 16 - FRAME_W;
  b.box(STONES_PLAIN, [-4, -1], [topPanel, topPanel + 1], [-4, 0], STONE_ORIGIN);
  b.box(STONES_PLAIN, [1, 4], [topPanel, topPanel + 1], [1, 5], STONE_ORIGIN);
  b.box(STONES_PLAIN, [-2, 2], [topPanel, topPanel + 1], [-INNER, -3], STONE_ORIGIN);

  // +x side: three raised stones, avoiding the vent positions
  b.box(STONES_PLAIN, [PANEL_Z, PANEL_Z + 1], [BAND_TOP + 1, BAND_TOP + 4],
    [-4, -1], STONE_ORIGIN);
  b.box(STONES_PLAIN, [PANEL_Z, PANEL_Z + 1], [BAND_TOP + 1, BAND_TOP + 4],
    [2, 5], STONE_ORIGIN);
  b.box(STONES_PLAIN, [PANEL_Z, PANEL_Z + 1], [13, topPanel],
    [-3, 1], STONE_ORIGIN);

  // -x side: three raised stones
  b.box(STONES_PLAIN, [-(PANEL_Z + 1), -PANEL_Z], [BAND_TOP + 1, BAND_TOP + 4],
    [-3, 1], STONE_ORIGIN);
  b.box(STONES_PLAIN, [-(PANEL_Z + 1), -PANEL_Z], [8, 11],
    [2, 5], STONE_ORIGIN);
  b.box(STONES_PLAIN, [-(PANEL_Z + 1), -PANEL_Z], [12, topPanel],
    [-5, -2], STONE_ORIGIN);

  // back face (-z): three raised stones
  b.box(STONES_PLAIN, [-4, -1], [BAND_TOP + 1, BAND_TOP + 4],
    [-(PANEL_Z + 1), -PANEL_Z], STONE_ORIGIN);
  b.box(STONES_PLAIN, [1, 5], [8, 11],
    [-(PANEL_Z + 1), -PANEL_Z], STONE_ORIGIN);
  b.box(STONES_PLAIN, [-3, 1], [12, topPanel],
    [-(PANEL_Z + 1), -PANEL_Z], STONE_ORIGIN);
}

// ---------------------------------------------------------------------------
// ember bed on the fire floor
// ---------------------------------------------------------------------------

function addEmberBed(b: FurnaceBuilder) {
  // thin glowing slab just above the fire floor
  b.box(EMBER_PLAIN, FIRE_X, [FIRE_Y[0], FIRE_Y[0] + 1],
    [BACK_Z + 1, PANEL_Z - 1], EMBER_ORIGIN);
}

// ---------------------------------------------------------------------------
// public: build the complete shell
// ---------------------------------------------------------------------------

export function buildFurnaceParts(): FurnacePart[] {
  const builder = new FurnaceBuilder();
  addBody(builder);
  addOpeningInteriors(builder);
  addVentRecesses(builder);
  addGrate(builder);
  addRelief(builder);
  addEmberBed(builder);
  return builder.build();
}

// ---------------------------------------------------------------------------
// log geometry and placement (built separately so they can be rotated)
// ---------------------------------------------------------------------------

export interface FurnaceLogInfo {
  width: number;
  height: number;
  depth: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

// two crossed logs sitting in the fire chamber
export const FURNACE_LOGS: readonly FurnaceLogInfo[] = [
  {
    width: 6, height: 2, depth: 2,
    position: [0, (FIRE_Y[0] + 1) * PROP_TEXEL, ((BACK_Z + PANEL_Z) / 2) * PROP_TEXEL],
    rotation: [0, 0.5, 0.1],
  },
  {
    width: 6, height: 2, depth: 2,
    position: [0, (FIRE_Y[0] + 2.2) * PROP_TEXEL, ((BACK_Z + PANEL_Z) / 2) * PROP_TEXEL],
    rotation: [0, -0.5, -0.1],
  },
];

export function buildLogGeometry(info: FurnaceLogInfo, lit: boolean): BufferGeometry {
  const origin = lit ? BARK_ORIGIN : CHARRED_ORIGIN;
  return createTexelBox(info.width, info.height, info.depth, sameOrigin(origin));
}

// ---------------------------------------------------------------------------
// flame planes: front-facing cutout sprites inside the fire chamber
// ---------------------------------------------------------------------------

export interface FlamePlaneInfo {
  width: number;
  height: number;
  position: [number, number, number];
}

export const FLAME_PLANES: readonly FlamePlaneInfo[] = [
  // back flame (taller, nearer the back wall)
  {
    width: 6, height: 4,
    position: [0, (FIRE_Y[0] + 3) * PROP_TEXEL, (BACK_Z + 2) * PROP_TEXEL],
  },
  // front flame (shorter, near the mouth)
  {
    width: 5, height: 3,
    position: [0, (FIRE_Y[0] + 2.5) * PROP_TEXEL, (PANEL_Z - 2) * PROP_TEXEL],
  },
];

// ---------------------------------------------------------------------------
// vent glow planes on the +x side
// ---------------------------------------------------------------------------

export const VENT_GLOW_WIDTH = VENT_WIDTH;
export const VENT_GLOW_HEIGHT = 1;

export const VENT_GLOW_POSITIONS: readonly [number, number, number][] = VENT_Y_POSITIONS.map(vy => [
  INNER * PROP_TEXEL + 0.002, // just proud of the +x panel face
  (vy + 0.5) * PROP_TEXEL,
  0,
]);
