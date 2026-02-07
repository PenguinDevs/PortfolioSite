import { useGLTF } from '@react-three/drei';
import { ModelRegistry } from './ModelRegistry';
import { PerfLogger } from '../debug/PerfLogger';

// tracks which models have already been logged so we only mark first load
const loggedModels = new Set<string>();

export function useModel(name: string) {
  const path = ModelRegistry[name];
  if (!path) throw new Error(`Unknown model: "${name}"`);
  const result = useGLTF(path);

  if (PerfLogger.enabled && !loggedModels.has(name)) {
    loggedModels.add(name);
    PerfLogger.mark(`model:${name}:loaded`);
  }

  return result;
}
