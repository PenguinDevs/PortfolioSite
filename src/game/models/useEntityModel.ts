import { useMemo } from 'react';
import { Mesh, TextureLoader } from 'three';
import type { Group, ShaderMaterial } from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useModel } from './useModel';
import { createToonMaterial } from '../shaders/toonShader';
import type { ToonMaterialOptions } from '../shaders/toonShader';

export interface EntityModelOptions extends Omit<ToonMaterialOptions, 'map'> {
  // path to a texture file, used as the toon material's map
  texturePath?: string;
  // use skeleton-aware clone (required for skinned/animated meshes)
  skeleton?: boolean;
}

// Loads a model, creates a toon material, clones the scene, and applies the
// material to every mesh. Covers the boilerplate shared by most entities.
export function useEntityModel(name: string, options: EntityModelOptions = {}) {
  const { texturePath, skeleton = false, ...materialOptions } = options;
  const { scene, animations } = useModel(name);

  const texture = useMemo(() => {
    if (!texturePath) return undefined;
    const tex = new TextureLoader().load(texturePath);
    tex.flipY = false;
    return tex;
  }, [texturePath]);

  const material = useMemo(
    () => createToonMaterial({ ...materialOptions, map: texture }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texture, materialOptions.color, materialOptions.shadowColor],
  );

  const cloned = useMemo(() => {
    const clone = skeleton ? skeletonClone(scene) : scene.clone(true);
    clone.traverse((child) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).material = material;
      }
    });
    return clone;
  }, [scene, material, skeleton]);

  return { cloned, material, animations } as {
    cloned: Group;
    material: ShaderMaterial;
    animations: typeof animations;
  };
}
