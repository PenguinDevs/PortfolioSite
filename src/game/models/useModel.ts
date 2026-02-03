import { useGLTF } from '@react-three/drei';
import { ModelRegistry } from './ModelRegistry';

export function useModel(name: string) {
  const path = ModelRegistry[name];
  if (!path) throw new Error(`Unknown model: "${name}"`);
  return useGLTF(path);
}
