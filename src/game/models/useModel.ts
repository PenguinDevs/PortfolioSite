import { useGLTF, useFBX } from '@react-three/drei';
import type { AnimationClip, Group } from 'three';
import { ModelRegistry } from './ModelRegistry';

interface ModelResult {
  scene: Group;
  animations: AnimationClip[];
}

function useGLTFByPath(path: string): ModelResult {
  const gltf = useGLTF(path);
  return { scene: gltf.scene, animations: gltf.animations };
}

function useFBXByPath(path: string): ModelResult {
  const group = useFBX(path);
  return { scene: group, animations: group.animations };
}

export function useModel(name: string): ModelResult {
  const path = ModelRegistry[name];
  if (!path) throw new Error(`Unknown model: "${name}"`);

  const isFBX = path.toLowerCase().endsWith('.fbx');

  if (isFBX) {
    return useFBXByPath(path);
  }

  return useGLTFByPath(path);
}
