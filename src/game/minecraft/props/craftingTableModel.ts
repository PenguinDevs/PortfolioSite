import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PIXEL_TEXTURE_SIZE } from '../constants';
import { BoxFaceIndex, PROP_TEXEL, createTexelBox } from '../propTextures';
import type { BoxFaceOrigins, TexelOrigin } from '../propTextures';
import {
  DARK_BAR_ORIGIN,
  DARK_HANDLE_ORIGIN,
  DARK_POST_ORIGIN,
  DARK_TRIM_ORIGIN,
  KNOT_ORIGIN,
  KNOT_SIZE,
  LEATHER_LEFT_WING_ORIGIN,
  LEATHER_MAT_ORIGIN,
  LEATHER_PLAIN_ORIGINS,
  LEATHER_RIGHT_WING_ORIGIN,
  METAL_DARK_ORIGIN,
  METAL_ORIGIN,
  METAL_SHINE_ORIGIN,
  PLANK_BOARD_ORIGINS,
  PLANK_SIDE_ORIGIN,
  PLANK_SKIRTING_ORIGIN,
} from './craftingTableTextures';

// the crafting table is built from lots of little texel boxes, merged into one geometry per
// material and outline style. everything here is measured in texels: x and z run -8..8
// across the block and y runs 0..16 up from the floor, which is the prop's origin

export enum TableMaterial {
  Planks = 'planks',
  DarkWood = 'darkWood',
  Leather = 'leather',
  Metal = 'metal',
}

// big features get ink outlines, small relief stays plain so the outline reads cleanly
export enum Outline {
  Ink = 'ink',
  Plain = 'plain',
}

export interface CraftingTablePart {
  material: TableMaterial;
  outline: Outline;
  geometry: BufferGeometry;
}

interface PieceStyle {
  material: TableMaterial;
  outline: Outline;
}

const PLANKS_INK: PieceStyle = { material: TableMaterial.Planks, outline: Outline.Ink };
const PLANKS_PLAIN: PieceStyle = { material: TableMaterial.Planks, outline: Outline.Plain };
const DARK_INK: PieceStyle = { material: TableMaterial.DarkWood, outline: Outline.Ink };
const DARK_PLAIN: PieceStyle = { material: TableMaterial.DarkWood, outline: Outline.Plain };
const LEATHER_INK: PieceStyle = { material: TableMaterial.Leather, outline: Outline.Ink };
const LEATHER_PLAIN: PieceStyle = { material: TableMaterial.Leather, outline: Outline.Plain };
const METAL_INK: PieceStyle = { material: TableMaterial.Metal, outline: Outline.Ink };
const METAL_PLAIN: PieceStyle = { material: TableMaterial.Metal, outline: Outline.Plain };

// [from, to] in texels
type Span = readonly [number, number];

const HALF_BLOCK = PIXEL_TEXTURE_SIZE / 2;
const BLOCK_TOP = PIXEL_TEXTURE_SIZE;
// the planked body stops a texel short so the mat sits flush with the top of the block
const CORE_TOP = BLOCK_TOP - 1;
const MAT_SPAN: Span = [CORE_TOP, BLOCK_TOP];

// corner posts are 3 texels square and stand a texel proud of both faces they meet
const POST_INNER = 6;
const POST_OUTER = HALF_BLOCK + 1;
// everything on a side lives between the posts
const PANEL: Span = [-POST_INNER, POST_INNER];

// how far relief stands out from a face, 0 is the face itself
const FLAT: Span = [0, 1];
const RAISED: Span = [0, 2];

// dark trim band around the top edge, it also forms a two texel rim around the mat
const TRIM_HEIGHT: Span = [13, BLOCK_TOP];
const TRIM_DEPTH: Span = [-1, 1];
const SKIRTING_HEIGHT: Span = [0, 2];

// strap down the middle of each side, broken by a metal buckle
const STRAP_WIDTH: Span = [-1, 1];
const STRAP_LOWER: Span = [SKIRTING_HEIGHT[1], 7];
const BUCKLE_HEIGHT: Span = [7, 9];
const STRAP_UPPER: Span = [9, TRIM_HEIGHT[0]];

// drapes lie over the rim from a texel inside the mat edge and hang off the face
const DRAPE_DEPTH: Span = [-2, 2];
const DRAPE_LIP = 1;

// the mat is notched at its corners where the posts come up through it
const MAT_EDGE = HALF_BLOCK - 1;

// 3 x 3 grid frame standing on the mat, outer frame taller than the bars inside
const GRID_OUTER = 6;
const GRID_INNER = 5;
const GRID_FRAME_HEIGHT: Span = [BLOCK_TOP, BLOCK_TOP + 2];
const GRID_BAR_HEIGHT: Span = [BLOCK_TOP, BLOCK_TOP + 1];
const GRID_BARS: readonly Span[] = [
  [-2, -1],
  [1, 2],
];
// the cross bars are split into pieces between the long bars so no two boxes overlap
const GRID_CELLS: readonly Span[] = [
  [-GRID_INNER, -2],
  [-1, 1],
  [2, GRID_INNER],
];

// ---------------------------------------------------------------------------
// sides of the table
// ---------------------------------------------------------------------------

export enum TableFace {
  Front = 'front',
  Back = 'back',
  Right = 'right',
  Left = 'left',
}

// u runs left to right along a side as seen from outside, w points out of it
interface FaceAxes {
  ux: number;
  uz: number;
  wx: number;
  wz: number;
}

const FACE_AXES: Readonly<Record<TableFace, FaceAxes>> = {
  [TableFace.Front]: { ux: 1, uz: 0, wx: 0, wz: 1 },
  [TableFace.Back]: { ux: -1, uz: 0, wx: 0, wz: -1 },
  [TableFace.Right]: { ux: 0, uz: -1, wx: 1, wz: 0 },
  [TableFace.Left]: { ux: 0, uz: 1, wx: -1, wz: 0 },
};

const ALL_FACES = [TableFace.Front, TableFace.Back, TableFace.Right, TableFace.Left] as const;
const POST_SIGNS = [-1, 1] as const;

// ---------------------------------------------------------------------------
// tools, measured on the side they hang from with u relative to the tool's left edge
// ---------------------------------------------------------------------------

interface ToolPiece {
  style: PieceStyle;
  u: Span;
  v: Span;
  w: Span;
  origin: TexelOrigin;
}

type ToolModel = readonly ToolPiece[];

// hand saw hanging by the hole in its handle from a nail, teeth down the right edge
const SAW: ToolModel = [
  { style: DARK_INK, u: [1, 2], v: [8, 12], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_INK, u: [2, 3], v: [11, 12], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_INK, u: [2, 3], v: [8, 9], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_INK, u: [3, 4], v: [8, 12], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: METAL_PLAIN, u: [2, 3], v: [10, 11], w: FLAT, origin: METAL_SHINE_ORIGIN },
  { style: METAL_INK, u: [1, 4], v: [5, 8], w: FLAT, origin: METAL_ORIGIN },
  { style: METAL_INK, u: [1, 3], v: [3, 5], w: FLAT, origin: METAL_ORIGIN },
  { style: METAL_PLAIN, u: [4, 5], v: [7, 8], w: FLAT, origin: METAL_DARK_ORIGIN },
  { style: METAL_PLAIN, u: [4, 5], v: [5, 6], w: FLAT, origin: METAL_DARK_ORIGIN },
  { style: METAL_PLAIN, u: [3, 4], v: [3, 4], w: FLAT, origin: METAL_DARK_ORIGIN },
];

// claw hammer resting head up on two pegs, leather wrapped grip
const HAMMER: ToolModel = [
  { style: METAL_INK, u: [0, 4], v: [10, 12], w: RAISED, origin: METAL_ORIGIN },
  { style: METAL_PLAIN, u: [4, 5], v: [9, 11], w: FLAT, origin: METAL_DARK_ORIGIN },
  { style: DARK_INK, u: [2, 3], v: [5, 10], w: FLAT, origin: DARK_HANDLE_ORIGIN },
  { style: LEATHER_PLAIN, u: [2, 3], v: [3, 5], w: RAISED, origin: LEATHER_PLAIN_ORIGINS[4] },
  { style: DARK_PLAIN, u: [1, 2], v: [9, 10], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_PLAIN, u: [3, 4], v: [9, 10], w: RAISED, origin: DARK_HANDLE_ORIGIN },
];

// chunky chisel resting on two pegs by its ferrule
const CHISEL: ToolModel = [
  { style: DARK_INK, u: [2, 4], v: [8, 12], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: METAL_PLAIN, u: [2, 4], v: [7, 8], w: RAISED, origin: METAL_SHINE_ORIGIN },
  { style: METAL_INK, u: [2, 4], v: [4, 7], w: FLAT, origin: METAL_ORIGIN },
  { style: METAL_PLAIN, u: [2, 4], v: [3, 4], w: FLAT, origin: METAL_DARK_ORIGIN },
  { style: DARK_PLAIN, u: [1, 2], v: [7, 8], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_PLAIN, u: [4, 5], v: [7, 8], w: RAISED, origin: DARK_HANDLE_ORIGIN },
];

// open jawed spanner hooked over a peg, chunky ring end at the bottom
const SPANNER: ToolModel = [
  { style: METAL_INK, u: [1, 4], v: [9, 10], w: RAISED, origin: METAL_ORIGIN },
  { style: METAL_INK, u: [1, 2], v: [10, 12], w: RAISED, origin: METAL_ORIGIN },
  { style: METAL_INK, u: [3, 4], v: [10, 12], w: RAISED, origin: METAL_ORIGIN },
  { style: DARK_PLAIN, u: [2, 3], v: [11, 12], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: METAL_INK, u: [2, 3], v: [5, 9], w: FLAT, origin: METAL_ORIGIN },
  { style: METAL_INK, u: [1, 4], v: [3, 5], w: RAISED, origin: METAL_ORIGIN },
];

// pliers hanging by their jaws from a peg, handles splaying out below the pivot
const PLIERS: ToolModel = [
  { style: METAL_INK, u: [1, 2], v: [10, 12], w: FLAT, origin: METAL_ORIGIN },
  { style: METAL_INK, u: [3, 4], v: [10, 12], w: FLAT, origin: METAL_ORIGIN },
  { style: METAL_INK, u: [1, 4], v: [8, 10], w: RAISED, origin: METAL_ORIGIN },
  { style: DARK_PLAIN, u: [2, 3], v: [11, 12], w: RAISED, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_INK, u: [1, 2], v: [5, 8], w: FLAT, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_INK, u: [0, 1], v: [3, 5], w: FLAT, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_INK, u: [3, 4], v: [5, 8], w: FLAT, origin: DARK_HANDLE_ORIGIN },
  { style: DARK_INK, u: [4, 5], v: [3, 5], w: FLAT, origin: DARK_HANDLE_ORIGIN },
];

// left edges of the two panels either side of the strap
const LEFT_PANEL = -POST_INNER;
const RIGHT_PANEL = STRAP_WIDTH[1];

// ---------------------------------------------------------------------------
// what goes on each side
// ---------------------------------------------------------------------------

// a strip of the mat hanging over the edge, drop is how far below the top of the block it reaches.
// strips over the strap stop above the trim's lower edge so they never clash with it
interface Drape {
  u: Span;
  drop: number;
}

interface Board {
  u: Span;
  v: Span;
  origin: TexelOrigin;
}

// bottom left corner of a raised knot
interface Knot {
  u: number;
  v: number;
}

interface HungTool {
  model: ToolModel;
  offset: number;
}

interface FaceDetail {
  drapes: readonly Drape[];
  boards: readonly Board[];
  knots: readonly Knot[];
  tools: readonly HungTool[];
}

const FACE_DETAILS: Readonly<Record<TableFace, FaceDetail>> = {
  [TableFace.Front]: {
    drapes: [
      { u: [-6, -4], drop: 1 },
      { u: [-3, 0], drop: 3 },
      { u: [0, 2], drop: 1 },
      { u: [3, 6], drop: 4 },
    ],
    boards: [],
    knots: [],
    tools: [
      { model: SAW, offset: LEFT_PANEL },
      { model: HAMMER, offset: RIGHT_PANEL },
    ],
  },
  [TableFace.Right]: {
    drapes: [
      { u: [-6, -3], drop: 2 },
      { u: [-2, 1], drop: 3 },
      { u: [2, 4], drop: 1 },
      { u: [4, 6], drop: 2 },
    ],
    boards: [],
    knots: [],
    tools: [
      { model: CHISEL, offset: LEFT_PANEL },
      { model: SPANNER, offset: RIGHT_PANEL },
    ],
  },
  [TableFace.Left]: {
    drapes: [
      { u: [-5, -2], drop: 3 },
      { u: [-2, 0], drop: 1 },
      { u: [0, 3], drop: 2 },
      { u: [4, 6], drop: 4 },
    ],
    boards: [{ u: [-6, -1], v: [5, 8], origin: PLANK_BOARD_ORIGINS[2] }],
    knots: [{ u: -4, v: 10 }],
    tools: [{ model: PLIERS, offset: RIGHT_PANEL }],
  },
  [TableFace.Back]: {
    drapes: [
      { u: [-6, -2], drop: 2 },
      { u: [-1, 2], drop: 1 },
      { u: [2, 5], drop: 3 },
    ],
    boards: [
      { u: [-6, -1], v: [7, 10], origin: PLANK_BOARD_ORIGINS[0] },
      { u: [1, 6], v: [3, 6], origin: PLANK_BOARD_ORIGINS[1] },
    ],
    knots: [
      { u: -4, v: 3 },
      { u: 3, v: 9 },
    ],
    tools: [],
  },
};

// ---------------------------------------------------------------------------
// building
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

const ordered = (a: number, b: number): Span => (a < b ? [a, b] : [b, a]);
const middle = ([from, to]: Span) => ((from + to) / 2) * PROP_TEXEL;

class TableBuilder {
  private readonly buckets = new Map<string, { style: PieceStyle; boxes: BufferGeometry[] }>();
  private drapeCount = 0;

  box(style: PieceStyle, x: Span, y: Span, z: Span, origin: TexelOrigin) {
    const geometry = createTexelBox(x[1] - x[0], y[1] - y[0], z[1] - z[0], sameOrigin(origin));
    geometry.translate(middle(x), middle(y), middle(z));

    const key = `${style.material}:${style.outline}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { style, boxes: [] };
      this.buckets.set(key, bucket);
    }
    bucket.boxes.push(geometry);
  }

  // box on one side measured in that side's own axes, see FaceAxes
  faceBox(face: TableFace, style: PieceStyle, u: Span, v: Span, w: Span, origin: TexelOrigin) {
    const { ux, uz, wx, wz } = FACE_AXES[face];
    const x = ordered(ux * u[0] + wx * (HALF_BLOCK + w[0]), ux * u[1] + wx * (HALF_BLOCK + w[1]));
    const z = ordered(uz * u[0] + wz * (HALF_BLOCK + w[0]), uz * u[1] + wz * (HALF_BLOCK + w[1]));
    this.box(style, x, v, z, origin);
  }

  tool(face: TableFace, { model, offset }: HungTool) {
    for (const { style, u, v, w, origin } of model) {
      this.faceBox(face, style, [u[0] + offset, u[1] + offset], v, w, origin);
    }
  }

  drape(face: TableFace, { u, drop }: Drape) {
    const origin = LEATHER_PLAIN_ORIGINS[this.drapeCount++ % LEATHER_PLAIN_ORIGINS.length];
    this.faceBox(face, LEATHER_INK, u, [BLOCK_TOP - drop, BLOCK_TOP + DRAPE_LIP], DRAPE_DEPTH, origin);
  }

  build(): CraftingTablePart[] {
    const parts: CraftingTablePart[] = [];
    for (const { style, boxes } of this.buckets.values()) {
      const geometry = mergeGeometries(boxes);
      for (const box of boxes) box.dispose();
      if (!geometry) throw new Error('crafting table: failed to merge geometry');
      parts.push({ material: style.material, outline: style.outline, geometry });
    }
    return parts;
  }
}

function addBody(builder: TableBuilder) {
  builder.box(PLANKS_INK, [-HALF_BLOCK, HALF_BLOCK], [0, CORE_TOP], [-HALF_BLOCK, HALF_BLOCK], PLANK_SIDE_ORIGIN);

  for (const sx of POST_SIGNS) {
    for (const sz of POST_SIGNS) {
      const x = ordered(sx * POST_INNER, sx * POST_OUTER);
      const z = ordered(sz * POST_INNER, sz * POST_OUTER);
      builder.box(DARK_INK, x, [0, BLOCK_TOP], z, DARK_POST_ORIGIN);
    }
  }
}

function addSide(builder: TableBuilder, face: TableFace) {
  builder.faceBox(face, DARK_INK, PANEL, TRIM_HEIGHT, TRIM_DEPTH, DARK_TRIM_ORIGIN);
  builder.faceBox(face, PLANKS_PLAIN, PANEL, SKIRTING_HEIGHT, FLAT, PLANK_SKIRTING_ORIGIN);

  builder.faceBox(face, DARK_PLAIN, STRAP_WIDTH, STRAP_LOWER, FLAT, DARK_HANDLE_ORIGIN);
  builder.faceBox(face, DARK_PLAIN, STRAP_WIDTH, STRAP_UPPER, FLAT, DARK_HANDLE_ORIGIN);
  builder.faceBox(face, METAL_PLAIN, STRAP_WIDTH, BUCKLE_HEIGHT, RAISED, METAL_SHINE_ORIGIN);

  const detail = FACE_DETAILS[face];
  for (const drape of detail.drapes) builder.drape(face, drape);
  for (const { u, v, origin } of detail.boards) builder.faceBox(face, PLANKS_PLAIN, u, v, FLAT, origin);
  for (const { u, v } of detail.knots) {
    builder.faceBox(face, PLANKS_PLAIN, [u, u + KNOT_SIZE], [v, v + KNOT_SIZE], FLAT, KNOT_ORIGIN);
  }
  for (const tool of detail.tools) builder.tool(face, tool);
}

function addTop(builder: TableBuilder) {
  builder.box(LEATHER_PLAIN, [-POST_INNER, POST_INNER], MAT_SPAN, [-MAT_EDGE, MAT_EDGE], LEATHER_MAT_ORIGIN);
  builder.box(LEATHER_PLAIN, [-MAT_EDGE, -POST_INNER], MAT_SPAN, [-POST_INNER, POST_INNER], LEATHER_LEFT_WING_ORIGIN);
  builder.box(LEATHER_PLAIN, [POST_INNER, MAT_EDGE], MAT_SPAN, [-POST_INNER, POST_INNER], LEATHER_RIGHT_WING_ORIGIN);

  // outer frame: front and back bars run the full width, the sides fit between them
  const outer: Span = [-GRID_OUTER, GRID_OUTER];
  const inner: Span = [-GRID_INNER, GRID_INNER];
  builder.box(DARK_INK, outer, GRID_FRAME_HEIGHT, [GRID_INNER, GRID_OUTER], DARK_BAR_ORIGIN);
  builder.box(DARK_INK, outer, GRID_FRAME_HEIGHT, [-GRID_OUTER, -GRID_INNER], DARK_BAR_ORIGIN);
  builder.box(DARK_INK, [-GRID_OUTER, -GRID_INNER], GRID_FRAME_HEIGHT, inner, DARK_BAR_ORIGIN);
  builder.box(DARK_INK, [GRID_INNER, GRID_OUTER], GRID_FRAME_HEIGHT, inner, DARK_BAR_ORIGIN);

  for (const bar of GRID_BARS) {
    builder.box(DARK_PLAIN, bar, GRID_BAR_HEIGHT, inner, DARK_BAR_ORIGIN);
    for (const cell of GRID_CELLS) builder.box(DARK_PLAIN, cell, GRID_BAR_HEIGHT, bar, DARK_BAR_ORIGIN);
  }
}

// builds the whole table once, the caller owns and disposes the returned geometries
export function buildCraftingTableParts(): CraftingTablePart[] {
  const builder = new TableBuilder();
  addBody(builder);
  for (const face of ALL_FACES) addSide(builder, face);
  addTop(builder);
  return builder.build();
}
