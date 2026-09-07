import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_ORGS,
  aggregateLanguages,
  buildStats,
  mergeRepos,
} from '../scripts/generate-github-stats.mjs';
import { attributionFootnote } from '@/components/GitHubStats';

function repo(
  nameWithOwner: string,
  langs: { name: string; size: number; color?: string }[],
  extras: { stargazerCount?: number; forkCount?: number } = {}
) {
  return {
    nameWithOwner,
    stargazerCount: extras.stargazerCount ?? 0,
    forkCount: extras.forkCount ?? 0,
    languages: {
      edges: langs.map((lang) => ({
        size: lang.size,
        node: { name: lang.name, color: lang.color || '#000' },
      })),
    },
  };
}

const emptyYears = [
  {
    year: 2026,
    coll: {
      totalCommitContributions: 10,
      totalPullRequestContributions: 0,
      totalIssueContributions: 0,
      totalPullRequestReviewContributions: 0,
      restrictedContributionsCount: 0,
      contributionCalendar: { totalContributions: 10, weeks: [] },
    },
  },
];

describe('GitHub stats attribution', () => {
  it('attributes the Wawona GitHub organization by default', () => {
    expect(ATTRIBUTION_ORGS).toEqual(['Wawona']);
  });

  it('merges personal and Wawona org repositories without double-counting', () => {
    const owned = repo('aspauldingcode/apple-sharpener', [
      { name: 'Objective-C', size: 100 },
    ]);
    const wawona = repo('Wawona/Wawona', [{ name: 'Rust', size: 500 }]);
    const duplicate = repo('Wawona/Wawona', [{ name: 'Rust', size: 1 }]);

    const merged = mergeRepos([owned], [wawona, duplicate]);
    expect(merged.map((r) => r.nameWithOwner)).toEqual([
      'aspauldingcode/apple-sharpener',
      'Wawona/Wawona',
    ]);
  });

  it('counts Wawona compositor languages in the pie', () => {
    const owned = [
      repo('aspauldingcode/apple-sharpener', [
        { name: 'Objective-C', size: 1600 },
        { name: 'Swift', size: 400 },
      ]),
      repo('aspauldingcode/aspauldingcode', [{ name: 'TypeScript', size: 200 }]),
    ];
    const wawona = [
      repo('Wawona/Wawona', [
        { name: 'Rust', size: 1500 },
        { name: 'Objective-C', size: 1400 },
        { name: 'C', size: 1300 },
      ]),
      repo('Wawona/wwn-runtime', [{ name: 'Rust', size: 70 }]),
    ];

    const langs = aggregateLanguages(mergeRepos(owned, wawona));
    const rust = langs.find((l) => l.name === 'Rust');
    const objc = langs.find((l) => l.name === 'Objective-C');
    const ts = langs.find((l) => l.name === 'TypeScript');

    expect(rust).toBeTruthy();
    expect(objc).toBeTruthy();
    expect(rust!.size).toBe(1570);
    expect(objc!.size).toBe(3000);
    expect(objc!.percent).toBeGreaterThan(ts?.percent ?? 0);
    expect(rust!.percent).toBeGreaterThan(ts?.percent ?? 0);
  });

  it('omits unmarked vendor trees from language bytes, not repo totals', () => {
    const repos = mergeRepos(
      [repo('aspauldingcode/apple-sharpener', [{ name: 'Objective-C', size: 1600 }])],
      [
        repo('Wawona/Wawona', [{ name: 'Rust', size: 1500 }]),
        repo('Wawona/agent-device', [{ name: 'TypeScript', size: 8200000 }]),
      ]
    );
    const langs = aggregateLanguages(repos);
    const stats = buildStats(
      { followers: { totalCount: 1 } },
      emptyYears,
      repos,
      ['Wawona']
    );

    expect(stats.metrics.repositories).toBe(3);
    expect(langs.find((l) => l.name === 'TypeScript')).toBeUndefined();
    expect(langs.find((l) => l.name === 'Rust')?.size).toBe(1500);
  });

  it('adds Wawona stars and repository counts to GitHub stats', () => {
    const repos = mergeRepos(
      [repo('aspauldingcode/apple-sharpener', [], { stargazerCount: 300, forkCount: 10 })],
      [repo('Wawona/Wawona', [], { stargazerCount: 253, forkCount: 16 })]
    );
    const stats = buildStats(
      { followers: { totalCount: 74 } },
      emptyYears,
      repos,
      ['Wawona']
    );

    expect(stats.attributionOrgs).toEqual(['Wawona']);
    expect(stats.metrics.repositories).toBe(2);
    expect(stats.metrics.stars).toBe(553);
    expect(stats.metrics.forks).toBe(26);
    expect(stats.languageSkipRepos).toContain('wawona/agent-device');
  });

  it('names the Wawona organization in the language footnote', () => {
    expect(attributionFootnote('aspauldingcode', ['Wawona'])).toBe(
      'Language share by bytes across @aspauldingcode public repositories and the Wawona GitHub organization.'
    );
  });
});
