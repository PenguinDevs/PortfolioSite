import { useEffect } from 'react';
import type { ShaderMaterial, Texture, Vector3 } from 'three';
import { createToonMaterial } from '../shaders';
import { LightingService } from '../services';
import type { LightingMode } from '../types';
import { CUT_OUT_ALPHA, PIXEL_MAP_TINT } from './constants';

// a lit threshold below -1 means every face counts as lit, so glowing parts get no shading
const ALWAYS_LIT_THRESHOLD = -2;

export interface PixelMaterialOptions {
  // discard transparent texels, for plant and flame sprites
  cutOut?: boolean;
  // always fully lit and never dimmed in dark mode, for flames, lantern light and glow berries
  glow?: boolean;
}

// toon material showing a pixel texture, ready to be connected to an entity reveal
export function createPixelMaterial(texture: Texture, { cutOut = false, glow = false }: PixelMaterialOptions = {}): ShaderMaterial {
  const material = createToonMaterial({
    map: texture,
    alphaTest: cutOut ? CUT_OUT_ALPHA : 0,
    litThreshold: glow ? ALWAYS_LIT_THRESHOLD : undefined,
    midThreshold: glow ? ALWAYS_LIT_THRESHOLD : undefined,
  });
  material.userData.pixelGlow = glow;
  return material;
}

// hands materials to an entity reveal and keeps the non-glowing ones dimmed in dark mode.
// pass a memoised array, the effects rerun whenever its identity changes
export function usePixelMaterials(
  materials: readonly ShaderMaterial[],
  connectMaterial: (material: ShaderMaterial) => void,
) {
  useEffect(() => {
    for (const material of materials) connectMaterial(material);
  }, [materials, connectMaterial]);

  useEffect(() => {
    const applyTint = (mode: LightingMode) => {
      const tint = PIXEL_MAP_TINT[mode];
      for (const material of materials) {
        if (material.userData.pixelGlow) continue;
        (material.uniforms.uMapTint.value as Vector3).setScalar(tint);
      }
    };
    applyTint(LightingService.getMode());
    return LightingService.subscribe(applyTint);
  }, [materials]);

  // materials belong to the entity that made them, textures are shared and stay cached
  useEffect(() => {
    return () => {
      for (const material of materials) material.dispose();
    };
  }, [materials]);
}
