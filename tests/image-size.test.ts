import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { imageSize } from '@/lib/imageSize';

const root = path.resolve(__dirname, '..');

describe('imageSize', () => {
  it('reads AVIF ispe dimensions for on-page photos', () => {
    const rel = '/profile_avatar.avif';
    expect(existsSync(path.join(root, 'public', 'profile_avatar.avif'))).toBe(true);
    const size = imageSize(rel);
    expect(size).toBeTruthy();
    expect(size).toEqual({ w: 224, h: 224 });
  });

  it('still reads the JPEG Open Graph portrait', () => {
    const size = imageSize('/profile_square.jpg');
    expect(size).toEqual({ w: 1600, h: 1600 });
  });
});
