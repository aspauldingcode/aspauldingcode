import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { connectionBudget, warmPlan } from '@/lib/prefetchImages';

const root = path.resolve(__dirname, '..');

const projects = [
  { images: ['/a.avif', '/a2.avif'] },
  { images: ['/b.avif'] },
  { images: ['/a.avif', '/c.avif'] },
];

describe('image warm plan', () => {
  it('skips background work on save-data and 2g', () => {
    expect(connectionBudget({ saveData: true })).toEqual({
      decodeHeroes: false,
      cacheRest: false,
      concurrency: 1,
    });
    expect(connectionBudget({ effectiveType: '2g' })).toEqual({
      decodeHeroes: false,
      cacheRest: false,
      concurrency: 1,
    });
    expect(warmPlan(projects, connectionBudget({ saveData: true }))).toEqual({
      decode: [],
      cache: [],
    });
  });

  it('decodes one hero per project then caches the rest', () => {
    const budget = connectionBudget({});
    expect(budget.decodeHeroes).toBe(true);
    expect(budget.cacheRest).toBe(true);
    expect(budget.concurrency).toBe(2);
    expect(warmPlan(projects, budget)).toEqual({
      decode: ['/a.avif', '/b.avif'],
      cache: ['/a2.avif', '/c.avif'],
    });
  });

  it('uses one at a time on 3g or tight hardware', () => {
    expect(connectionBudget({ effectiveType: '3g' }).concurrency).toBe(1);
    expect(connectionBudget({ hardwareConcurrency: 2 }).concurrency).toBe(1);
    expect(connectionBudget({ deviceMemory: 2 }).concurrency).toBe(1);
  });

  it('homes all gallery srcs, not only the first slide', () => {
    const home = readFileSync(path.join(root, 'src/components/HomePage.astro'), 'utf8');
    expect(home).toContain('images: p.images');
    expect(home).not.toContain('images: p.images.slice(0, 1)');
    const warm = readFileSync(path.join(root, 'src/scripts/image-warm.ts'), 'utf8');
    expect(warm).toContain('warmPlan');
    expect(warm).toContain('enqueueImages');
    const route = readFileSync(path.join(root, 'src/scripts/work-route.ts'), 'utf8');
    expect(route).toContain('paneImageSrcs');
    expect(route).toContain('warmPane');
    expect(route).not.toMatch(/querySelectorAll\('img'\)\.forEach/);
  });
});
