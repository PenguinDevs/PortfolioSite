import { CanvasTexture, NearestFilter, RepeatWrapping } from 'three';
import { PIXEL_TEXTURE_SIZE } from './constants';

export type Rng = () => number;

// paints one texture onto a size x size canvas. rand is seeded from the texture key,
// so a texture comes out identical on every load
export type PixelPainter = (ctx: CanvasRenderingContext2D, rand: Rng, size: number) => void;

// mulberry32, tiny and plenty random enough for texture noise
export function seededRandom(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// fnv-1a, turns a texture key into a stable seed
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function setPixel(ctx: CanvasRenderingContext2D, x: number, y: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, 1, 1);
}

// picks a palette entry, rand() ** bias > 1 leans towards the first entries
export function pickColour(palette: readonly string[], rand: Rng, bias = 1): string {
  const index = Math.floor(Math.pow(rand(), bias) * palette.length);
  return palette[Math.min(index, palette.length - 1)];
}

const textureCache = new Map<string, CanvasTexture>();

// textures are cached per key and shared between entities, so never dispose them per entity.
// only call this on the client (inside the Canvas), it needs a DOM canvas
export function createPixelTexture(key: string, paint: PixelPainter, size = PIXEL_TEXTURE_SIZE): CanvasTexture {
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('pixel texture: 2d canvas context unavailable');
  ctx.imageSmoothingEnabled = false;
  paint(ctx, seededRandom(hashString(key)), size);

  // the toon shader writes texels straight out, so this keeps the default colour space
  // like the other textures in the game. nearest filtering keeps every texel crisp
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  textureCache.set(key, texture);
  return texture;
}

// loads an authentic Minecraft texture PNG from public/assets/minecraft/textures/
// and renders it with crisp nearest-neighbor filtering
export function loadVanillaTexture(url: string, tint?: string, repeat?: boolean): CanvasTexture {
  const cacheKey = url + (tint ? `:${tint}` : '');
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = PIXEL_TEXTURE_SIZE;
  canvas.height = PIXEL_TEXTURE_SIZE;
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  textureCache.set(cacheKey, texture);

  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    if (tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, img.width, img.height);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(img, 0, 0);
    }
    texture.needsUpdate = true;
  };
  img.src = url;

  return texture;
}
