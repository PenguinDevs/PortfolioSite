import { LightingMode } from '../types';
import type { ThemedColour, ThemedValue } from '../types';

// Canvas / scene background
export const BACKGROUND_COLOUR: ThemedColour = {
  [LightingMode.Light]: '#ffffff',
  [LightingMode.Dark]: '#1a1a2e',
};

// Alley ground
export const GROUND_COLOUR: ThemedColour = {
  [LightingMode.Light]: '#ffffff',
  [LightingMode.Dark]: '#3d3d3d',
};

export const GROUND_SHADOW: ThemedColour = {
  [LightingMode.Light]: '#ffffff',
  [LightingMode.Dark]: '#1a1a28',
};

// Ink edge outlines
export const INK_EDGE_COLOUR: ThemedColour = {
  [LightingMode.Light]: '#1a1a1a',
  [LightingMode.Dark]: '#e0e0e0',
};

// Scene lighting intensities
export const AMBIENT_INTENSITY: ThemedValue = {
  [LightingMode.Light]: 0.6,
  [LightingMode.Dark]: 0.25,
};

export const DIRECTIONAL_INTENSITY: ThemedValue = {
  [LightingMode.Light]: 1,
  [LightingMode.Dark]: 0.4,
};
