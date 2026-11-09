import { BufferAttribute, BufferGeometry } from 'three';

// builds geometry out of little axis aligned quads, one per face of a grid cell, where each
// quad shows a single texel. the uvs all point at the middle of that texel, so a quad is one
// flat colour with nearest filtering and never bleeds into its neighbours

export type Vec3 = [number, number, number];

// the six faces of a cell, numbered so they can index arrays
export enum CellFace {
  Right,
  Left,
  Front,
  Back,
  Top,
  Bottom,
}

export const CELL_FACES = [
  CellFace.Right,
  CellFace.Left,
  CellFace.Front,
  CellFace.Back,
  CellFace.Top,
  CellFace.Bottom,
] as const;

interface CellFaceShape {
  // outward normal, which is also the offset to the neighbouring cell
  normal: Readonly<Vec3>;
  // bottom left, bottom right, top right, top left as seen from outside, so the winding
  // faces outwards. same layout as the voxel mesher's cube faces
  corners: readonly [Readonly<Vec3>, Readonly<Vec3>, Readonly<Vec3>, Readonly<Vec3>];
}

export const CELL_FACE_SHAPES: Readonly<Record<CellFace, CellFaceShape>> = {
  [CellFace.Right]: { normal: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  [CellFace.Left]: { normal: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  [CellFace.Front]: { normal: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  [CellFace.Back]: { normal: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  [CellFace.Top]: { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  [CellFace.Bottom]: { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
};

const QUAD_INDICES = [0, 1, 2, 0, 2, 3] as const;
const VERTICES_PER_QUAD = 4;
export const INDICES_PER_QUAD = QUAD_INDICES.length;
const MAX_UINT16_VERTICES = 65536;

// uv pointing at the middle of texel (column, row) on a width x height texture, canvas
// coordinates so row 0 is the top of the texture
export function texelCentreU(column: number, width: number): number {
  return (column + 0.5) / width;
}

export function texelCentreV(row: number, height: number): number {
  return 1 - (row + 0.5) / height;
}

export class TexelQuadBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];

  get quadCount(): number {
    return this.positions.length / (VERTICES_PER_QUAD * 3);
  }

  // adds one face of the cell spanning [x, x + 1] x [y, y + 1] x [z, z + 1] in cells, where
  // cellSize turns a cell into world units on each axis. u, v is the texel the quad shows
  addFace(face: CellFace, x: number, y: number, z: number, cellSize: Readonly<Vec3>, u: number, v: number) {
    const { normal, corners } = CELL_FACE_SHAPES[face];
    for (const corner of corners) {
      this.positions.push((x + corner[0]) * cellSize[0], (y + corner[1]) * cellSize[1], (z + corner[2]) * cellSize[2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.uvs.push(u, v);
    }
  }

  // textured geometry with normals and uvs
  build(): BufferGeometry {
    const geometry = this.buildShape();
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(this.normals), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(this.uvs), 2));
    return geometry;
  }

  // positions and indices only, for the shape the ink outline is worked out from
  buildShape(): BufferGeometry {
    const quadCount = this.quadCount;
    const vertexCount = quadCount * VERTICES_PER_QUAD;
    const indexCount = quadCount * INDICES_PER_QUAD;
    const indices = vertexCount > MAX_UINT16_VERTICES ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
    for (let quad = 0; quad < quadCount; quad++) {
      const firstVertex = quad * VERTICES_PER_QUAD;
      for (let i = 0; i < INDICES_PER_QUAD; i++) indices[quad * INDICES_PER_QUAD + i] = firstVertex + QUAD_INDICES[i];
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setIndex(new BufferAttribute(indices, 1));
    return geometry;
  }
}
