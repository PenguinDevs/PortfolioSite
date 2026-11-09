import { LightingMode } from '../types';
import type { ThemedValue } from '../types';

// one block is one world unit, so a crafting table comes up to roughly the penguin's chest
export const BLOCK_SIZE = 1;

// every pixel texture is this many texels square
export const PIXEL_TEXTURE_SIZE = 16;

// texels with less alpha than this are cut out of sprite materials
export const CUT_OUT_ALPHA = 0.5;

// dims pixel textures in dark mode so the glowing parts stand out, glow materials ignore it
export const PIXEL_MAP_TINT: ThemedValue = {
  [LightingMode.Light]: 1,
  [LightingMode.Dark]: 0.62,
};

// full cube blocks the voxel mesher knows how to texture
export enum BlockKind {
  Stone = 'stone',
  Cobblestone = 'cobblestone',
  MossyCobblestone = 'mossyCobblestone',
  Andesite = 'andesite',
  Deepslate = 'deepslate',
  MossBlock = 'mossBlock',
  Dirt = 'dirt',
  RootedDirt = 'rootedDirt',
  Clay = 'clay',
  IronOre = 'ironOre',
  DiamondOre = 'diamondOre',
}

// which side of a block a texture is painted for
export enum BlockFace {
  Top = 'top',
  Side = 'side',
  Bottom = 'bottom',
}
