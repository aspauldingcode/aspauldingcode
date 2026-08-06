#!/usr/bin/env node
/**
 * Collect recent GitHub activity for allowlisted repos into artifacts/activity.json.
 * No LLM. Uses GITHUB_TOKEN / GH_TOKEN / gh auth.
 *
 * Usage:
 *   node scripts/portfolio-agent/collect.mjs [--out artifacts/activity.json] [--days 14]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const LOGIN = process.env.GITHUB_REPOSITORY_OWNER || 'aspauldingcode';

const DEFAULT_REPOS = [
  'Wawona/Wawona',
  'aspauldingcode/apple-sharpener',
  'aspauldingcode/Whisperer',
  'aspauldingcode/aspauldingcode',
];

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const OUT = path.resolve(ROOT, argValue('--out', 'artifacts/activity.json'));
const DAYS = Number(argValue('--days', process.env.PORTFOLIO_LOOKBACK_DAYS || '14'));
const REPOS = (process.env.PORTFOLIO_REPOS || DEFAULT_REPOS.join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function ghApi(apiPath) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.PORTFOLIO_GH_TOKEN;
  if (token) {
    const res = execFileSync(
      'curl',
      [
        '-fsSL',
        '-H',
        `Authorization: Bearer ${token}`,
        '-H',
        'Accept: application/vnd.github+json',
        '-H',
        'X-GitHub-Api-Version: 2022-11-28',
        `https://api.github.com${apiPath}`,
      ],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    return JSON.parse(res);
  }
  const res = execFileSync('gh', ['api', apiPath], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(res);
}

function sinceIso(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function collectRepo(fullName, since) {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) return null;

  let commits = [];
  try {
    const rows = ghApi(
      `/repos/${owner}/${repo}/commits?author=${encodeURIComponent(LOGIN)}&since=${encodeURIComponent(since)}&per_page=30`
    );
    if (Array.isArray(rows)) {
      commits = rows.map((c) => ({
        sha: String(c.sha || '').slice(0, 7),
        message: String(c.commit?.message || '')
          .split('\n')[0]
          .slice(0, 160),
        date: c.commit?.author?.date || c.commit?.committer?.date || null,
      }));
    }
  } catch {
    commits = [];
  }

  let languages_hint = [];
  try {
    const langs = ghApi(`/repos/${owner}/${repo}/languages`);
    languages_hint = Object.keys(langs || {}).slice(0, 6);
  } catch {
    languages_hint = [];
  }

  return { full_name: fullName, commits, languages_hint };
}

function main() {
  const since = sinceIso(DAYS);
  const repos = [];
  for (const name of REPOS) {
    const row = collectRepo(name, since);
    if (row && row.commits.length > 0) repos.push(row);
    else if (row) repos.push({ ...row, commits: [] });
  }

  const active = repos.filter((r) => r.commits.length > 0);
  const resumePath = path.join(ROOT, 'resume.json');
  const resume = JSON.parse(fs.readFileSync(resumePath, 'utf8'));

  const payload = {
    generated_at: new Date().toISOString(),
    since,
    days: DAYS,
    login: LOGIN,
    repos: active.length ? active : repos,
    resume_snapshot: {
      label: resume.basics?.label ?? null,
      summary: resume.basics?.summary ?? null,
      projects: (resume.projects ?? []).map((p) => ({
        name: p.name,
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
      })),
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  const commitCount = payload.repos.reduce((n, r) => n + r.commits.length, 0);
  console.log(
    `Wrote ${OUT} (${payload.repos.length} repos, ${commitCount} commits since ${since.slice(0, 10)})`
  );
  if (commitCount === 0) process.exitCode = 2;
}

main();
