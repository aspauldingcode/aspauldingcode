#!/usr/bin/env node
/**
 * Convert public JPEG/PNG (except the Open Graph portrait) to AVIF.
 * Caps the long edge at 1920 so gallery "previews" are web-sized.
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const MAX_EDGE = 1920;
const SKIP = new Set(['profile_square.jpg']);

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'github' || ent.name === 'fonts') continue;
      out.push(...(await walk(full)));
      continue;
    }
    if (!/\.(jpe?g|png)$/i.test(ent.name)) continue;
    if (SKIP.has(ent.name)) continue;
    out.push(full);
  }
  return out;
}

async function convert(src) {
  const dest = src.replace(/\.(jpe?g|png)$/i, '.avif');
  const png = /\.png$/i.test(src);
  const img = sharp(src);
  const meta = await img.metadata();
  let pipeline = img.rotate();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (w > MAX_EDGE || h > MAX_EDGE) {
    pipeline = pipeline.resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }
  const before = (await stat(src)).size;
  await pipeline
    .avif({
      quality: png ? 72 : 50,
      effort: 6,
      chromaSubsampling: png ? '4:4:4' : '4:2:0',
    })
    .toFile(dest);
  const after = (await stat(dest)).size;
  await unlink(src);
  return { src, dest, before, after };
}

const files = await walk(pub);
if (files.length === 0) {
  console.log('No JPEG/PNG sources to convert.');
  process.exit(0);
}

let before = 0;
let after = 0;
for (const file of files) {
  const row = await convert(file);
  before += row.before;
  after += row.after;
  const rel = path.relative(pub, row.dest);
  const pct = row.before ? Math.round((100 * row.after) / row.before) : 0;
  console.log(`${rel}  ${row.before} -> ${row.after} (${pct}%)`);
}
console.log(
  `done ${files.length} files  ${before} -> ${after} (${
    before ? Math.round((100 * after) / before) : 0
  }%)`
);
