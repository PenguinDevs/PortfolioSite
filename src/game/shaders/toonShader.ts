import { ShaderMaterial, Color, Vector3, DoubleSide, type Side, type Texture } from 'three';

const vertexShader = /* glsl */ `
  #include <skinning_pars_vertex>

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;

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

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vec3 normal = normalize(vNormal);
    float NdotL = dot(normal, uLightDir);

    vec3 baseColor = uUseMap ? texture2D(uMap, vUv).rgb : uColor;
    vec3 shadowColor = uUseMap ? baseColor * 0.55 : uShadowColor;

    vec3 color;
    if (NdotL > uLitThreshold) {
      color = baseColor;
    } else if (NdotL > uMidThreshold) {
      color = mix(baseColor, shadowColor, 0.5);
    } else {
      color = shadowColor;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface ToonMaterialOptions {
  color?: string;
  shadowColor?: string;
  lightDir?: [number, number, number];
  litThreshold?: number;
  midThreshold?: number;
  side?: Side;
  map?: Texture;
}

export function createToonMaterial({
  color = '#e8e4df',
  shadowColor = '#a08850',
  lightDir = [-0.4, 0.9, 0.5],
  litThreshold = 0.3,
  midThreshold = -0.2,
  side = DoubleSide,
  map,
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
    },
    vertexShader,
    fragmentShader,
    side,
  });
}
