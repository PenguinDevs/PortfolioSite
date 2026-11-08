import { hashString, pickColour, seededRandom, setPixel } from '../../minecraft/pixelTexture';

// heads are painted at Minecraft texture resolution then upscaled with pixelated rendering
export const AVATAR_TEXELS = 16;

// the fallback leans towards the first (base) colour of each palette
const FALLBACK_BIAS = 1.8;

// base, light, dark. picked to sit nicely in the lush cave
const FALLBACK_PALETTES = [
  ['#71A74D', '#8EB971', '#4F7A35'], // moss
  ['#D07FAF', '#E9A6C9', '#A65A88'], // azalea flower
  ['#E69A2E', '#F7C25A', '#B66E19'], // glow berry
  ['#8A98AE', '#A9B6C9', '#66748A'], // clay
  ['#57A487', '#7CC2A7', '#3B7C64'], // dripleaf
  ['#9370C6', '#B595DE', '#6E4F9E'], // amethyst
  ['#8A6342', '#A7805C', '#664730'], // rooted dirt
  ['#7F7F7F', '#9E9E9E', '#5E5E5E'], // stone
] as const;

// successful loads are kept so reopening the chest doesn't flash the fallback. failures
// aren't kept, so the flaky avatar api gets another go the next time the chest opens
const loadedAvatars = new Map<string, HTMLImageElement>();
const pendingAvatars = new Map<string, Promise<HTMLImageElement>>();

export function getLoadedAvatar(url: string): HTMLImageElement | undefined {
  return loadedAvatars.get(url);
}

// crossOrigin is left unset on purpose. the image is only ever drawn for display and its
// pixels are never read back, so a tainted canvas is fine and no CORS headers are needed
export function loadAvatar(url: string): Promise<HTMLImageElement> {
  const pending = pendingAvatars.get(url);
  if (pending) return pending;

  // executor form rather than Promise.withResolvers, which older Safari versions lack
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        reject(new Error(`avatar has no size: ${url}`));
        return;
      }
      loadedAvatars.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`avatar failed to load: ${url}`));
    img.src = url;
  }).finally(() => pendingAvatars.delete(url));

  pendingAvatars.set(url, promise);
  return promise;
}

// halves the image a step at a time so the 16 x 16 result is a fair average of the
// avatar rather than a few sampled pixels
export function paintAvatar(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // centre crop anything that isn't square
  let srcSize = Math.min(img.naturalWidth, img.naturalHeight);
  let srcX = (img.naturalWidth - srcSize) / 2;
  let srcY = (img.naturalHeight - srcSize) / 2;
  let source: CanvasImageSource = img;

  while (srcSize / 2 >= AVATAR_TEXELS) {
    const size = Math.floor(srcSize / 2);
    const step = document.createElement('canvas');
    step.width = size;
    step.height = size;
    const stepCtx = step.getContext('2d');
    if (!stepCtx) break;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(source, srcX, srcY, srcSize, srcSize, 0, 0, size, size);
    source = step;
    srcX = 0;
    srcY = 0;
    srcSize = size;
  }

  ctx.clearRect(0, 0, AVATAR_TEXELS, AVATAR_TEXELS);
  // tiny avatars get blown up as crisp blocks instead of blurred
  ctx.imageSmoothingEnabled = srcSize > AVATAR_TEXELS;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, srcX, srcY, srcSize, srcSize, 0, 0, AVATAR_TEXELS, AVATAR_TEXELS);
}

// a noisy single colour block, so a missing avatar still looks like a proper head
export function paintFallback(canvas: HTMLCanvasElement, id: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const seed = hashString(`friend:${id}`);
  const palette = FALLBACK_PALETTES[seed % FALLBACK_PALETTES.length];
  const rand = seededRandom(seed);
  for (let y = 0; y < AVATAR_TEXELS; y++) {
    for (let x = 0; x < AVATAR_TEXELS; x++) {
      setPixel(ctx, x, y, pickColour(palette, rand, FALLBACK_BIAS));
    }
  }
}

// the top of the head carries on from the front face's top row
export function paintTopFromFront(canvas: HTMLCanvasElement, front: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, AVATAR_TEXELS, AVATAR_TEXELS);
  ctx.drawImage(front, 0, 0, AVATAR_TEXELS, 1, 0, 0, AVATAR_TEXELS, AVATAR_TEXELS);
}

// the right side carries on from the front face's right column
export function paintSideFromFront(canvas: HTMLCanvasElement, front: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, AVATAR_TEXELS, AVATAR_TEXELS);
  ctx.drawImage(front, AVATAR_TEXELS - 1, 0, 1, AVATAR_TEXELS, 0, 0, AVATAR_TEXELS, AVATAR_TEXELS);
}
