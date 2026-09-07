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
    expect(size).toEqual({ w: 1200, h: 1200 });
  });

  it('ships PNG tab and apple-touch icons for every engine', () => {
    expect(existsSync(path.join(root, 'public', 'favicon-32.png'))).toBe(true);
    expect(existsSync(path.join(root, 'public', 'apple-touch-icon.png'))).toBe(true);
    expect(existsSync(path.join(root, 'public', 'favicon.ico'))).toBe(true);
    expect(imageSize('/favicon-32.png')).toEqual({ w: 32, h: 32 });
    expect(imageSize('/apple-touch-icon.png')).toEqual({ w: 180, h: 180 });
  });
});

