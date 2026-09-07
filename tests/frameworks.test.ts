import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  badgePayload,
  major,
  pickRootRow,
  reportFromOutdated,
  SITE_FRAMEWORKS,
} from '../scripts/check-frameworks.mjs';

const root = path.resolve(__dirname, '..');

describe('framework freshness', () => {
  it('treats a wanted bump as outdated and a new major as a note', () => {
    const lock = {
      packages: {
        'node_modules/react': { version: '19.2.8' },
      },
    };
    const outdated = {
      astro: {
        current: '5.16.6',
        wanted: '5.18.2',
        latest: '7.3.1',
        location: path.join(root, 'node_modules', 'astro'),
      },
      '@astrojs/vercel': {
        current: '8.2.11',
        wanted: '8.2.11',
        latest: '11.0.10',
        location: path.join(root, 'node_modules', '@astrojs/vercel'),
      },
    };
    const report = reportFromOutdated(SITE_FRAMEWORKS, outdated, lock, '2026-09-07');
    expect(report.ok).toBe(false);
    expect(report.packages.find((pkg) => pkg.name === 'astro')).toMatchObject({
      status: 'behind',
      nextMajor: true,
    });
    expect(report.packages.find((pkg) => pkg.name === '@astrojs/vercel')).toMatchObject({
      status: 'current',
      nextMajor: true,
    });
    expect(report.packages.find((pkg) => pkg.name === 'react')).toMatchObject({
      status: 'current',
      current: '19.2.8',
    });
    expect(badgePayload(report)).toEqual({
      schemaVersion: 1,
      label: 'portfolio frameworks',
      message: 'outdated',
      color: 'yellow',
    });
    expect(badgePayload({ ...report, ok: true }).message).toBe('up to date');
  });

  it('picks the root install when npm outdated lists nested copies', () => {
    const name = 'astro';
    const row = pickRootRow(
      name,
      [
        {
          current: '5.0.0',
          location: path.join(root, 'node_modules', '@astrojs/vercel', 'node_modules', name),
        },
        {
          current: '5.18.2',
          location: path.join(root, 'node_modules', name),
        },
      ],
      root
    );
    expect(row?.current).toBe('5.18.2');
    expect(major('5.18.2')).toBe('5');
    expect(major('7.3.1')).toBe('7');
  });

  it('wires the README badge, weekly workflow, and Vercel report', () => {
    const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
    expect(readme).toContain('Portfolio frameworks');
    expect(readme).toContain('bench/frameworks-badge.json');
    expect(readme).toContain('frameworks.yml');
    const weekly = readFileSync(path.join(root, '.github/workflows/frameworks.yml'), 'utf8');
    expect(weekly).toContain('name: Portfolio frameworks');
    expect(weekly).toContain('cron:');
    expect(weekly).toContain('frameworks:check');
    const ci = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toContain('frameworks:check');
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.scripts['vercel-build']).toContain('--report-only');
    expect(pkg.scripts['frameworks:check']).toBe('node scripts/check-frameworks.mjs --write');
  });
});
