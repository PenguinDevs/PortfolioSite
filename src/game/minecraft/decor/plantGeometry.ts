import { BufferAttribute, BufferGeometry } from 'three';
import type { BoxGeometry, Mesh } from 'three';
import { BLOCK_SIZE, PIXEL_TEXTURE_SIZE } from '../constants';

// one texel of a block texture in world units
export const TEXEL = BLOCK_SIZE / PIXEL_TEXTURE_SIZE;

// crossed planes stop a little short of the cell corners, like the classic plant model
const CROSS_CORNER_INSET = 0.8 * TEXEL;
// half the extent of each diagonal plane along x and along z
const CROSS_HALF_SPAN = BLOCK_SIZE / 2 - CROSS_CORNER_INSET;
// [x, z] start and end of the two diagonal planes
const CROSS_PLANES = [
  [-CROSS_HALF_SPAN, -CROSS_HALF_SPAN, CROSS_HALF_SPAN, CROSS_HALF_SPAN],
  [-CROSS_HALF_SPAN, CROSS_HALF_SPAN, CROSS_HALF_SPAN, -CROSS_HALF_SPAN],
] as const;

// sprite planes and plant meshes the ink outline should skip, only real silhouettes get inked
export const NO_INK_USER_DATA = { noInk: true };

// stable filter for InkEdgesGroup, it reruns its effect whenever the filter identity changes
export const inkSolidMeshesOnly = (mesh: Mesh) => !mesh.userData.noInk;

// two vertical quads crossed through the cell centre, the classic plant sprite.
// height runs up from bottom, and v runs 0 to vRepeat bottom to top so tall stems can tile
// a wrapping texture once per block. every normal points up so both planes shade the same
export function createCrossedQuadGeometry(height = BLOCK_SIZE, bottom = 0, vRepeat = 1): BufferGeometry {
  const top = bottom + height;
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  CROSS_PLANES.forEach(([x0, z0, x1, z1], plane) => {
    // bottom left, bottom right, top left, top right
    positions.push(x0, bottom, z0, x1, bottom, z1, x0, top, z0, x1, top, z1);
    uvs.push(0, 0, 1, 0, 0, vRepeat, 1, vRepeat);
    for (let i = 0; i < 4; i++) normals.push(0, 1, 0);
    const first = plane * 4;
    indices.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(indices);
  return geometry;
}

// one block tall plant sprite standing on the origin
export const STANDING_CROSS_GEOMETRY = createCrossedQuadGeometry();

// one block tall plant sprite hanging down from the origin
export const HANGING_CROSS_GEOMETRY = createCrossedQuadGeometry(BLOCK_SIZE, -BLOCK_SIZE);

// BoxGeometry builds its faces in this order, four vertices each
export enum BoxGeometryFace {
  PosX,
  NegX,
  PosY,
  NegY,
  PosZ,
  NegZ,
}

const VERTICES_PER_BOX_FACE = 4;

export const BOX_SIDE_FACES = [BoxGeometryFace.PosX, BoxGeometryFace.NegX, BoxGeometryFace.PosZ, BoxGeometryFace.NegZ] as const;

// rescales one face of a single segment box so u runs 0 to uScale and v runs vMin to vMax.
// side faces run u along z for the x faces and along x for the z faces, the y faces run u along x
// and v along z. call it once per face, it scales whatever uvs are already there
export function remapBoxFaceUvs(geometry: BoxGeometry, face: BoxGeometryFace, uScale: number, vMin: number, vMax: number) {
  const uv = geometry.getAttribute('uv') as BufferAttribute;
  const start = face * VERTICES_PER_BOX_FACE;
  for (let i = start; i < start + VERTICES_PER_BOX_FACE; i++) {
    uv.setXY(i, uv.getX(i) * uScale, vMin + uv.getY(i) * (vMax - vMin));
  }
  uv.needsUpdate = true;
}
