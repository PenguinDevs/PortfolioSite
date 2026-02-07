import { LightingMode } from '../types';
import type { ThemedColour, ThemedValue } from '../types';

// Canvas / scene background
export const BACKGROUND_COLOUR: ThemedColour = {
  [LightingMode.Light]: '#ffffff',
  [LightingMode.Dark]: '#212121',
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

// Wall frame
export const WALL_FRAME_COLOUR: ThemedColour = {
  [LightingMode.Light]: '#ffffff',
  [LightingMode.Dark]: '#3d3d3d', // matches alley ground
};

export const WALL_FRAME_SHADOW: ThemedColour = {
  [LightingMode.Light]: '#b0a898',
  [LightingMode.Dark]: '#1a1a28', // matches alley ground shadow
};

export const WALL_FRAME_BACKING_COLOUR: ThemedColour = {
  [LightingMode.Light]: '#faf8f5',
  [LightingMode.Dark]: '#3d3d3d', // matches alley ground
};

// Ink edge outlines
export const INK_EDGE_COLOUR: ThemedColour = {
  [LightingMode.Light]: '#1a1a1a',
  [LightingMode.Dark]: '#e0e0e0',
};

// Blob shadow opacity beneath entities
export const SHADOW_OPACITY: ThemedValue = {
  [LightingMode.Light]: 0.2,
  [LightingMode.Dark]: 0.35,
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
