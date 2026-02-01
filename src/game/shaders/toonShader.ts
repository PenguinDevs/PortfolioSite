import { ShaderMaterial, Color, Vector3, DoubleSide, type Side } from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uShadowColor;
  uniform vec3 uLightDir;
  uniform float uLitThreshold;
  uniform float uMidThreshold;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    float NdotL = dot(normal, uLightDir);

    vec3 color;
    if (NdotL > uLitThreshold) {
      color = uColor;
    } else if (NdotL > uMidThreshold) {
      color = mix(uColor, uShadowColor, 0.5);
    } else {
      color = uShadowColor;
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
}

export function createToonMaterial({
  color = '#e8e4df',
  shadowColor = '#a08850',
  lightDir = [-0.4, 0.9, 0.5],
  litThreshold = 0.3,
  midThreshold = -0.2,
  side = DoubleSide,
}: ToonMaterialOptions = {}) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uShadowColor: { value: new Color(shadowColor) },
      uLightDir: { value: new Vector3(...lightDir).normalize() },
      uLitThreshold: { value: litThreshold },
      uMidThreshold: { value: midThreshold },
    },
    vertexShader,
    fragmentShader,
    side,
  });
}
