import type * as THREE from 'three';

type MaterialFactory = () => THREE.Material;

import { createToonMaterial } from './toonShader';

export const ShaderRegistry: Record<string, MaterialFactory> = {
  toon: createToonMaterial,
};
