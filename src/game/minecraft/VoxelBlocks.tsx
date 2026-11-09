'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Box3, BufferAttribute, BufferGeometry, MeshBasicMaterial } from 'three';
import type { Group, Mesh, ShaderMaterial } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../hooks';
import type { EntityRevealOptions } from '../hooks';
import { InkEdgesGroup } from '../shaders';
import type { InkDrawGroups, StaggeredReveal } from '../shaders';
import { INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';
import { BLOCK_SIZE, BlockFace, BlockKind } from './constants';
import { createPixelMaterial, usePixelMaterials } from './materials';
import { getBlockTexture, getBlockTextureKey } from './blockTextures';
import { hashString, seededRandom } from './pixelTexture';

// one full block. coordinates are whole cells local to the component, a cell spans
// [x, x + 1] x [y, y + 1] x [z, z + 1] blocks, so y = 0 sits on the floor
export interface VoxelBlock {
  kind: BlockKind;
  x: number;
  y: number;
  z: number;
}

export type VoxelBlocksProps = {
  blocks: readonly VoxelBlock[];
  revealOptions?: EntityRevealOptions;
  inkSeed?: number;
} & ThreeElements['group'];

type Vec3 = readonly [number, number, number];

interface CubeFace {
  face: BlockFace;
  // outward normal, which is also the offset to the neighbouring cell that hides this face
  normal: Vec3;
  // bottom left, bottom right, top right, top left as seen from outside, so the winding
  // faces outwards and side textures stand upright
  corners: readonly [Vec3, Vec3, Vec3, Vec3];
}

const CUBE_FACES: readonly CubeFace[] = [
  { face: BlockFace.Side, normal: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { face: BlockFace.Side, normal: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { face: BlockFace.Side, normal: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { face: BlockFace.Side, normal: [0, 0, -1], corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  // tops have the back of the block at the top of the texture, bottoms mirror that from below
  { face: BlockFace.Top, normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { face: BlockFace.Bottom, normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
];

// uvs for the corners in the order above, canvas row 0 lands at v = 1 (top of the face)
const CORNER_UVS = [0, 0, 1, 0, 1, 1, 0, 1];
const QUAD_INDICES = [0, 1, 2, 0, 2, 3];
const VERTICES_PER_FACE = 4;
const INDICES_PER_FACE = 6;
const MAX_UINT16_VERTICES = 65536;

// the textured meshes are batched per texture, so a seam between two block kinds would be a
// mesh border and get inked. instead every visible face also goes into one shape-only mesh that
// carries the ink, where coplanar neighbours share edges and only silhouettes and creases remain.
// material.visible = false skips drawing the mesh itself but still renders the ink lines added
// to it as children. shared by every instance and never disposed
const INK_ONLY_MATERIAL = new MeshBasicMaterial({ visible: false });

const NO_INK_USER_DATA = { noInk: true };

function inkFilter(mesh: Mesh): boolean {
  return !mesh.userData.noInk;
}

// blocks come in one at a time, rising from the ground up. timings are in draw progress, which
// the reveal runs from 0 to just past 1, and the last block starts early enough that its ink
// and texture still finish before the progress tops out
const LAST_BLOCK_START = 0.9;
// a block's start is nudged by up to this many layers, so each layer comes in a block at a time
const BLOCK_START_JITTER_LAYERS = 3;
// a block's ink is traced outwards from one corner over this much progress
const BLOCK_TRACE_SPAN = 0.03;
// its texture starts filling in this far behind its ink and takes this long to fill
const BLOCK_FILL_LAG = 0.06;
const BLOCK_FILL_WINDOW = 0.05;

// shared by the dedupe pass and the neighbour lookups, so they always agree
function cellKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

interface FaceBatch {
  textureKey: string;
  geometry: BufferGeometry;
}

interface VoxelMesh {
  batches: FaceBatch[];
  inkGeometry: BufferGeometry;
  // traces the ink block by block, in the same order the textures fill in
  drawGroups: InkDrawGroups;
  // local bounds of every cell, undefined when there are no blocks
  bounds: Box3 | undefined;
}

function createIndexArray(faceCount: number): Uint16Array | Uint32Array {
  const indexCount = faceCount * INDICES_PER_FACE;
  return faceCount * VERTICES_PER_FACE > MAX_UINT16_VERTICES ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
}

// writes one quad's corners and indices, faceSlot counts faces already in the arrays
function writeFacePositions(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array,
  faceSlot: number,
  x: number,
  y: number,
  z: number,
  face: CubeFace,
) {
  const firstVertex = faceSlot * VERTICES_PER_FACE;
  for (let c = 0; c < VERTICES_PER_FACE; c++) {
    const corner = face.corners[c];
    const p = (firstVertex + c) * 3;
    positions[p] = (x + corner[0]) * BLOCK_SIZE;
    positions[p + 1] = (y + corner[1]) * BLOCK_SIZE;
    positions[p + 2] = (z + corner[2]) * BLOCK_SIZE;
  }
  const firstIndex = faceSlot * INDICES_PER_FACE;
  for (let i = 0; i < INDICES_PER_FACE; i++) indices[firstIndex + i] = firstVertex + QUAD_INDICES[i];
}

// when each block starts coming in, keyed like the cells. the order follows the height above the
// bottom layer, so builds rise up out of the ground as if they were being placed
function computeBlockStarts(cells: ReadonlyMap<string, VoxelBlock>, seed: number): Map<string, number> {
  const rand = seededRandom(hashString(`voxelReveal:${seed}`));
  let lowest = Infinity;
  let highest = -Infinity;
  for (const { y } of cells.values()) {
    lowest = Math.min(lowest, y);
    highest = Math.max(highest, y);
  }
  const span = highest - lowest + BLOCK_START_JITTER_LAYERS;
  const starts = new Map<string, number>();
  for (const [key, { y }] of cells) {
    const layer = y - lowest + rand() * BLOCK_START_JITTER_LAYERS;
    starts.set(key, (layer / span) * LAST_BLOCK_START);
  }
  return starts;
}

// the ink comes in block by block too. an edge goes with whichever of the blocks around it
// starts first, so it is drawn along with that block
function createInkDrawGroups(starts: ReadonlyMap<string, number>): InkDrawGroups {
  const indexByKey = new Map<string, number>();
  const startByIndex: number[] = [];
  for (const [key, start] of starts) {
    indexByKey.set(key, startByIndex.length);
    startByIndex.push(start);
  }
  return {
    groupOf: (ax, ay, az, bx, by, bz) => {
      const x0 = Math.round(Math.min(ax, bx) / BLOCK_SIZE);
      const y0 = Math.round(Math.min(ay, by) / BLOCK_SIZE);
      const z0 = Math.round(Math.min(az, bz) / BLOCK_SIZE);
      // an edge runs along one axis, and the cells sharing it sit either side of it on the other two
      const xFrom = Math.abs(ax - bx) < BLOCK_SIZE / 2 ? x0 - 1 : x0;
      const yFrom = Math.abs(ay - by) < BLOCK_SIZE / 2 ? y0 - 1 : y0;
      const zFrom = Math.abs(az - bz) < BLOCK_SIZE / 2 ? z0 - 1 : z0;
      let group = -1;
      for (let x = xFrom; x <= x0; x++) {
        for (let y = yFrom; y <= y0; y++) {
          for (let z = zFrom; z <= z0; z++) {
            const index = indexByKey.get(cellKey(x, y, z));
            if (index === undefined) continue;
            if (group === -1 || startByIndex[index] < startByIndex[group]) group = index;
          }
        }
      }
      return group;
    },
    startOf: (group) => (group === -1 ? 0 : startByIndex[group]),
    traceSpan: BLOCK_TRACE_SPAN,
  };
}

// culls hidden faces and batches the rest into one geometry per texture plus the ink geometry
function buildVoxelMesh(blocks: readonly VoxelBlock[], seed: number): VoxelMesh {
  // later entries win when two blocks claim the same cell
  const cells = new Map<string, VoxelBlock>();
  for (const block of blocks) cells.set(cellKey(block.x, block.y, block.z), block);

  // visible faces per texture, packed as x, y, z, face index
  const facesByTexture = new Map<string, number[]>();
  let visibleFaceCount = 0;
  let bounds: Box3 | undefined;

  for (const { kind, x, y, z } of cells.values()) {
    if (!bounds) bounds = new Box3();
    bounds.min.set(Math.min(bounds.min.x, x), Math.min(bounds.min.y, y), Math.min(bounds.min.z, z));
    bounds.max.set(Math.max(bounds.max.x, x + 1), Math.max(bounds.max.y, y + 1), Math.max(bounds.max.z, z + 1));

    for (let f = 0; f < CUBE_FACES.length; f++) {
      const { face, normal } = CUBE_FACES[f];
      if (cells.has(cellKey(x + normal[0], y + normal[1], z + normal[2]))) continue;
      const textureKey = getBlockTextureKey(kind, face);
      let packed = facesByTexture.get(textureKey);
      if (!packed) {
        packed = [];
        facesByTexture.set(textureKey, packed);
      }
      packed.push(x, y, z, f);
      visibleFaceCount++;
    }
  }
  bounds?.min.multiplyScalar(BLOCK_SIZE);
  bounds?.max.multiplyScalar(BLOCK_SIZE);
  const starts = computeBlockStarts(cells, seed);

  const inkPositions = new Float32Array(visibleFaceCount * VERTICES_PER_FACE * 3);
  const inkIndices = createIndexArray(visibleFaceCount);
  let inkSlot = 0;

  const batches: FaceBatch[] = [];
  for (const [textureKey, packed] of facesByTexture) {
    const faceCount = packed.length / 4;
    const positions = new Float32Array(faceCount * VERTICES_PER_FACE * 3);
    const normals = new Float32Array(faceCount * VERTICES_PER_FACE * 3);
    const uvs = new Float32Array(faceCount * VERTICES_PER_FACE * 2);
    const indices = createIndexArray(faceCount);
    // every vertex knows when its block starts, so the texture can fill in block by block
    const revealStarts = new Float32Array(faceCount * VERTICES_PER_FACE);

    for (let slot = 0; slot < faceCount; slot++) {
      const x = packed[slot * 4];
      const y = packed[slot * 4 + 1];
      const z = packed[slot * 4 + 2];
      const face = CUBE_FACES[packed[slot * 4 + 3]];
      writeFacePositions(positions, indices, slot, x, y, z, face);
      writeFacePositions(inkPositions, inkIndices, inkSlot++, x, y, z, face);

      const firstVertex = slot * VERTICES_PER_FACE;
      normals.set(face.normal, firstVertex * 3);
      normals.set(face.normal, (firstVertex + 1) * 3);
      normals.set(face.normal, (firstVertex + 2) * 3);
      normals.set(face.normal, (firstVertex + 3) * 3);
      uvs.set(CORNER_UVS, firstVertex * 2);
      revealStarts.fill(starts.get(cellKey(x, y, z)) ?? 0, firstVertex, firstVertex + VERTICES_PER_FACE);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setAttribute('aRevealStart', new BufferAttribute(revealStarts, 1));
    geometry.setIndex(new BufferAttribute(indices, 1));
    batches.push({ textureKey, geometry });
  }

  const inkGeometry = new BufferGeometry();
  inkGeometry.setAttribute('position', new BufferAttribute(inkPositions, 3));
  inkGeometry.setIndex(new BufferAttribute(inkIndices, 1));

  return { batches, inkGeometry, drawGroups: createInkDrawGroups(starts), bounds };
}

// one material per distinct block texture, made up front so a blocks change never adds
// materials the reveal has already finished with
function createBlockMaterials(staggeredReveal: StaggeredReveal): Map<string, ShaderMaterial> {
  const materials = new Map<string, ShaderMaterial>();
  for (const kind of Object.values(BlockKind)) {
    for (const face of Object.values(BlockFace)) {
      const key = getBlockTextureKey(kind, face);
      if (!materials.has(key)) materials.set(key, createPixelMaterial(getBlockTexture(kind, face), { staggeredReveal }));
    }
  }
  return materials;
}

// face culled, textured and inked minecraft blocks. pass a memoised blocks array, the
// geometry is rebuilt whenever its identity changes
export function VoxelBlocks({ blocks, revealOptions, inkSeed = 0, ...groupProps }: VoxelBlocksProps) {
  const groupRef = useRef<Group>(null);
  const meshesGroupRef = useRef<Group>(null);

  const voxelMesh = useMemo(() => buildVoxelMesh(blocks, inkSeed), [blocks, inkSeed]);
  useEffect(() => {
    return () => {
      for (const batch of voxelMesh.batches) batch.geometry.dispose();
      voxelMesh.inkGeometry.dispose();
    };
  }, [voxelMesh]);

  // big builds like the cave shell start revealing once any part of them is in view
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, {
    perfLabel: 'VoxelBlocks',
    ...revealOptions,
    bounds: voxelMesh.bounds,
  });

  // each block's texture fills in on its own, just behind its ink
  const materialsByTexture = useMemo(
    () => createBlockMaterials({ progress: drawProgress, lag: BLOCK_FILL_LAG, window: BLOCK_FILL_WINDOW }),
    [drawProgress],
  );
  const materials = useMemo(() => [...materialsByTexture.values()], [materialsByTexture]);
  usePixelMaterials(materials, connectMaterial);

  return (
    <group {...groupProps} ref={groupRef}>
      <group ref={meshesGroupRef}>
        {voxelMesh.batches.map((batch) => (
          <mesh
            key={batch.textureKey}
            geometry={batch.geometry}
            material={materialsByTexture.get(batch.textureKey)}
            userData={NO_INK_USER_DATA}
            castShadow
          />
        ))}
        {/* never culled, its bounding sphere is meaningless when there are no blocks */}
        <mesh geometry={voxelMesh.inkGeometry} material={INK_ONLY_MATERIAL} frustumCulled={false} />
      </group>
      {/* keyed on the ink geometry so the outline is rebuilt whenever the blocks change */}
      <InkEdgesGroup
        key={voxelMesh.inkGeometry.uuid}
        target={meshesGroupRef}
        colour={INK_EDGE_COLOUR[LightingMode.Light]}
        darkColour={INK_EDGE_COLOUR[LightingMode.Dark]}
        seed={inkSeed}
        width={2}
        drawProgress={drawProgress}
        drawGroups={voxelMesh.drawGroups}
        filter={inkFilter}
      />
    </group>
  );
}
