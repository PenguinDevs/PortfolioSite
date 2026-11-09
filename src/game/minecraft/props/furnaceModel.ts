import type { BufferGeometry } from 'three';
import { PIXEL_TEXTURE_SIZE } from '../constants';
import { PROP_TEXEL } from '../propTextures';
import { CELL_FACE_SHAPES, CELL_FACES, CellFace, TexelQuadBuilder, texelCentreU, texelCentreV } from './texelQuads';
import type { Vec3 } from './texelQuads';

// the furnace is a full block made of 16 x 16 x 16 texel sized cells with the openings of the
// vanilla front texture carved back into it. every visible cell face becomes one quad showing
// the texel that sits there on the vanilla texture, so from straight on it matches the block
// in game texel for texel. the fire opening faces +z and the origin is the bottom centre

// which material a face is drawn with
export enum FurnaceSurface {
  // furnace_front
  Front = 'front',
  // furnace_side on the left, right and back
  Side = 'side',
  // furnace_top on the top and bottom
  Top = 'top',
  // tinted stone lining the fire chamber
  Lining = 'lining',
}

export const FURNACE_SURFACES = Object.values(FurnaceSurface);

export interface FurnaceModel {
  surfaces: Record<FurnaceSurface, BufferGeometry>;
  // every face in one shape only geometry, so coplanar faces from different materials share
  // edges and only silhouettes and creases get inked
  inkGeometry: BufferGeometry;
}

const SIZE = PIXEL_TEXTURE_SIZE;
const HALF = SIZE / 2;
const LAST = SIZE - 1;
const CELL: Vec3 = [PROP_TEXEL, PROP_TEXEL, PROP_TEXEL];

// how the faces inside a carved out region are textured
enum Lining {
  // the hole's own front texels carried straight back, for shallow relief
  FrontTexels,
  // tinted stone walls round a dark back wall, for the fire chamber
  Soot,
}

// [row, first column, last column] of a hole on the front texture, rows count down from the top
type RowSpan = readonly [row: number, first: number, last: number];

// texels behind the front face, [from, to)
type DepthSpan = readonly [from: number, to: number];

interface Carve {
  rows: readonly RowSpan[];
  depth: DepthSpan;
  lining: Lining;
}

function rowsBetween(firstRow: number, lastRow: number, firstColumn: number, lastColumn: number): RowSpan[] {
  const rows: RowSpan[] = [];
  for (let row = firstRow; row <= lastRow; row++) rows.push([row, firstColumn, lastColumn]);
  return rows;
}

// the stepped arch of the top slot, following its dark texels on furnace_front
const TOP_SLOT_DEPTH = 2;
const TOP_SLOT: Carve = {
  rows: [
    [3, 5, 10],
    [4, 4, 11],
    [5, 3, 12],
    [6, 3, 12],
  ],
  depth: [0, TOP_SLOT_DEPTH],
  lining: Lining.FrontTexels,
};

// the fire mouth is cut through a front wall one texel thick, again following the dark
// texels on furnace_front. the row under it stays as a sill
const FRONT_WALL_DEPTH = 1;
const MOUTH: Carve = {
  rows: [
    [11, 5, 10],
    [12, 4, 11],
    [13, 3, 12],
    [14, 3, 12],
  ],
  depth: [0, FRONT_WALL_DEPTH],
  lining: Lining.Soot,
};

// behind the wall the chamber opens out to the widest part of the mouth and runs up past
// its top, so a fire taller than the mouth can stand in it with its tips out of sight
const CHAMBER_TOP_ROW = 8;
const CHAMBER_BOTTOM_ROW = 14;
const CHAMBER_FIRST_COLUMN = 3;
const CHAMBER_LAST_COLUMN = 12;
const CHAMBER_DEPTH = 6;
const FIRE_CHAMBER: Carve = {
  rows: rowsBetween(CHAMBER_TOP_ROW, CHAMBER_BOTTOM_ROW, CHAMBER_FIRST_COLUMN, CHAMBER_LAST_COLUMN),
  depth: [FRONT_WALL_DEPTH, CHAMBER_DEPTH],
  lining: Lining.Soot,
};

const CARVES: readonly Carve[] = [TOP_SLOT, MOUTH, FIRE_CHAMBER];

// the chamber's back wall samples the dark border along the top of the lining texture
const SOOT_BACK_ROW = 0;

// where the bottom centre of the fire goes: on the chamber floor, centred across the mouth and
// this many texels behind the front face, two texels clear of the inside of the front wall
const FIRE_DEPTH = 3;
export const FIRE_POSITION: Vec3 = [0, (LAST - CHAMBER_BOTTOM_ROW) * PROP_TEXEL, (HALF - FIRE_DEPTH) * PROP_TEXEL];

// grid value for a cell that is still stone, carved cells store their carve index plus one
const SOLID = 0;

function cellIndex(x: number, y: number, z: number): number {
  return (y * SIZE + z) * SIZE + x;
}

// cell x runs left to right seen from the front, y bottom to top and z back to front, so
// front texel (column, row) is the cell x = column, y = LAST - row in the front layer
function carveGrid(): Uint8Array {
  const grid = new Uint8Array(SIZE * SIZE * SIZE);
  CARVES.forEach((carve, carveIndex) => {
    const [fromDepth, toDepth] = carve.depth;
    for (const [row, first, last] of carve.rows) {
      for (let depth = fromDepth; depth < toDepth; depth++) {
        for (let column = first; column <= last; column++) {
          grid[cellIndex(column, LAST - row, LAST - depth)] = carveIndex + 1;
        }
      }
    }
  });
  return grid;
}

interface TexelPick {
  surface: FurnaceSurface;
  column: number;
  row: number;
}

// faces on the outside of the block, each texture upright as seen from outside it
function outerTexel(face: CellFace, x: number, y: number, z: number): TexelPick {
  switch (face) {
    case CellFace.Front:
      return { surface: FurnaceSurface.Front, column: x, row: LAST - y };
    case CellFace.Back:
      return { surface: FurnaceSurface.Side, column: LAST - x, row: LAST - y };
    case CellFace.Right:
      return { surface: FurnaceSurface.Side, column: LAST - z, row: LAST - y };
    case CellFace.Left:
      return { surface: FurnaceSurface.Side, column: z, row: LAST - y };
    // tops have the back of the block at the top of the texture, bottoms mirror that
    case CellFace.Top:
      return { surface: FurnaceSurface.Top, column: x, row: z };
    case CellFace.Bottom:
      return { surface: FurnaceSurface.Top, column: x, row: LAST - z };
  }
}

// faces of stone cells looking into the carved cell at (nx, ny, nz)
function liningTexel(face: CellFace, lining: Lining, x: number, y: number, z: number, nx: number, ny: number): TexelPick {
  if (lining === Lining.FrontTexels) return { surface: FurnaceSurface.Front, column: nx, row: LAST - ny };
  switch (face) {
    case CellFace.Front:
      return { surface: FurnaceSurface.Lining, column: x, row: SOOT_BACK_ROW };
    case CellFace.Back:
      return { surface: FurnaceSurface.Lining, column: x, row: LAST - y };
    case CellFace.Right:
    case CellFace.Left:
      return { surface: FurnaceSurface.Lining, column: z, row: LAST - y };
    case CellFace.Top:
    case CellFace.Bottom:
      return { surface: FurnaceSurface.Lining, column: x, row: z };
  }
}

// builds the whole block once, the caller owns and disposes the returned geometries
export function buildFurnaceModel(): FurnaceModel {
  const grid = carveGrid();
  const builders = {} as Record<FurnaceSurface, TexelQuadBuilder>;
  for (const surface of FURNACE_SURFACES) builders[surface] = new TexelQuadBuilder();
  const ink = new TexelQuadBuilder();

  for (let y = 0; y < SIZE; y++) {
    for (let z = 0; z < SIZE; z++) {
      for (let x = 0; x < SIZE; x++) {
        if (grid[cellIndex(x, y, z)] !== SOLID) continue;

        for (const face of CELL_FACES) {
          const [dx, dy, dz] = CELL_FACE_SHAPES[face].normal;
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;

          let pick: TexelPick;
          const outside = nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE || nz < 0 || nz >= SIZE;
          if (outside) {
            pick = outerTexel(face, x, y, z);
          } else {
            const neighbour = grid[cellIndex(nx, ny, nz)];
            if (neighbour === SOLID) continue;
            pick = liningTexel(face, CARVES[neighbour - 1].lining, x, y, z, nx, ny);
          }

          const u = texelCentreU(pick.column, SIZE);
          const v = texelCentreV(pick.row, SIZE);
          builders[pick.surface].addFace(face, x - HALF, y, z - HALF, CELL, u, v);
          ink.addFace(face, x - HALF, y, z - HALF, CELL, u, v);
        }
      }
    }
  }

  const surfaces = {} as Record<FurnaceSurface, BufferGeometry>;
  for (const surface of FURNACE_SURFACES) surfaces[surface] = builders[surface].build();
  return { surfaces, inkGeometry: ink.buildShape() };
}
