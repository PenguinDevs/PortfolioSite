import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PIXEL_TEXTURE_SIZE } from '../constants';
import { BoxFaceIndex, PROP_TEXEL, createTexelBox } from '../propTextures';
import type { BoxFaceOrigins, TexelOrigin } from '../propTextures';
import {
  BAR_ORIGIN,
  HANDLE_ORIGIN,
  METAL_DARK_ORIGIN,
  METAL_ORIGIN,
  PANEL_ORIGIN,
  PLANK_LOWER_BOARD_ORIGIN,
  PLANK_MIDDLE_BOARD_ORIGIN,
  PLANK_SIDE_ORIGIN,
  PLANK_UPPER_BOARD_ORIGIN,
  POST_ORIGIN,
  TRIM_ORIGIN,
} from './craftingTableTextures';

// the crafting table is built from little texel boxes, merged into one geometry per
// material and outline style. everything here is measured in texels: x and z run -8..8
// across the block and y runs 0..16 up from the floor, which is the prop's origin. no part
// reaches past those bounds, so the table fills its block exactly like a full block does

export enum TableMaterial {
  Planks = 'planks',
  Panel = 'panel',
  Trim = 'trim',
  Bar = 'bar',
  Post = 'post',
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
const PANEL_PLAIN: PieceStyle = { material: TableMaterial.Panel, outline: Outline.Plain };
const TRIM_INK: PieceStyle = { material: TableMaterial.Trim, outline: Outline.Ink };
const BAR_INK: PieceStyle = { material: TableMaterial.Bar, outline: Outline.Ink };
const POST_INK: PieceStyle = { material: TableMaterial.Post, outline: Outline.Ink };
const METAL_INK: PieceStyle = { material: TableMaterial.Metal, outline: Outline.Ink };
const METAL_PLAIN: PieceStyle = { material: TableMaterial.Metal, outline: Outline.Plain };

// [from, to] in texels
type Span = readonly [number, number];

const HALF_BLOCK = PIXEL_TEXTURE_SIZE / 2;
const BLOCK_TOP = PIXEL_TEXTURE_SIZE;
// the body sits a texel inside the block on every side and the work surface a texel under its
// top, so the relief standing a texel proud and the grid on top end on the block's own faces
const FACE_PLANE = HALF_BLOCK - 1;
const WORK_TOP = BLOCK_TOP - 1;
// the planked body stops a texel short, the work surface panel sits on it flush with the trim
const CORE_TOP = WORK_TOP - 1;

// corner posts are 2 texels square on each face and stand a texel proud
const POST_INNER = FACE_PLANE - 1;
const POST_OUTER = FACE_PLANE + 1;
// everything on a side lives between the posts
const PANEL: Span = [-POST_INNER, POST_INNER];

// how far relief stands out from a face, 0 is the face itself
const FLAT: Span = [0, 1];

// thin trim along the top edge, a texel proud and wrapping a texel over the top
// so it rings the work surface
const TRIM_HEIGHT: Span = [WORK_TOP - 2, WORK_TOP];
const TRIM_DEPTH: Span = [-1, 1];

// 3 x 3 grid of bars on the work surface: the outer bars sit on the inner half of the trim,
// leaving cells 3, 4 and 3 texels across between the bars
const GRID_HEIGHT: Span = [WORK_TOP, BLOCK_TOP];
const GRID_EDGE = FACE_PLANE;
const GRID_INSIDE = FACE_PLANE - 1;
const GRID_BARS: readonly Span[] = [
  [-3, -2],
  [2, 3],
];
// cross bars are split between the long bars so no two boxes overlap
const GRID_CELLS: readonly Span[] = [
  [-GRID_INSIDE, -3],
  [-2, 2],
  [3, GRID_INSIDE],
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
// tools, a texel proud, measured with u relative to the tool's left edge
// ---------------------------------------------------------------------------

interface ToolPiece {
  style: PieceStyle;
  u: Span;
  v: Span;
  origin: TexelOrigin;
}

type ToolModel = readonly ToolPiece[];

// hand saw with an open handle on top and three teeth down the right edge
const SAW: ToolModel = [
  { style: POST_INK, u: [0, 1], v: [9, 12], origin: HANDLE_ORIGIN },
  { style: POST_INK, u: [1, 2], v: [11, 12], origin: HANDLE_ORIGIN },
  { style: POST_INK, u: [1, 2], v: [9, 10], origin: HANDLE_ORIGIN },
  { style: POST_INK, u: [2, 3], v: [9, 12], origin: HANDLE_ORIGIN },
  { style: METAL_INK, u: [0, 3], v: [5, 9], origin: METAL_ORIGIN },
  { style: METAL_INK, u: [0, 2], v: [3, 5], origin: METAL_ORIGIN },
  { style: METAL_PLAIN, u: [3, 4], v: [7, 8], origin: METAL_DARK_ORIGIN },
  { style: METAL_PLAIN, u: [3, 4], v: [5, 6], origin: METAL_DARK_ORIGIN },
  { style: METAL_PLAIN, u: [2, 3], v: [3, 4], origin: METAL_DARK_ORIGIN },
];

// hammer standing head up
const HAMMER: ToolModel = [
  { style: METAL_INK, u: [0, 5], v: [10, 12], origin: METAL_ORIGIN },
  { style: POST_INK, u: [2, 3], v: [3, 10], origin: HANDLE_ORIGIN },
];

// chisel, blade down
const CHISEL: ToolModel = [
  { style: POST_INK, u: [0, 2], v: [8, 12], origin: HANDLE_ORIGIN },
  { style: METAL_INK, u: [0, 2], v: [4, 8], origin: METAL_ORIGIN },
  { style: METAL_PLAIN, u: [0, 2], v: [3, 4], origin: METAL_DARK_ORIGIN },
];

// pliers, jaws up and handles splaying out below the pivot
const PLIERS: ToolModel = [
  { style: METAL_INK, u: [1, 2], v: [10, 12], origin: METAL_ORIGIN },
  { style: METAL_INK, u: [3, 4], v: [10, 12], origin: METAL_ORIGIN },
  { style: METAL_INK, u: [1, 4], v: [8, 10], origin: METAL_ORIGIN },
  { style: POST_INK, u: [1, 2], v: [5, 8], origin: HANDLE_ORIGIN },
  { style: POST_INK, u: [0, 1], v: [2, 5], origin: HANDLE_ORIGIN },
  { style: POST_INK, u: [3, 4], v: [5, 8], origin: HANDLE_ORIGIN },
  { style: POST_INK, u: [4, 5], v: [2, 5], origin: HANDLE_ORIGIN },
];

// ---------------------------------------------------------------------------
// what goes on each side
// ---------------------------------------------------------------------------

// a board pushed out a texel, its spans line up with a board painted on the planks
interface RaisedBoard {
  u: Span;
  v: Span;
  origin: TexelOrigin;
}

// board rows on the sides, matching the plank texture
const MIDDLE_BOARD: Span = [5, 9];
const UPPER_BOARD: Span = [10, 12];
const LOWER_BOARD: Span = [1, 4];

interface HungTool {
  model: ToolModel;
  offset: number;
}

interface FaceDetail {
  boards: readonly RaisedBoard[];
  tools: readonly HungTool[];
}

const FACE_DETAILS: Readonly<Record<TableFace, FaceDetail>> = {
  [TableFace.Front]: {
    boards: [],
    tools: [
      { model: SAW, offset: -5 },
      { model: HAMMER, offset: 0 },
    ],
  },
  [TableFace.Right]: {
    boards: [{ u: [2, 6], v: UPPER_BOARD, origin: PLANK_UPPER_BOARD_ORIGIN }],
    tools: [{ model: CHISEL, offset: -1 }],
  },
  [TableFace.Left]: {
    boards: [{ u: [2, 6], v: LOWER_BOARD, origin: PLANK_LOWER_BOARD_ORIGIN }],
    tools: [{ model: PLIERS, offset: -4 }],
  },
  [TableFace.Back]: {
    boards: [
      { u: [-6, -1], v: MIDDLE_BOARD, origin: PLANK_MIDDLE_BOARD_ORIGIN },
      { u: [1, 6], v: LOWER_BOARD, origin: PLANK_LOWER_BOARD_ORIGIN },
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
    const x = ordered(ux * u[0] + wx * (FACE_PLANE + w[0]), ux * u[1] + wx * (FACE_PLANE + w[1]));
    const z = ordered(uz * u[0] + wz * (FACE_PLANE + w[0]), uz * u[1] + wz * (FACE_PLANE + w[1]));
    this.box(style, x, v, z, origin);
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
  builder.box(PLANKS_INK, [-FACE_PLANE, FACE_PLANE], [0, CORE_TOP], [-FACE_PLANE, FACE_PLANE], PLANK_SIDE_ORIGIN);

  for (const sx of POST_SIGNS) {
    for (const sz of POST_SIGNS) {
      const x = ordered(sx * POST_INNER, sx * POST_OUTER);
      const z = ordered(sz * POST_INNER, sz * POST_OUTER);
      builder.box(POST_INK, x, [0, WORK_TOP], z, POST_ORIGIN);
    }
  }
}

function addSide(builder: TableBuilder, face: TableFace) {
  builder.faceBox(face, TRIM_INK, PANEL, TRIM_HEIGHT, TRIM_DEPTH, TRIM_ORIGIN);

  const { boards, tools } = FACE_DETAILS[face];
  for (const { u, v, origin } of boards) builder.faceBox(face, PLANKS_PLAIN, u, v, FLAT, origin);
  for (const { model, offset } of tools) {
    for (const { style, u, v, origin } of model) {
      builder.faceBox(face, style, [u[0] + offset, u[1] + offset], v, FLAT, origin);
    }
  }
}

function addTop(builder: TableBuilder) {
  const inside: Span = [-GRID_INSIDE, GRID_INSIDE];
  builder.box(PANEL_PLAIN, inside, [CORE_TOP, WORK_TOP], inside, PANEL_ORIGIN);

  // outer bars: front and back run the full width, the sides fit between them
  const edge: Span = [-GRID_EDGE, GRID_EDGE];
  builder.box(BAR_INK, edge, GRID_HEIGHT, [GRID_INSIDE, GRID_EDGE], BAR_ORIGIN);
  builder.box(BAR_INK, edge, GRID_HEIGHT, [-GRID_EDGE, -GRID_INSIDE], BAR_ORIGIN);
  builder.box(BAR_INK, [-GRID_EDGE, -GRID_INSIDE], GRID_HEIGHT, inside, BAR_ORIGIN);
  builder.box(BAR_INK, [GRID_INSIDE, GRID_EDGE], GRID_HEIGHT, inside, BAR_ORIGIN);

  for (const bar of GRID_BARS) {
    builder.box(BAR_INK, bar, GRID_HEIGHT, inside, BAR_ORIGIN);
    for (const cell of GRID_CELLS) builder.box(BAR_INK, cell, GRID_HEIGHT, bar, BAR_ORIGIN);
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
