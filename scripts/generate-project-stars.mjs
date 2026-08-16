#!/usr/bin/env node
/**
 * Poll GitHub star counts for portfolio / resume repos.
 * Writes public/github/project-stars.json for the site to import.
 */
import fs from 'node:fs';
import path from 'node:path';

const outPath = path.resolve(process.cwd(), 'public', 'github', 'project-stars.json');
const workDir = path.resolve(process.cwd(), 'content', 'work');
const resumePath = path.resolve(process.cwd(), 'resume.json');

const REPO_RE =
  /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/gi;
const SKIP_OWNERS = new Set([
  'features',
  'topics',
  'collections',
  'trending',
  'events',
  'sponsors',
  'settings',
  'marketplace',
  'orgs',
  'organizations',
  'pulls',
  'issues',
  'explore',
  'notifications',
  'login',
  'join',
]);

function repoKey(owner, repo) {
  const name = repo.replace(/\.git$/i, '');
  if (!owner || !name || SKIP_OWNERS.has(owner.toLowerCase())) return null;
  if (name === 'issues' || name === 'pulls' || name === 'actions') return null;
  return {
    key: `${owner}/${name}`.toLowerCase(),
    owner,
    repo: name,
    url: `https://github.com/${owner}/${name}`,
  };
}

function collectFromText(text, into) {
  REPO_RE.lastIndex = 0;
  let match;
  while ((match = REPO_RE.exec(text))) {
    const found = repoKey(match[1], match[2]);
    if (found) into.set(found.key, found);
  }
}

function collectRepos() {
  const into = new Map();
  if (fs.existsSync(workDir)) {
    for (const name of fs.readdirSync(workDir)) {
      if (!name.endsWith('.md')) continue;
      collectFromText(fs.readFileSync(path.join(workDir, name), 'utf8'), into);
    }
  }
  if (fs.existsSync(resumePath)) {
    collectFromText(fs.readFileSync(resumePath, 'utf8'), into);
  }
  return [...into.values()];
}

async function fetchStars(owner, repo, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'aspauldingcode-project-stars',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`${owner}/${repo} HTTP ${res.status}`);
  }
  const body = await res.json();
  const stars = Number(body.stargazers_count);
  if (!Number.isFinite(stars)) {
    throw new Error(`${owner}/${repo} missing stargazers_count`);
  }
  return stars;
}

const previous = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
  : { repos: {} };

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const repos = {};
let failed = 0;

for (const repo of collectRepos()) {
  try {
    const stars = await fetchStars(repo.owner, repo.repo, token);
    repos[repo.key] = { stars, url: repo.url };
    console.log(`${repo.key} ${stars}`);
  } catch (err) {
    failed += 1;
    const kept = previous.repos?.[repo.key];
    if (kept) {
      repos[repo.key] = kept;
      console.warn(`${repo.key}: ${err.message}; kept ${kept.stars}`);
    } else {
      console.warn(`${repo.key}: ${err.message}`);
    }
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), repos }, null, 2)}\n`
);

if (failed && Object.keys(repos).length === 0) {
  process.exit(1);
}
