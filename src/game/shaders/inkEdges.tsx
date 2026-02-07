'use client';

import { useEffect } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from 'three';
import { LightingService } from '../services';
import { LightingMode } from '../types';

// ---------------------------------------------------------------------------
// GLSL: ink-gap noise injected into LineBasicMaterial via onBeforeCompile
// ---------------------------------------------------------------------------

const INK_CLIP_VERT_PARS = /* glsl */ `
varying vec3 vInkWorldPos;
`;

const INK_CLIP_VERT_MAIN = /* glsl */ `
vInkWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const INK_CLIP_FRAG_PARS = /* glsl */ `
uniform float uInkClipY;
varying vec3 vInkWorldPos;
`;

const INK_CLIP_FRAG_MAIN = /* glsl */ `
if (vInkWorldPos.y < uInkClipY) discard;
`;

const INK_FRAG_PARS = /* glsl */ `
varying vec3 vInkObjPos;
uniform float uInkSeed;
uniform float uInkGapFreq;
uniform float uInkGapThreshold;
uniform float uInkWobble;

float inkHash(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p, p.yxz + 19.19);
  return fract((p.x + p.y) * p.z);
}

float inkNoise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a  = inkHash(i);
  float b  = inkHash(i + vec3(1,0,0));
  float c  = inkHash(i + vec3(0,1,0));
  float d  = inkHash(i + vec3(1,1,0));
  float e  = inkHash(i + vec3(0,0,1));
  float f2 = inkHash(i + vec3(1,0,1));
  float g  = inkHash(i + vec3(0,1,1));
  float h  = inkHash(i + vec3(1,1,1));
  return mix(
    mix(mix(a, b, f.x), mix(c, d, f.x), f.y),
    mix(mix(e, f2, f.x), mix(g, h, f.x), f.y),
    f.z
  );
}
`;

const INK_FRAG_MAIN = /* glsl */ `
  {
    vec3 inkP = vInkObjPos * uInkGapFreq + uInkSeed;
    float inkN  = inkNoise3D(inkP);
    float inkN2 = inkNoise3D(inkP * 2.13 + 7.7);
    float gapMask = smoothstep(
      uInkGapThreshold - uInkWobble,
      uInkGapThreshold + uInkWobble,
      inkN
    );
    float opVar = 0.8 + 0.2 * inkN2;
    diffuseColor.a *= gapMask * opVar;
  }
`;

// draw-in reveal: each edge extrudes from its BFS-origin vertex to its end
// vertex as the wavefront advances, rather than fading the entire edge in
const INK_DRAW_VERT_PARS = /* glsl */ `
attribute float aDrawOrder;
attribute float aIsEnd;
attribute vec3 aSegmentOrigin;
uniform float uDrawProgress;
varying float vSegProgress;
`;

// how much draw progress (0..1 normalised space) one edge takes to fully extrude
const SEGMENT_EXTRUDE_WINDOW = 0.08;

// injected after #include <begin_vertex> so extrusion runs before skinning
const INK_DRAW_EXTRUDE = /* glsl */ `
{
  float segProg = smoothstep(aDrawOrder, aDrawOrder + ${SEGMENT_EXTRUDE_WINDOW.toFixed(2)}, uDrawProgress);
  vSegProgress = segProg;
  // end vertices collapse toward the segment origin when not yet drawn.
  // start vertices have origin == position, so the mix is a no-op.
  float lerpFactor = mix(1.0, segProg, aIsEnd);
  transformed = mix(aSegmentOrigin, transformed, lerpFactor);
}
`;

const INK_DRAW_FRAG_PARS = /* glsl */ `
varying float vSegProgress;
`;

const INK_DRAW_FRAG_MAIN = /* glsl */ `
  {
    float drawMask = smoothstep(0.0, 0.02, vSegProgress);
    diffuseColor.a *= drawMask;
  }
`;

// ---------------------------------------------------------------------------
// GPU skinning: uses Three.js built-in shader chunks via USE_SKINNING define
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Edge extraction
// ---------------------------------------------------------------------------

interface EdgeData {
  positions: Float32Array;
  vertexIndices?: number[];
}

function extractEdges(
  geometry: BufferGeometry,
  thresholdAngle: number,
  creaseOffset = 0,
): EdgeData {
  const thresholdDot = Math.cos((thresholdAngle * Math.PI) / 180);
  const posAttr = geometry.getAttribute('position');
  if (!posAttr) return { positions: new Float32Array(0) };

  const indexAttr = geometry.getIndex();
  const pos = posAttr.array as Float32Array;
  const stride = posAttr.itemSize;

  const getVertex = (idx: number, out: Vector3) => {
    out.set(pos[idx * stride], pos[idx * stride + 1], pos[idx * stride + 2]);
  };

  let triCount: number;
  let triIndex: (i: number) => number;
  if (indexAttr) {
    const idx = indexAttr.array;
    triCount = idx.length / 3;
    triIndex = (i: number) => idx[i];
  } else {
    triCount = posAttr.count / 3;
    triIndex = (i: number) => i;
  }

  const faceNormals: Vector3[] = [];
  const _a = new Vector3(), _b = new Vector3(), _c = new Vector3();
  const _ab = new Vector3(), _ac = new Vector3();
  for (let f = 0; f < triCount; f++) {
    getVertex(triIndex(f * 3), _a);
    getVertex(triIndex(f * 3 + 1), _b);
    getVertex(triIndex(f * 3 + 2), _c);
    _ab.subVectors(_b, _a);
    _ac.subVectors(_c, _a);
    faceNormals.push(new Vector3().crossVectors(_ab, _ac).normalize());
  }

  const precision = 1e4;
  const quantise = (v: Vector3) =>
    `${Math.round(v.x * precision)},${Math.round(v.y * precision)},${Math.round(v.z * precision)}`;

  const edgeFaceMap = new Map<string, number[]>();
  const edgeVerts = new Map<string, [Vector3, Vector3]>();
  const edgeOrigIndices = new Map<string, [number, number]>();

  const _v0 = new Vector3(), _v1 = new Vector3();
  for (let f = 0; f < triCount; f++) {
    for (let e = 0; e < 3; e++) {
      const i0 = triIndex(f * 3 + e);
      const i1 = triIndex(f * 3 + ((e + 1) % 3));
      getVertex(i0, _v0);
      getVertex(i1, _v1);
      const k0 = quantise(_v0);
      const k1 = quantise(_v1);
      const edgeKey = k0 < k1 ? k0 + '|' + k1 : k1 + '|' + k0;

      let faces = edgeFaceMap.get(edgeKey);
      if (!faces) {
        faces = [];
        edgeFaceMap.set(edgeKey, faces);
        edgeVerts.set(edgeKey, [_v0.clone(), _v1.clone()]);
        edgeOrigIndices.set(edgeKey, k0 < k1 ? [i0, i1] : [i1, i0]);
      }
      faces.push(f);
    }
  }

  const segments: number[] = [];
  const vertexIndices: number[] = [];
  const _offset = new Vector3();
  edgeFaceMap.forEach((faces, key) => {
    let include = false;
    if (faces.length === 1) {
      include = true;
    } else if (faces.length === 2) {
      include = faceNormals[faces[0]].dot(faceNormals[faces[1]]) <= thresholdDot;
    }
    if (include) {
      const [va, vb] = edgeVerts.get(key)!;

      // Offset crease edges along the bisector of adjacent face normals
      // so lines at concave bends aren't buried inside the geometry.
      if (creaseOffset !== 0 && faces.length >= 1) {
        _offset.copy(faceNormals[faces[0]]);
        if (faces.length >= 2) {
          _offset.add(faceNormals[faces[1]]);
        }
        const len = _offset.length();
        if (len > 1e-6) {
          _offset.multiplyScalar(creaseOffset / len);
          va.add(_offset);
          vb.add(_offset);
        }
      }

      segments.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
      const [ia, ib] = edgeOrigIndices.get(key)!;
      vertexIndices.push(ia, ib);
    }
  });

  return { positions: new Float32Array(segments), vertexIndices };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 1000;
}

function copySkinDataForEdges(
  geometry: BufferGeometry,
  vertexIndices: number[],
): { skinIndices: Float32Array; skinWeights: Float32Array } | null {
  const siAttr = geometry.getAttribute('skinIndex');
  const swAttr = geometry.getAttribute('skinWeight');
  if (!siAttr || !swAttr) return null;

  const skinIndices = new Float32Array(vertexIndices.length * 4);
  const skinWeights = new Float32Array(vertexIndices.length * 4);

  for (let i = 0; i < vertexIndices.length; i++) {
    const vi = vertexIndices[i];
    skinIndices[i * 4]     = siAttr.getX(vi);
    skinIndices[i * 4 + 1] = siAttr.getY(vi);
    skinIndices[i * 4 + 2] = siAttr.getZ(vi);
    skinIndices[i * 4 + 3] = siAttr.getW(vi);
    skinWeights[i * 4]     = swAttr.getX(vi);
    skinWeights[i * 4 + 1] = swAttr.getY(vi);
    skinWeights[i * 4 + 2] = swAttr.getZ(vi);
    skinWeights[i * 4 + 3] = swAttr.getW(vi);
  }

  return { skinIndices, skinWeights };
}

// ---------------------------------------------------------------------------
// Draw order computation for reveal animation
// ---------------------------------------------------------------------------

// BFS from a random start segment to produce a normalised draw order (0..1)
// per vertex, plus per-vertex extrusion data so each edge can grow from its
// BFS-origin vertex to its far vertex. Handles disconnected clusters.
interface DrawOrderData {
  drawOrder: Float32Array;      // per vertex (2 per segment), normalised 0..1
  isEnd: Float32Array;          // per vertex, 0 for start vertex, 1 for end vertex
  segmentOrigin: Float32Array;  // per vertex, vec3 position of the start vertex
}

function computeDrawOrder(positions: Float32Array): DrawOrderData {
  const segmentCount = positions.length / 6;
  if (segmentCount === 0) {
    return {
      drawOrder: new Float32Array(0),
      isEnd: new Float32Array(0),
      segmentOrigin: new Float32Array(0),
    };
  }

  // quantise vertex positions to find shared vertices between segments
  const precision = 1e4;
  const quantise = (x: number, y: number, z: number) =>
    `${Math.round(x * precision)},${Math.round(y * precision)},${Math.round(z * precision)}`;

  // pre-compute quantised vertex keys for each segment's two endpoints
  const segKeys: [string, string][] = [];
  for (let s = 0; s < segmentCount; s++) {
    const base = s * 6;
    const k0 = quantise(positions[base], positions[base + 1], positions[base + 2]);
    const k1 = quantise(positions[base + 3], positions[base + 4], positions[base + 5]);
    segKeys.push([k0, k1]);
  }

  // map: quantised vertex key -> list of segment indices sharing that vertex
  const vertexSegments = new Map<string, number[]>();
  for (let s = 0; s < segmentCount; s++) {
    for (const key of segKeys[s]) {
      let list = vertexSegments.get(key);
      if (!list) {
        list = [];
        vertexSegments.set(key, list);
      }
      list.push(s);
    }
  }

  // build adjacency with shared vertex info so we know which vertex connects neighbours
  interface AdjEntry { segment: number; sharedKey: string }
  const adj: AdjEntry[][] = Array.from({ length: segmentCount }, () => []);
  for (const [vertexKey, segs] of vertexSegments.entries()) {
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        adj[segs[i]].push({ segment: segs[j], sharedKey: vertexKey });
        adj[segs[j]].push({ segment: segs[i], sharedKey: vertexKey });
      }
    }
  }

  // BFS: assign levels and track which vertex is the entry point (start) for each segment
  const segmentLevel = new Int32Array(segmentCount).fill(-1);
  // 0 or 1: which of the segment's two vertices is the start (entry from parent)
  const segStartIdx = new Uint8Array(segmentCount);
  let maxLevel = 0;

  const startSegment = Math.floor(Math.random() * segmentCount);
  segmentLevel[startSegment] = 0;
  segStartIdx[startSegment] = 0; // arbitrary for root

  const queue: number[] = [startSegment];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const nextLevel = segmentLevel[current] + 1;
    for (const { segment: neighbour, sharedKey } of adj[current]) {
      if (segmentLevel[neighbour] !== -1) continue;
      segmentLevel[neighbour] = nextLevel;
      if (nextLevel > maxLevel) maxLevel = nextLevel;
      // shared vertex is the start (entry) of the neighbour segment
      segStartIdx[neighbour] = segKeys[neighbour][0] === sharedKey ? 0 : 1;
      queue.push(neighbour);
    }
  }

  // handle disconnected components: start new BFS from any unvisited segment
  for (let s = 0; s < segmentCount; s++) {
    if (segmentLevel[s] !== -1) continue;
    const componentStart = maxLevel + 1;
    segmentLevel[s] = componentStart;
    segStartIdx[s] = 0;
    maxLevel = componentStart;
    queue.push(s);
    while (head < queue.length) {
      const current = queue[head++];
      const nextLevel = segmentLevel[current] + 1;
      for (const { segment: neighbour, sharedKey } of adj[current]) {
        if (segmentLevel[neighbour] !== -1) continue;
        segmentLevel[neighbour] = nextLevel;
        if (nextLevel > maxLevel) maxLevel = nextLevel;
        segStartIdx[neighbour] = segKeys[neighbour][0] === sharedKey ? 0 : 1;
        queue.push(neighbour);
      }
    }
  }

  // build per-vertex output arrays
  const drawOrder = new Float32Array(segmentCount * 2);
  const isEnd = new Float32Array(segmentCount * 2);
  const segmentOrigin = new Float32Array(segmentCount * 2 * 3);

  for (let s = 0; s < segmentCount; s++) {
    const normalised = maxLevel > 0 ? segmentLevel[s] / maxLevel : 0;
    drawOrder[s * 2] = normalised;
    drawOrder[s * 2 + 1] = normalised;

    const si = segStartIdx[s]; // 0 or 1
    const ei = 1 - si;
    isEnd[s * 2 + si] = 0;
    isEnd[s * 2 + ei] = 1;

    // origin position = start vertex position (stored for both vertices of the segment)
    const base = s * 6;
    const ox = positions[base + si * 3];
    const oy = positions[base + si * 3 + 1];
    const oz = positions[base + si * 3 + 2];
    segmentOrigin[(s * 2) * 3] = ox;
    segmentOrigin[(s * 2) * 3 + 1] = oy;
    segmentOrigin[(s * 2) * 3 + 2] = oz;
    segmentOrigin[(s * 2 + 1) * 3] = ox;
    segmentOrigin[(s * 2 + 1) * 3 + 1] = oy;
    segmentOrigin[(s * 2 + 1) * 3 + 2] = oz;
  }

  return { drawOrder, isEnd, segmentOrigin };
}

// ---------------------------------------------------------------------------
// Build ink lines
// ---------------------------------------------------------------------------

interface SkinningInfo {
  skinIndices: Float32Array;
  skinWeights: Float32Array;
  skeleton: Skeleton;
  bindMatrix: Matrix4;
  bindMatrixInverse: Matrix4;
}

function buildInkLines(
  edgePositions: Float32Array,
  params: {
    color: string;
    opacity: number;
    seed: number;
    gapFreq: number;
    gapThreshold: number;
    wobble: number;
    clipY?: { value: number };
    drawProgress?: { value: number; segmentCount?: number };
  },
  skinning?: SkinningInfo,
): LineSegments | null {
  if (edgePositions.length === 0) return null;

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(edgePositions, 3));

  // when draw progress is provided, compute per-segment draw order for the reveal animation
  const hasDrawReveal = !!params.drawProgress;
  if (hasDrawReveal) {
    const drawData = computeDrawOrder(edgePositions);
    geo.setAttribute('aDrawOrder', new BufferAttribute(drawData.drawOrder, 1));
    geo.setAttribute('aIsEnd', new BufferAttribute(drawData.isEnd, 1));
    geo.setAttribute('aSegmentOrigin', new BufferAttribute(drawData.segmentOrigin, 3));
    // report segment count so the reveal hook can scale edge duration by complexity
    const segCount = edgePositions.length / 6;
    params.drawProgress!.segmentCount = (params.drawProgress!.segmentCount ?? 0) + segCount;
  }

  if (skinning) {
    geo.setAttribute('skinIndex', new BufferAttribute(skinning.skinIndices, 4));
    geo.setAttribute('skinWeight', new BufferAttribute(skinning.skinWeights, 4));
  }

  const mat = new LineBasicMaterial({
    color: params.color,
    transparent: true,
    opacity: params.opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  // override cache key so each variant compiles a separate shader program
  const baseKey = mat.customProgramCacheKey;
  mat.customProgramCacheKey = () =>
    (typeof baseKey === 'function' ? baseKey.call(mat) : '') +
    (params.clipY ? '|inkClipY' : '') +
    (hasDrawReveal ? '|inkDraw' : '');

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uInkSeed = { value: params.seed };
    shader.uniforms.uInkGapFreq = { value: params.gapFreq };
    shader.uniforms.uInkGapThreshold = { value: params.gapThreshold };
    shader.uniforms.uInkWobble = { value: params.wobble };

    // Inject ink varying declaration
    let vertPars = 'varying vec3 vInkObjPos;\n';
    let vertMain = 'vInkObjPos = transformed;\n';

    // optional draw-in reveal
    if (hasDrawReveal) {
      shader.uniforms.uDrawProgress = params.drawProgress!;
      vertPars += INK_DRAW_VERT_PARS;
    }

    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      vertPars + 'void main() {',
    );

    // inject edge extrusion after begin_vertex (before skinning) so end
    // vertices collapse toward their segment origin in rest-pose space
    if (hasDrawReveal) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n' + INK_DRAW_EXTRUDE,
      );
    }

    // Capture object-space position after skinning (skinning_vertex runs
    // between begin_vertex and project_vertex in the built-in shader)
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      vertMain + '#include <project_vertex>',
    );

    // build combined fragment preamble and main-body prefix
    let fragPars = INK_FRAG_PARS;
    let fragMainPrefix = '';
    let fragMainSuffix = INK_FRAG_MAIN;

    // optional Y clip -- shared uniform object so the caller can update it each frame
    if (params.clipY) {
      shader.uniforms.uInkClipY = params.clipY;

      shader.vertexShader = shader.vertexShader.replace(
        'varying vec3 vInkObjPos;',
        'varying vec3 vInkObjPos;\n' + INK_CLIP_VERT_PARS,
      );
      shader.vertexShader = shader.vertexShader.replace(
        'vInkObjPos = transformed;',
        'vInkObjPos = transformed;\n' + INK_CLIP_VERT_MAIN,
      );

      fragPars = INK_CLIP_FRAG_PARS + fragPars;
      fragMainPrefix = INK_CLIP_FRAG_MAIN;
    }

    // optional draw-in reveal masking
    if (hasDrawReveal) {
      fragPars += INK_DRAW_FRAG_PARS;
      fragMainSuffix += INK_DRAW_FRAG_MAIN;
    }

    // single replace for fragment declarations + main body prefix
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      fragPars + 'void main() {\n' + fragMainPrefix,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      fragMainSuffix + '\n\t#include <opaque_fragment>',
    );
  };

  const lineObj = new LineSegments(geo, mat);
  // ink edge lines should never appear in shadow maps
  lineObj.castShadow = false;

  // Let Three.js handle skinning natively by setting SkinnedMesh properties.
  // This ensures all necessary defines (USE_SKINNING, BONE_TEXTURE) and
  // uniform updates are managed by the renderer each frame.
  if (skinning) {
    (lineObj as any).isSkinnedMesh = true;
    (lineObj as any).skeleton = skinning.skeleton;
    (lineObj as any).bindMatrix = skinning.bindMatrix;
    (lineObj as any).bindMatrixInverse = skinning.bindMatrixInverse;
  }

  return lineObj;
}

// ---------------------------------------------------------------------------
// Shared options
// ---------------------------------------------------------------------------

export interface InkEdgesOptions {
  thresholdAngle?: number;
  // Offset crease edge vertices along the face-normal bisector (local units).
  // Use a small positive value to push concave-bend lines out of the geometry
  // so they aren't occluded by both adjacent surfaces.
  creaseOffset?: number;
  width?: number;
  colour?: string;
  // Colour used in dark mode. When provided, ink edges automatically switch
  // between colour (light) and darkColour (dark) via the LightingService.
  darkColour?: string;
  seed?: number;
  gapFreq?: number;
  gapThreshold?: number;
  wobble?: number;
  opacity?: number;
  // shared uniform for Y-axis clipping; update .value each frame to clip ink edges
  clipY?: { value: number };
  // shared uniform for draw-in reveal; edges with draw order > this value are hidden.
  // -1 = all hidden, 0..1 = progressive reveal, >1 = all visible.
  // segmentCount is written back by the ink edges system for complexity-based duration scaling.
  drawProgress?: { value: number; segmentCount?: number };
}

type ResolvedInkEdgesOptions = Required<Omit<InkEdgesOptions, 'darkColour' | 'clipY' | 'drawProgress'>> & {
  darkColour?: string;
  clipY?: { value: number };
  drawProgress?: { value: number; segmentCount?: number };
};

const DEFAULTS: ResolvedInkEdgesOptions = {
  thresholdAngle: 30,
  creaseOffset: 0,
  width: 2,
  colour: '#1a1a1a',
  seed: 0,
  gapFreq: 8,
  gapThreshold: 0.4,
  wobble: 0.15,
  opacity: 0.9,
};

function mergeOpts(opts: InkEdgesOptions): ResolvedInkEdgesOptions {
  return { ...DEFAULTS, ...opts };
}

// ---------------------------------------------------------------------------
// <InkEdges> -- ink-outline edges for a single Mesh
// ---------------------------------------------------------------------------

export interface InkEdgesProps extends InkEdgesOptions {
  target: React.RefObject<Mesh | null>;
  // optional: pass the geometry object so the effect re-runs when it changes
  // (the target ref identity stays the same across geometry rebuilds)
  geometry?: BufferGeometry;
}

export function InkEdges({ target, geometry: geometryDep, ...opts }: InkEdgesProps) {
  const o = mergeOpts(opts);

  useEffect(() => {
    const mesh = target.current;
    if (!mesh?.geometry) return;

    // Resolve initial colour based on lighting mode
    const initialMode = LightingService.getMode();
    const initialColour = o.darkColour && initialMode === LightingMode.Dark
      ? o.darkColour : o.colour;

    const { positions } = extractEdges(mesh.geometry, o.thresholdAngle, o.creaseOffset);
    const lineObj = buildInkLines(positions, {
      color: initialColour,
      opacity: o.opacity,
      seed: o.seed,
      gapFreq: o.gapFreq,
      gapThreshold: o.gapThreshold,
      wobble: o.wobble,
      clipY: o.clipY,
      drawProgress: o.drawProgress,
    });

    if (!lineObj) return;
    mesh.add(lineObj);

    // Subscribe to lighting changes if dark mode colour is provided
    let unsubLighting: (() => void) | undefined;
    if (o.darkColour) {
      const lightCol = o.colour;
      const darkCol = o.darkColour;
      unsubLighting = LightingService.subscribe((mode) => {
        (lineObj.material as LineBasicMaterial).color.set(
          mode === LightingMode.Light ? lightCol : darkCol
        );
      });
    }

    return () => {
      unsubLighting?.();
      mesh.remove(lineObj);
      lineObj.geometry.dispose();
      (lineObj.material as LineBasicMaterial).dispose();
    };
  }, [target, geometryDep, o.thresholdAngle, o.creaseOffset, o.colour, o.darkColour, o.width, o.opacity,
      o.seed, o.gapFreq, o.gapThreshold, o.wobble, o.clipY, o.drawProgress]);

  return null;
}

// ---------------------------------------------------------------------------
// <InkEdgesGroup> -- ink outlines for every mesh in a Group
// ---------------------------------------------------------------------------

export interface InkEdgesGroupProps extends InkEdgesOptions {
  target: React.RefObject<Group | null>;
  // optional predicate to include only specific meshes in the group
  filter?: (mesh: Mesh) => boolean;
}

export function InkEdgesGroup({ target, filter, ...opts }: InkEdgesGroupProps) {
  const o = mergeOpts(opts);

  useEffect(() => {
    const group = target.current;
    if (!group) return;

    // Resolve initial colour based on lighting mode
    const initialMode = LightingService.getMode();
    const initialColour = o.darkColour && initialMode === LightingMode.Dark
      ? o.darkColour : o.colour;

    const attached: { obj: LineSegments; parent: Mesh }[] = [];

    group.traverse((child) => {
      if (!(child as Mesh).isMesh) return;
      const mesh = child as Mesh;
      if (!mesh.geometry) return;
      if (filter && !filter(mesh)) return;

      const meshSeed = o.seed + hashStr(mesh.uuid);
      const { positions, vertexIndices } = extractEdges(mesh.geometry, o.thresholdAngle, o.creaseOffset);

      let skinning: SkinningInfo | undefined;
      if ((mesh as SkinnedMesh).isSkinnedMesh && vertexIndices) {
        const sm = mesh as SkinnedMesh;
        const skinData = copySkinDataForEdges(mesh.geometry, vertexIndices);
        if (skinData && sm.skeleton) {
          skinning = {
            skinIndices: skinData.skinIndices,
            skinWeights: skinData.skinWeights,
            skeleton: sm.skeleton,
            bindMatrix: sm.bindMatrix,
            bindMatrixInverse: sm.bindMatrixInverse,
          };
        }
      }

      const lineObj = buildInkLines(
        positions,
        {
          color: initialColour,
          opacity: o.opacity,
          seed: meshSeed,
          gapFreq: o.gapFreq,
          gapThreshold: o.gapThreshold,
          wobble: o.wobble,
          clipY: o.clipY,
          drawProgress: o.drawProgress,
        },
        skinning,
      );

      if (!lineObj) return;
      mesh.add(lineObj);
      attached.push({ obj: lineObj, parent: mesh });
    });

    // Subscribe to lighting changes if dark mode colour is provided
    let unsubLighting: (() => void) | undefined;
    if (o.darkColour) {
      const lightCol = o.colour;
      const darkCol = o.darkColour;
      unsubLighting = LightingService.subscribe((mode) => {
        const c = mode === LightingMode.Light ? lightCol : darkCol;
        for (const { obj } of attached) {
          (obj.material as LineBasicMaterial).color.set(c);
        }
      });
    }

    return () => {
      unsubLighting?.();
      for (const { obj, parent } of attached) {
        parent.remove(obj);
        obj.geometry.dispose();
        (obj.material as LineBasicMaterial).dispose();
      }
    };
  }, [target, filter, o.thresholdAngle, o.creaseOffset, o.seed, o.colour, o.darkColour, o.width,
      o.opacity, o.gapFreq, o.gapThreshold, o.wobble, o.clipY, o.drawProgress]);

  return null;
}
