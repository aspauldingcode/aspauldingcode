import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  currentYearBand,
  renderContributionSvg,
  type ContribData,
} from '@/lib/contributionGraph';

const root = path.resolve(__dirname, '..');
const graph = JSON.parse(
  readFileSync(path.join(root, 'public/github/contributions.json'), 'utf8')
) as ContribData;

describe('contribution graph', () => {
  it('can SSR only the newest year band', () => {
    const current = currentYearBand(graph);
    expect(current).toHaveLength(1);
    expect(current[0]?.year).toBe(graph.years[0]?.year);

    const slim = renderContributionSvg(graph, current);
    const full = renderContributionSvg(graph, graph.years);
    expect(slim).toContain(`>${graph.years[0]?.year}<`);
    expect(slim.length).toBeLessThan(full.length / 2);
    expect(slim.match(/class="contrib-year"/g)?.length).toBe(1);
    expect(full.match(/class="contrib-year"/g)?.length).toBe(graph.years.length);
  });

  it('keeps contributions.json out of the work-column React tree', () => {
    const home = readFileSync(path.join(root, 'src/components/HomeContent.tsx'), 'utf8');
    const host = readFileSync(path.join(root, 'src/components/ContributionGraphHost.tsx'), 'utf8');
    const shell = readFileSync(path.join(root, 'src/components/SplitShell.tsx'), 'utf8');
    expect(home).not.toMatch('contributions.json');
    expect(host).not.toMatch('contributions.json');
    expect(shell).not.toMatch('contributions.json');
    expect(home).toContain('ContributionGraphHost');
  });
});
