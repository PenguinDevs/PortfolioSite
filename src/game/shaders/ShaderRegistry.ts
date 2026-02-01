import type * as THREE from 'three';

type MaterialFactory = () => THREE.Material;

export const ShaderRegistry: Record<string, MaterialFactory> = {
  // basicGrid: () => new THREE.MeshStandardMaterial({ color: '#cccccc' }),
};
