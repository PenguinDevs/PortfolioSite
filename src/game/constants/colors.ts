import { LightingMode } from '../types';
import type { ThemedColor, ThemedValue } from '../types';

// Canvas / scene background
export const BACKGROUND_COLOR: ThemedColor = {
  [LightingMode.Light]: '#ffffff',
  [LightingMode.Dark]: '#1a1a2e',
};

// Alley ground
export const GROUND_COLOR: ThemedColor = {
  [LightingMode.Light]: '#ffffff',
  [LightingMode.Dark]: '#2a2a3a',
};

export const GROUND_SHADOW: ThemedColor = {
  [LightingMode.Light]: '#ffffff',
  [LightingMode.Dark]: '#1a1a28',
};

// Pedestal
export const PEDESTAL_COLOR: ThemedColor = {
  [LightingMode.Light]: '#d4cfc8',
  [LightingMode.Dark]: '#3a3850',
};

export const PEDESTAL_SHADOW: ThemedColor = {
  [LightingMode.Light]: '#8a8078',
  [LightingMode.Dark]: '#22203a',
};

// Ink edge outlines
export const INK_EDGE_COLOR: ThemedColor = {
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
