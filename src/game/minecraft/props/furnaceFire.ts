import type { BufferGeometry } from 'three';
import { CUT_OUT_ALPHA } from '../constants';
import { CELL_FACE_SHAPES, CELL_FACES, CellFace, INDICES_PER_QUAD, TexelQuadBuilder, texelCentreU, texelCentreV } from './texelQuads';
import type { Vec3 } from './texelQuads';

// the fire in the furnace mouth, built from the frames of the vanilla fire animation strip the
// way Minecraft renders a held item: every opaque texel becomes a little slab, with side faces
// only where the next texel along is see-through, coloured from the edge texel itself.
// every frame goes into one geometry and the animation just moves the draw range

const MAX_CHANNEL = 255;
const ALPHA_CHANNEL = 3;
const CHANNELS = 4;
const OPAQUE_ALPHA = CUT_OUT_ALPHA * MAX_CHANNEL;

// the slab faces each frame texel gets, the side faces only when that neighbour is clear
const SLAB_FACES = [CellFace.Front, CellFace.Back] as const;
const EDGE_FACES = CELL_FACES.filter((face) => !SLAB_FACES.some((slab) => slab === face));

export interface FireFrame {
  // first index and index count of this frame in the geometry
  start: number;
  count: number;
}

export interface FireSprite {
  geometry: BufferGeometry;
  frames: readonly FireFrame[];
}

// pixels is the whole strip of square frames stacked top to bottom. each frame is centred on
// x = 0 with its bottom row on y = 0 and its slab centred on z = 0. the caller owns and
// disposes the geometry
export function buildFireSprite(pixels: ImageData, texelSize: number, thickness: number): FireSprite {
  const { width, height, data } = pixels;
  const frameCount = Math.floor(height / width);
  const cellSize: Vec3 = [texelSize, texelSize, thickness];
  const halfWidth = width / 2;
  const slabZ = -0.5;

  // canvas row counts down from the top of the strip
  const opaque = (column: number, row: number, frameTop: number) =>
    column >= 0 && column < width && row >= 0 && row < width &&
    data[((frameTop + row) * width + column) * CHANNELS + ALPHA_CHANNEL] >= OPAQUE_ALPHA;

  const builder = new TexelQuadBuilder();
  const frames: FireFrame[] = [];
  for (let frame = 0; frame < frameCount; frame++) {
    const frameTop = frame * width;
    const firstQuad = builder.quadCount;

    for (let row = 0; row < width; row++) {
      for (let column = 0; column < width; column++) {
        if (!opaque(column, row, frameTop)) continue;
        const x = column - halfWidth;
        const y = width - 1 - row;
        const u = texelCentreU(column, width);
        const v = texelCentreV(frameTop + row, height);

        for (const face of SLAB_FACES) builder.addFace(face, x, y, slabZ, cellSize, u, v);
        for (const face of EDGE_FACES) {
          // the shape's y points up the frame while canvas rows count down it
          const [dx, dy] = CELL_FACE_SHAPES[face].normal;
          if (!opaque(column + dx, row - dy, frameTop)) builder.addFace(face, x, y, slabZ, cellSize, u, v);
        }
      }
    }

    frames.push({ start: firstQuad * INDICES_PER_QUAD, count: (builder.quadCount - firstQuad) * INDICES_PER_QUAD });
  }

  const geometry = builder.build();
  geometry.setDrawRange(frames[0].start, frames[0].count);
  return { geometry, frames };
}
