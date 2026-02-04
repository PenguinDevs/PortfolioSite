import { useEffect } from 'react';
import { Color } from 'three';
import type { ShaderMaterial } from 'three';
import { LightingService } from '../services';
import type { ThemedColour } from '../types';

// Subscribes a toon ShaderMaterial's colour and shadow uniforms to lighting
// mode changes. Updates uniforms imperatively without triggering re-renders.
export function useThemedToonMaterial(
  material: ShaderMaterial,
  colour: ThemedColour,
  shadowColour: ThemedColour,
) {
  useEffect(() => {
    // Set initial colours based on current mode
    const initial = LightingService.getMode();
    material.uniforms.uColor.value = new Color(colour[initial]);
    material.uniforms.uShadowColor.value = new Color(shadowColour[initial]);

    return LightingService.subscribe((mode) => {
      material.uniforms.uColor.value = new Color(colour[mode]);
      material.uniforms.uShadowColor.value = new Color(shadowColour[mode]);
    });
  }, [material, colour, shadowColour]);
}
