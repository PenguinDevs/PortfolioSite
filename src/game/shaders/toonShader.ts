import { ShaderMaterial, Color, Vector3, DoubleSide, type Side, type Texture } from 'three';

const vertexShader = /* glsl */ `
  #include <skinning_pars_vertex>

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  #ifdef STAGGERED_REVEAL
    attribute float aRevealStart;
    varying float vRevealStart;
  #endif

  void main() {
    vUv = uv;
    #ifdef STAGGERED_REVEAL
      vRevealStart = aRevealStart;
    #endif

    #include <skinbase_vertex>

    vec3 transformedPos = position;
    vec3 transformedNorm = normal;

    #ifdef USE_SKINNING
      mat4 skinMatrix = boneMatX * skinWeight.x
                      + boneMatY * skinWeight.y
                      + boneMatZ * skinWeight.z
                      + boneMatW * skinWeight.w;
      transformedPos = (bindMatrixInverse * skinMatrix * bindMatrix * vec4(position, 1.0)).xyz;
      transformedNorm = (bindMatrixInverse * skinMatrix * bindMatrix * vec4(normal, 0.0)).xyz;
    #endif

    vNormal = normalize(normalMatrix * transformedNorm);
    vPosition = (modelMatrix * vec4(transformedPos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformedPos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uShadowColor;
  uniform vec3 uLightDir;
  uniform float uLitThreshold;
  uniform float uMidThreshold;
  uniform bool uUseMap;
  uniform sampler2D uMap;
  uniform float uClipY;
  uniform float uOpacity;
  uniform float uRevealProgress;
  uniform vec3 uRevealColour;
  uniform float uAlphaTest;
  uniform vec3 uMapTint;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  #ifdef STAGGERED_REVEAL
    uniform float uStaggerProgress;
    uniform float uStaggerLag;
    uniform float uStaggerWindow;
    varying float vRevealStart;
  #endif

  void main() {
    // discard fragments below the clip threshold (defaults to -10000 so no effect)
    if (vPosition.y < uClipY) discard;

    vec3 normal = normalize(vNormal);
    float NdotL = dot(normal, uLightDir);

    vec4 texel = uUseMap ? texture2D(uMap, vUv) : vec4(uColor, 1.0);
    // cut-out sprites (e.g. plants) drop their transparent texels, 0 keeps everything
    if (texel.a < uAlphaTest) discard;

    vec3 baseColor = uUseMap ? texel.rgb * uMapTint : uColor;
    vec3 shadowColor = uUseMap ? baseColor * 0.55 : uShadowColor;

    vec3 color;
    if (NdotL > uLitThreshold) {
      color = baseColor;
    } else if (NdotL > uMidThreshold) {
      color = mix(baseColor, shadowColor, 0.5);
    } else {
      color = shadowColor;
    }

    // reveal animation: lerp from reveal base colour to the computed colour
    float reveal = uRevealProgress;
    #ifdef STAGGERED_REVEAL
      // each part fills in on its own once the shared progress gets a little past its start
      float partStart = vRevealStart + uStaggerLag;
      reveal = max(reveal, smoothstep(partStart, partStart + uStaggerWindow, uStaggerProgress));
    #endif
    color = mix(uRevealColour, color, reveal);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

// fills the parts of a mesh in one at a time instead of all at once, driven by a shared progress
// such as an entity reveal's draw progress. the geometry needs an aRevealStart attribute giving
// each vertex the progress at which its part starts
export interface StaggeredReveal {
  progress: { value: number };
  // how far past its start a part begins filling in, and how long the fill takes, in progress units
  lag: number;
  window: number;
}

export interface ToonMaterialOptions {
  color?: string;
  shadowColor?: string;
  lightDir?: [number, number, number];
  litThreshold?: number;
  midThreshold?: number;
  side?: Side;
  map?: Texture;
  // texels with alpha below this are discarded (0 disables the cut-out)
  alphaTest?: number;
  // multiplies the map colour, e.g. to dim textures in dark mode
  mapTint?: [number, number, number];
  staggeredReveal?: StaggeredReveal;
}

export function createToonMaterial({
  color = '#e8e4df',
  shadowColor = '#a08850',
  lightDir = [0.4, 0.7, 0.5],
  litThreshold = 0.3,
  midThreshold = -0.2,
  side = DoubleSide,
  map,
  alphaTest = 0,
  mapTint = [1, 1, 1],
  staggeredReveal,
}: ToonMaterialOptions = {}) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uShadowColor: { value: new Color(shadowColor) },
      uLightDir: { value: new Vector3(...lightDir).normalize() },
      uLitThreshold: { value: litThreshold },
      uMidThreshold: { value: midThreshold },
      uUseMap: { value: !!map },
      uMap: { value: map ?? null },
      uClipY: { value: -10000 },
      uOpacity: { value: 1.0 },
      uRevealProgress: { value: 1.0 },
      uRevealColour: { value: new Color('#ffffff') },
      uAlphaTest: { value: alphaTest },
      uMapTint: { value: new Vector3(...mapTint) },
      ...(staggeredReveal && {
        // shared object, so the material follows the progress without being touched each frame
        uStaggerProgress: staggeredReveal.progress,
        uStaggerLag: { value: staggeredReveal.lag },
        uStaggerWindow: { value: staggeredReveal.window },
      }),
    },
    defines: staggeredReveal ? { STAGGERED_REVEAL: '' } : {},
    vertexShader,
    fragmentShader,
    side,
  });
}
