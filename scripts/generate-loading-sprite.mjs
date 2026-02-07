// Generates a horizontal sprite sheet of wave-distorted penguin frames
// for the loading screen animation. Run with: node scripts/generate-loading-sprite.mjs

import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FRAME_SIZE = 256; // render at 2x for retina, displayed at 128px
const FRAME_COUNT = 6;
const OUTPUT_PATH = resolve(__dirname, '../public/assets/images/penguin_loading_sprite.png');
const INPUT_PATH = resolve(__dirname, '../public/assets/images/penguin_headshot.png');

// Apply horizontal flowing wave displacement to raw pixel data
// Each row shifts left/right via a sine wave that sweeps downward, like a flag in wind
function applyWaveDisplacement(srcPixels, width, height, channels, phase) {
  const dst = Buffer.alloc(srcPixels.length);

  for (let y = 0; y < height; y++) {
    // Primary wave flowing across the image horizontally
    const dx = Math.sin(y * 0.04 + phase) * 10
      + Math.sin(y * 0.09 + phase * 1.6) * 5;

    // Slight vertical wobble so it doesn't look too rigid
    const dy = Math.sin(y * 0.06 + phase * 0.5) * 2;

    for (let x = 0; x < width; x++) {
      const sx = Math.round(x + dx);
      const sy = Math.round(y + dy);

      const di = (y * width + x) * channels;

      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        const si = (sy * width + sx) * channels;
        for (let c = 0; c < channels; c++) {
          dst[di + c] = srcPixels[si + c];
        }
      }
    }
  }

  return dst;
}

async function main() {
  // Load and resize source image
  const src = sharp(INPUT_PATH).resize(FRAME_SIZE, FRAME_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const { data: srcPixels, info } = await src.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const channels = info.channels; // 4 (RGBA)

  // Generate each displaced frame
  const frames = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const phase = (i / FRAME_COUNT) * Math.PI * 2;
    const displaced = applyWaveDisplacement(srcPixels, FRAME_SIZE, FRAME_SIZE, channels, phase);
    frames.push(displaced);
  }

  // Composite frames into a horizontal sprite sheet
  const sheetWidth = FRAME_SIZE * FRAME_COUNT;
  const sheetHeight = FRAME_SIZE;
  const sheetBuffer = Buffer.alloc(sheetWidth * sheetHeight * channels);

  for (let i = 0; i < FRAME_COUNT; i++) {
    const frame = frames[i];
    for (let y = 0; y < FRAME_SIZE; y++) {
      const srcOffset = y * FRAME_SIZE * channels;
      const dstOffset = (y * sheetWidth + i * FRAME_SIZE) * channels;
      frame.copy(sheetBuffer, dstOffset, srcOffset, srcOffset + FRAME_SIZE * channels);
    }
  }

  await sharp(sheetBuffer, {
    raw: { width: sheetWidth, height: sheetHeight, channels },
  })
    .png()
    .toFile(OUTPUT_PATH);

  console.log(`Sprite sheet generated: ${FRAME_COUNT} frames at ${FRAME_SIZE}x${FRAME_SIZE} -> ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Failed to generate sprite sheet:', err);
  process.exit(1);
});
