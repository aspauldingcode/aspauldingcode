#!/usr/bin/env node
/**
 * Fetches GitHub stats via GraphQL and writes:
 *   - public/github/stats.json  (site React cards)
 *   - profile/github-overview.svg + public/github/github-overview.svg (README)
 *
 * Languages, stars, forks, and repository counts cover @LOGIN-owned public
 * non-fork repos plus every public non-fork repo in ATTRIBUTION_ORGS (Wawona
 * by default). Language bytes skip unmarked vendor trees in LANGUAGE_SKIP_REPOS
 * (Wawona/agent-device by default) so that tree does not drown Wawona compositor
 * share. GitHub forks stay excluded, same as personal repos. Contribution
 * counts and streaks still come from the user's public contribution calendar.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LOGIN = process.env.GITHUB_REPOSITORY_OWNER || 'aspauldingcode';
export const FROM_YEAR = Number(process.env.CONTRIB_FROM_YEAR || 2023);
export const ATTRIBUTION_ORGS = (process.env.GITHUB_ATTRIBUTION_ORGS || 'Wawona')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Unmarked vendor trees. Counted as repos/stars, omitted from language bytes. */
export const LANGUAGE_SKIP_REPOS = new Set(
  (process.env.GITHUB_LANGUAGE_SKIP_REPOS || 'Wawona/agent-device')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

const outDir = path.resolve(process.cwd(), 'public', 'github');
const profileDir = path.resolve(process.cwd(), 'profile');
const jsonPath = path.join(outDir, 'stats.json');

const REPO_FIELDS = `
  nameWithOwner
  stargazerCount
  forkCount
  languages(first: 25, orderBy: {field: SIZE, direction: DESC}) {
    edges {
      size
      node { name color }
    }
  }
`;

const USER_PAGE_QUERY = `
query($login: String!, $cursor: String) {
  user(login: $login) {
    followers { totalCount }
    repositories(
      ownerAffiliations: OWNER
      isFork: false
      first: 50
      after: $cursor
      orderBy: {field: UPDATED_AT, direction: DESC}
    ) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes { ${REPO_FIELDS} }
    }
  }
}
`;

const ORG_PAGE_QUERY = `
query($login: String!, $cursor: String) {
  organization(login: $login) {
    repositories(
      isFork: false
      first: 50
      after: $cursor
      orderBy: {field: UPDATED_AT, direction: DESC}
    ) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes { ${REPO_FIELDS} }
    }
  }
}
`;

const YEAR_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

function graphql(query, variables) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const body = JSON.stringify({ query, variables });

  if (token) {
    const res = execFileSync(
      'curl',
      [
        '-fsSL',
        '-H',
        `Authorization: bearer ${token}`,
        '-H',
        'Content-Type: application/json',
        'https://api.github.com/graphql',
        '-d',
        body,
      ],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    return JSON.parse(res);
  }

  return JSON.parse(
    execFileSync('gh', ['api', 'graphql', '--input', '-'], {
      encoding: 'utf8',
      input: body,
      maxBuffer: 10 * 1024 * 1024,
    })
  );
}

function paginateRepos(query, login, pickPage) {
  const nodes = [];
  let cursor = null;
  let firstPage = null;

  do {
    const data = graphql(query, { login, cursor });
    const page = pickPage(data);
    if (!page?.repositories) {
      console.error(`Failed listing repos for ${login}:`, JSON.stringify(data, null, 2));
      process.exit(1);
    }
    if (!firstPage) firstPage = page;
    nodes.push(...(page.repositories.nodes || []));
    cursor = page.repositories.pageInfo?.hasNextPage
      ? page.repositories.pageInfo.endCursor
      : null;
  } while (cursor);

  return { page: firstPage, nodes };
}

function fetchOwnedRepos(login) {
  return paginateRepos(USER_PAGE_QUERY, login, (data) => data?.data?.user);
}

function fetchOrgRepos(org) {
  return paginateRepos(ORG_PAGE_QUERY, org, (data) => data?.data?.organization);
}

function yearRange(year, now) {
  const from = `${year}-01-01T00:00:00Z`;
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const toDate = endOfYear > now ? now : endOfYear;
  const to = toDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return { from, to };
}

function fetchYearCollections(fromYear) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const collections = [];

  for (let year = currentYear; year >= fromYear; year--) {
    const { from, to } = yearRange(year, now);
    const data = graphql(YEAR_QUERY, { login: LOGIN, from, to });
    const coll = data?.data?.user?.contributionsCollection;
    if (!coll) {
      console.error(`Failed for ${year}:`, JSON.stringify(data, null, 2));
      process.exit(1);
    }
    collections.push({ year, coll });
  }

  return collections;
}

export function computeStreaks(days) {
  const byDate = new Map();
  for (const d of days) {
    byDate.set(d.date, (byDate.get(d.date) || 0) + d.contributionCount);
  }
  const sorted = [...byDate.keys()].sort();
  if (!sorted.length) {
    return { current: 0, longest: 0, totalActiveDays: 0 };
  }

  let longest = 0;
  let run = 0;
  for (const date of sorted) {
    if ((byDate.get(date) || 0) > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  let cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if ((byDate.get(iso(cursor)) || 0) === 0) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let current = 0;
  while ((byDate.get(iso(cursor)) || 0) > 0) {
    current += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const totalActiveDays = [...byDate.values()].filter((n) => n > 0).length;
  return { current, longest, totalActiveDays };
}

export const LANG_TOP_N = 8;
export const OTHER_LANG_COLOR = '#8b949e';

/** Top N languages by bytes; remainder rolled into a single Other slice. */
export function withOtherBucket(langs, topN = LANG_TOP_N) {
  const ranked = langs.filter((l) => l.size > 0).sort((a, b) => b.size - a.size);
  if (ranked.length <= topN) return ranked;
  const head = ranked.slice(0, topN);
  const rest = ranked.slice(topN);
  const otherSize = rest.reduce((s, l) => s + l.size, 0);
  const total = ranked.reduce((s, l) => s + l.size, 0) || 1;
  return [
    ...head.map((l) => ({
      ...l,
      percent: Math.round((l.size / total) * 1000) / 10,
    })),
    {
      name: 'Other',
      size: otherSize,
      percent: Math.round((otherSize / total) * 1000) / 10,
      color: OTHER_LANG_COLOR,
    },
  ];
}

export function repoKey(repo) {
  return String(repo?.nameWithOwner || '').toLowerCase();
}

/** Deduped union of personal + attribution-org repositories. First wins. */
export function mergeRepos(...lists) {
  const byKey = new Map();
  for (const repo of lists.flat()) {
    const key = repoKey(repo);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, repo);
  }
  return [...byKey.values()];
}

export function aggregateLanguages(repos, skipRepos = LANGUAGE_SKIP_REPOS) {
  const sizes = new Map();
  const colors = new Map();
  for (const repo of repos) {
    if (skipRepos.has(repoKey(repo))) continue;
    for (const edge of repo.languages?.edges || []) {
      const name = edge.node?.name;
      if (!name) continue;
      sizes.set(name, (sizes.get(name) || 0) + (edge.size || 0));
      if (edge.node.color) colors.set(name, edge.node.color);
    }
  }
  const total = [...sizes.values()].reduce((a, b) => a + b, 0) || 1;
  const all = [...sizes.entries()]
    .map(([name, size]) => ({
      name,
      size,
      percent: Math.round((size / total) * 1000) / 10,
      color: colors.get(name) || '#6fbfa4',
    }))
    .sort((a, b) => b.size - a.size);
  return withOtherBucket(all);
}

export function buildStats(user, yearCollections, repos, attributionOrgs = ATTRIBUTION_ORGS) {
  const days = [];
  let commits = 0;
  let contributions = 0;
  let pullRequests = 0;
  let issues = 0;
  let reviews = 0;

  for (const { coll } of yearCollections) {
    commits += coll.totalCommitContributions + (coll.restrictedContributionsCount || 0);
    contributions += coll.contributionCalendar.totalContributions;
    pullRequests += coll.totalPullRequestContributions;
    issues += coll.totalIssueContributions;
    reviews += coll.totalPullRequestReviewContributions;
    for (const week of coll.contributionCalendar.weeks) {
      days.push(...week.contributionDays);
    }
  }

  const stars = repos.reduce((s, r) => s + (r.stargazerCount || 0), 0);
  const forks = repos.reduce((s, r) => s + (r.forkCount || 0), 0);

  return {
    login: LOGIN,
    generatedAt: new Date().toISOString(),
    fromYear: FROM_YEAR,
    attributionOrgs,
    languageSkipRepos: [...LANGUAGE_SKIP_REPOS],
    metrics: {
      commits,
      contributions,
      pullRequests,
      issues,
      reviews,
      repositories: repos.length,
      stars,
      forks,
      followers: user.followers.totalCount,
    },
    streak: computeStreaks(days),
    languages: aggregateLanguages(repos),
  };
}

export function renderOverviewSvg(stats) {
  const langs = stats.languages.slice(0, 5);
  const w = 720;
  const h = 160 + Math.max(langs.length, 1) * 18;
  const metrics = [
    ['Commits', stats.metrics.commits],
    ['Contributions', stats.metrics.contributions],
    ['PRs', stats.metrics.pullRequests],
    ['Stars', stats.metrics.stars],
    ['Repos', stats.metrics.repositories],
  ];
  const metricCells = metrics
    .map(([label, value], i) => {
      const x = 24 + i * 138;
      return `<g transform="translate(${x},36)">
  <text class="num">${value.toLocaleString('en-US')}</text>
  <text class="lbl" y="28">${label}</text>
</g>`;
    })
    .join('\n');

  const streak = `<g transform="translate(24,100)">
  <text class="sec">Streak</text>
  <text class="body" y="26">Current ${stats.streak.current} days · Longest ${stats.streak.longest} days · ${stats.streak.totalActiveDays} active days</text>
</g>`;

  const maxPct = Math.max(...langs.map((l) => l.percent), 1);
  const langBars = langs
    .map((l, i) => {
      const y = 24 + i * 18;
      const barW = Math.max(4, Math.round((l.percent / maxPct) * 280));
      return `<g transform="translate(0,${y})">
  <text class="lang" x="0" y="0">${l.name}</text>
  <rect class="track" x="100" y="-9" width="280" height="10" rx="2"/>
  <rect x="100" y="-9" width="${barW}" height="10" rx="2" fill="${l.color}"/>
  <text class="lang" x="390" y="0">${l.percent}%</text>
</g>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="GitHub stats for ${stats.login}">
  <title>GitHub stats / ${stats.login}</title>
  <style>
    .num { font: 700 22px ui-sans-serif, system-ui, sans-serif; fill: #141816; }
    .lbl, .body, .lang, .sec { font: 12px ui-sans-serif, system-ui, sans-serif; fill: #5a635e; }
    .sec { font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; }
    .track { fill: #e4efea; }
    .panel { fill: #f6f7f5; stroke: #d5dbd6; }
    @media (prefers-color-scheme: dark) {
      .num { fill: #e6ebe8; }
      .lbl, .body, .lang, .sec { fill: #8f9a94; }
      .track { fill: #15221c; }
      .panel { fill: #0e1210; stroke: #252c28; }
    }
  </style>
  <rect class="panel" x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="8"/>
  ${metricCells}
  ${streak}
  <g transform="translate(24,148)">
    <text class="sec">Languages</text>
    ${langBars}
  </g>
</svg>
`;
}

function main() {
  const owned = fetchOwnedRepos(LOGIN);
  const followers = owned.page?.followers;
  if (!followers) {
    console.error('Missing followers on user query');
    process.exit(1);
  }

  const orgLists = ATTRIBUTION_ORGS.map((org) => fetchOrgRepos(org).nodes);
  const repos = mergeRepos(owned.nodes, ...orgLists);
  const yearCollections = fetchYearCollections(FROM_YEAR);
  const stats = buildStats({ followers }, yearCollections, repos);
  const svg = renderOverviewSvg(stats);

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(profileDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(stats, null, 2) + '\n');
  fs.writeFileSync(path.join(outDir, 'github-overview.svg'), svg);
  fs.writeFileSync(path.join(profileDir, 'github-overview.svg'), svg);

  console.log(
    `Wrote ${jsonPath} and overview SVGs (contributions=${stats.metrics.contributions}, repos=${stats.metrics.repositories}, orgs=${ATTRIBUTION_ORGS.join(',')}, streak=${stats.streak.current}/${stats.streak.longest})`
  );
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
