import { describe, expect, it } from 'vitest';
import {
  formatStarCount,
  githubRepoKey,
  starsForHrefs,
} from '@/lib/projectStars';

describe('project stars', () => {
  it('parses repository URLs and ignores non-repo GitHub paths', () => {
    expect(githubRepoKey('https://github.com/Wawona/Wawona')).toBe('wawona/wawona');
    expect(githubRepoKey('https://github.com/aspauldingcode/apple-sharpener.git')).toBe(
      'aspauldingcode/apple-sharpener'
    );
    expect(githubRepoKey('https://github.com/features/actions')).toBeNull();
    expect(githubRepoKey('https://wawona.io')).toBeNull();
  });

  it('writes stars in words', () => {
    expect(formatStarCount(1)).toBe('1 star');
    expect(formatStarCount(304)).toBe('304 stars');
    expect(formatStarCount(1234)).toBe('1,234 stars');
  });

  it('looks up committed star counts for portfolio repos', () => {
    const wawona = starsForHrefs(['https://github.com/Wawona/Wawona']);
    const sharpener = starsForHrefs([
      'https://wawona.io',
      'https://github.com/aspauldingcode/apple-sharpener',
    ]);
    expect(wawona).toBeGreaterThan(0);
    expect(sharpener).toBeGreaterThan(0);
  });
});
