'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Box3, BufferAttribute, BufferGeometry, MeshBasicMaterial } from 'three';
import type { Group, Mesh, ShaderMaterial } from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { useEntityReveal } from '../hooks';
import type { EntityRevealOptions } from '../hooks';
import { InkEdgesGroup } from '../shaders';
import { INK_EDGE_COLOUR } from '../constants';
import { LightingMode } from '../types';
import { BLOCK_SIZE, BlockFace, BlockKind } from './constants';
import { createPixelMaterial, usePixelMaterials } from './materials';
import { getBlockTexture, getBlockTextureKey } from './blockTextures';

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

// culls hidden faces and batches the rest into one geometry per texture plus the ink geometry
function buildVoxelMesh(blocks: readonly VoxelBlock[]): VoxelMesh {
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
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(indices, 1));
    batches.push({ textureKey, geometry });
  }

  const inkGeometry = new BufferGeometry();
  inkGeometry.setAttribute('position', new BufferAttribute(inkPositions, 3));
  inkGeometry.setIndex(new BufferAttribute(inkIndices, 1));

  return { batches, inkGeometry, bounds };
}

// one material per distinct block texture, made up front so a blocks change never adds
// materials the reveal has already finished with
function createBlockMaterials(): Map<string, ShaderMaterial> {
  const materials = new Map<string, ShaderMaterial>();
  for (const kind of Object.values(BlockKind)) {
    for (const face of Object.values(BlockFace)) {
      const key = getBlockTextureKey(kind, face);
      if (!materials.has(key)) materials.set(key, createPixelMaterial(getBlockTexture(kind, face)));
    }
  }
  return materials;
}

// face culled, textured and inked minecraft blocks. pass a memoised blocks array, the
// geometry is rebuilt whenever its identity changes
export function VoxelBlocks({ blocks, revealOptions, inkSeed = 0, ...groupProps }: VoxelBlocksProps) {
  const groupRef = useRef<Group>(null);
  const meshesGroupRef = useRef<Group>(null);

  const voxelMesh = useMemo(() => buildVoxelMesh(blocks), [blocks]);
  useEffect(() => {
    return () => {
      for (const batch of voxelMesh.batches) batch.geometry.dispose();
      voxelMesh.inkGeometry.dispose();
    };
  }, [voxelMesh]);

  const materialsByTexture = useMemo(createBlockMaterials, []);
  const materials = useMemo(() => [...materialsByTexture.values()], [materialsByTexture]);

  // big builds like the cave shell start revealing once any part of them is in view
  const { drawProgress, connectMaterial } = useEntityReveal(groupRef, {
    perfLabel: 'VoxelBlocks',
    ...revealOptions,
    bounds: voxelMesh.bounds,
  });
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
        filter={inkFilter}
      />
    </group>
  );
}
