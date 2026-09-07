import fs from 'node:fs';
import path from 'node:path';

function avifSize(buf: Buffer): { w: number; h: number } | null {
  const tag = Buffer.from('ispe');
  let from = 0;
  while (from + 16 < buf.length) {
    const idx = buf.indexOf(tag, from);
    if (idx < 4) return null;
    const box = buf.readUInt32BE(idx - 4);
    if (box >= 20 && idx + 16 <= buf.length) {
      const w = buf.readUInt32BE(idx + 8);
      const h = buf.readUInt32BE(idx + 12);
      if (w > 0 && w < 65536 && h > 0 && h < 65536) return { w, h };
    }
    from = idx + 4;
  }
  return null;
}

function webpSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8X' && buf.length >= 30) {
    const w = 1 + buf.readUIntLE(24, 3);
    const h = 1 + buf.readUIntLE(27, 3);
    return w > 0 && h > 0 ? { w, h } : null;
  }
  if (kind === 'VP8 ' && buf.length >= 30) {
    const w = buf.readUInt16LE(26) & 0x3fff;
    const h = buf.readUInt16LE(28) & 0x3fff;
    return w > 0 && h > 0 ? { w, h } : null;
  }
  if (kind === 'VP8L' && buf.length >= 25) {
    const bits = buf.readUInt32LE(21);
    const w = (bits & 0x3fff) + 1;
    const h = ((bits >> 14) & 0x3fff) + 1;
    return w > 0 && h > 0 ? { w, h } : null;
  }
  return null;
}

/** Natural width/height from a public/ file (AVIF, WebP, JPEG, or PNG). */
export function imageSize(publicPath: string): { w: number; h: number } | null {
  const rel = publicPath.replace(/^\//, '');
  const file = path.join(process.cwd(), 'public', rel);
  if (!fs.existsSync(file)) return null;

  const buf = fs.readFileSync(file);
  if (buf.length < 24) return null;

  if (buf.toString('ascii', 4, 8) === 'ftyp' && buf.includes(Buffer.from('avif'), 8)) {
    return avifSize(buf);
  }

  const webp = webpSize(buf);
  if (webp) return webp;

  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return w > 0 && h > 0 ? { w, h } : null;
  }

  // JPEG: scan for SOF0/SOF2
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      if (len < 2) break;
      // Baseline / progressive DCT
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        const h = buf.readUInt16BE(i + 5);
        const w = buf.readUInt16BE(i + 7);
        return w > 0 && h > 0 ? { w, h } : null;
      }
      i += 2 + len;
    }
  }

  return null;
}
