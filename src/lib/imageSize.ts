import fs from 'node:fs';
import path from 'node:path';

/** Natural width/height from a public/ file (JPEG or PNG). */
export function imageSize(publicPath: string): { w: number; h: number } | null {
  const rel = publicPath.replace(/^\//, '');
  const file = path.join(process.cwd(), 'public', rel);
  if (!fs.existsSync(file)) return null;

  const buf = fs.readFileSync(file);
  if (buf.length < 24) return null;

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
