#!/usr/bin/env node
/**
 * Shrink the Open Graph JPEG and write tab icons every engine can decode.
 * PNG links for Blink / Gecko / WebKit. ICO last (32 first: Safari uses
 * the first ICO frame). Apple touch is an opaque 180 PNG, not the OG JPEG.
 */
import { readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const square = path.join(pub, 'profile_square.jpg');
const favicon = path.join(pub, 'favicon.ico');
const favicon32 = path.join(pub, 'favicon-32.png');
const appleTouch = path.join(pub, 'apple-touch-icon.png');
const APPLE_BG = '#f4f2ec';

function encodeIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6 + 16 * count);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = header.length;
  const chunks = [header];
  images.forEach((img, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(img.meta.width >= 256 ? 0 : img.meta.width, entry);
    header.writeUInt8(img.meta.height >= 256 ? 0 : img.meta.height, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(img.buf.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    chunks.push(img.buf);
    offset += img.buf.length;
  });
  return Buffer.concat(chunks);
}

const beforeSquare = (await stat(square)).size;
const beforeIco = (await stat(favicon)).size;
const meta = await sharp(square).metadata();

if (meta.width !== 1200 || meta.height !== 1200 || beforeSquare > 140_000) {
  const tmp = path.join(pub, 'profile_square.tmp.jpg');
  await sharp(square)
    .rotate()
    .resize(1200, 1200, { fit: 'cover' })
    .jpeg({ quality: 74, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toFile(tmp);
  await rename(tmp, square);
}

const src = await readFile(square);

await sharp(src).resize(32, 32).png({ compressionLevel: 9 }).toFile(favicon32);

await sharp({
  create: { width: 180, height: 180, channels: 3, background: APPLE_BG },
})
  .composite([{ input: await sharp(src).resize(180, 180).png().toBuffer() }])
  .png({ compressionLevel: 9 })
  .toFile(appleTouch);

const icoFrames = [];
for (const edge of [32, 16, 48]) {
  const buf = await sharp(src).resize(edge, edge).png({ compressionLevel: 9 }).toBuffer();
  icoFrames.push({ buf, meta: { width: edge, height: edge } });
}
await writeFile(favicon, encodeIco(icoFrames));

const afterSquare = (await stat(square)).size;
const afterIco = (await stat(favicon)).size;
const after32 = (await stat(favicon32)).size;
const afterApple = (await stat(appleTouch)).size;
console.log(`profile_square.jpg     ${beforeSquare} -> ${afterSquare}`);
console.log(`favicon.ico            ${beforeIco} -> ${afterIco}`);
console.log(`favicon-32.png         ${after32}`);
console.log(`apple-touch-icon.png   ${afterApple}`);
