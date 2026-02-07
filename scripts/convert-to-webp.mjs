// Converts all PNG/JPG/JPEG images under public/ to highly compressed WebP
// Outputs .webp files in the same directory as each input file
// Usage: node scripts/convert-to-webp.mjs [--delete-originals] [--update-refs]

import sharp from 'sharp';
import { readdir, stat, unlink, readFile, writeFile } from 'fs/promises';
import { join, extname, basename, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const SRC_DIR = join(ROOT, 'src');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

// Skip these files (animated GIF used as favicon, etc.)
const SKIP_FILES = new Set(['profile_picture.gif']);

const DELETE_ORIGINALS = process.argv.includes('--delete-originals');
const UPDATE_REFS = process.argv.includes('--update-refs');

// WebP quality settings - lower = smaller file, 70-80 is a good balance
const WEBP_QUALITY = 75;
const WEBP_EFFORT = 6; // 0-6, higher = slower but better compression

async function findImages(dir) {
  const results = [];

  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext) && !SKIP_FILES.has(entry.name)) {
          results.push(fullPath);
        }
      }
    }
  }

  await walk(dir);
  return results;
}

async function convertImage(inputPath) {
  const ext = extname(inputPath);
  const outputPath = inputPath.replace(ext, '.webp');
  const relInput = relative(ROOT, inputPath);
  const relOutput = relative(ROOT, outputPath);

  try {
    const inputStats = await stat(inputPath);
    const inputSize = inputStats.size;

    await sharp(inputPath)
      .webp({
        quality: WEBP_QUALITY,
        effort: WEBP_EFFORT,
        smartSubsample: true,
      })
      .toFile(outputPath);

    const outputStats = await stat(outputPath);
    const outputSize = outputStats.size;
    const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

    console.log(
      `  ${relInput} -> ${relOutput}  ` +
        `(${formatBytes(inputSize)} -> ${formatBytes(outputSize)}, ${savings}% smaller)`
    );

    return { inputPath, outputPath, inputSize, outputSize };
  } catch (err) {
    console.error(`  Failed: ${relInput} - ${err.message}`);
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

// Updates image references in source files (.tsx, .ts, .yaml, .yml, .css)
async function updateSourceReferences(conversions) {
  const sourceExtensions = new Set(['.tsx', '.ts', '.yaml', '.yml', '.css', '.json']);

  async function findSourceFiles(dir) {
    const files = [];
    async function walk(current) {
      const entries = await readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(current, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
          await walk(fullPath);
        } else if (entry.isFile() && sourceExtensions.has(extname(entry.name).toLowerCase())) {
          files.push(fullPath);
        }
      }
    }
    await walk(dir);
    return files;
  }

  // Build a map of old filename -> new filename (just the extension swap)
  const replacements = new Map();
  for (const conv of conversions) {
    if (!conv) continue;
    const oldBase = basename(conv.inputPath);
    const newBase = basename(conv.outputPath);
    replacements.set(oldBase, newBase);
  }

  const sourceFiles = await findSourceFiles(SRC_DIR);
  let updatedCount = 0;

  for (const file of sourceFiles) {
    let content = await readFile(file, 'utf-8');
    let modified = false;

    for (const [oldName, newName] of replacements) {
      if (content.includes(oldName)) {
        content = content.replaceAll(oldName, newName);
        modified = true;
      }
    }

    if (modified) {
      await writeFile(file, content, 'utf-8');
      console.log(`  Updated refs in: ${relative(ROOT, file)}`);
      updatedCount++;
    }
  }

  return updatedCount;
}

async function main() {
  console.log('Finding images in public/...\n');
  const images = await findImages(PUBLIC_DIR);

  if (images.length === 0) {
    console.log('No images found to convert.');
    return;
  }

  console.log(`Found ${images.length} images to convert.\n`);
  console.log('Converting to WebP...\n');

  const results = [];
  for (const img of images) {
    const result = await convertImage(img);
    results.push(result);
  }

  const successful = results.filter(Boolean);
  const totalInputSize = successful.reduce((sum, r) => sum + r.inputSize, 0);
  const totalOutputSize = successful.reduce((sum, r) => sum + r.outputSize, 0);
  const totalSavings = ((1 - totalOutputSize / totalInputSize) * 100).toFixed(1);

  console.log('\n--- Summary ---');
  console.log(`Converted: ${successful.length}/${images.length} images`);
  console.log(`Total input:  ${formatBytes(totalInputSize)}`);
  console.log(`Total output: ${formatBytes(totalOutputSize)}`);
  console.log(`Total saved:  ${formatBytes(totalInputSize - totalOutputSize)} (${totalSavings}%)`);

  if (UPDATE_REFS) {
    console.log('\nUpdating source references...\n');
    const updatedFiles = await updateSourceReferences(successful);
    console.log(`\nUpdated ${updatedFiles} source files.`);
  } else {
    console.log('\nRun with --update-refs to update source code references from .png/.jpg to .webp');
  }

  if (DELETE_ORIGINALS) {
    console.log('\nDeleting original files...');
    for (const result of successful) {
      await unlink(result.inputPath);
    }
    console.log(`Deleted ${successful.length} original files.`);
  } else {
    console.log('Run with --delete-originals to remove the original .png/.jpg files after conversion.');
  }
}

main().catch(console.error);
