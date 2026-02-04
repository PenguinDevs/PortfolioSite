import { useEffect } from 'react';
import { Color } from 'three';
import type { ShaderMaterial } from 'three';
import { LightingService } from '../services';
import type { ThemedColor } from '../types';

// Subscribes a toon ShaderMaterial's color and shadow uniforms to lighting
// mode changes. Updates uniforms imperatively without triggering re-renders.
export function useThemedToonMaterial(
  material: ShaderMaterial,
  color: ThemedColor,
  shadowColor: ThemedColor,
) {
  useEffect(() => {
    // Set initial colors based on current mode
    const initial = LightingService.getMode();
    material.uniforms.uColor.value = new Color(color[initial]);
    material.uniforms.uShadowColor.value = new Color(shadowColor[initial]);

    return LightingService.subscribe((mode) => {
      material.uniforms.uColor.value = new Color(color[mode]);
      material.uniforms.uShadowColor.value = new Color(shadowColor[mode]);
    });
  }, [material, color, shadowColor]);
}
