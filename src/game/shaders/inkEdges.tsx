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
  },
  skinning?: SkinningInfo,
): LineSegments | null {
  if (edgePositions.length === 0) return null;

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(edgePositions, 3));

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

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uInkSeed = { value: params.seed };
    shader.uniforms.uInkGapFreq = { value: params.gapFreq };
    shader.uniforms.uInkGapThreshold = { value: params.gapThreshold };
    shader.uniforms.uInkWobble = { value: params.wobble };

    // Inject ink varying declaration
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      'varying vec3 vInkObjPos;\nvoid main() {',
    );

    // Capture object-space position after skinning (skinning_vertex runs
    // between begin_vertex and project_vertex in the built-in shader)
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      'vInkObjPos = transformed;\n#include <project_vertex>',
    );

    // Fragment: inject declarations before main, gap mask before opaque_fragment
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      INK_FRAG_PARS + 'void main() {',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      INK_FRAG_MAIN + '\n\t#include <opaque_fragment>',
    );
  };

  const lineObj = new LineSegments(geo, mat);

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
}

type ResolvedInkEdgesOptions = Required<Omit<InkEdgesOptions, 'darkColour'>> & { darkColour?: string };

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
}

export function InkEdges({ target, ...opts }: InkEdgesProps) {
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
  }, [target, o.thresholdAngle, o.creaseOffset, o.colour, o.darkColour, o.width, o.opacity,
      o.seed, o.gapFreq, o.gapThreshold, o.wobble]);

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
      o.opacity, o.gapFreq, o.gapThreshold, o.wobble]);

  return null;
}
