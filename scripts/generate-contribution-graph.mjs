#!/usr/bin/env node
/**
 * Writes public/github/contributions.json from the GitHub GraphQL API.
 * The site renders that data as an inline SVG (not a static <img>).
 *
 * Uses GITHUB_TOKEN / GH_TOKEN when set (Actions), otherwise relies on `gh auth`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LOGIN = process.env.GITHUB_REPOSITORY_OWNER || 'aspauldingcode';
const FROM_YEAR = Number(process.env.CONTRIB_FROM_YEAR || 2023);
const outDir = path.resolve(process.cwd(), 'public', 'github');
const outPath = path.join(outDir, 'contributions.json');

const QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            contributionLevel
          }
        }
      }
    }
  }
}
`;

function graphql(variables) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const body = JSON.stringify({ query: QUERY, variables });

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

  const res = execFileSync(
    'gh',
    ['api', 'graphql', '--input', '-'],
    {
      encoding: 'utf8',
      input: body,
      maxBuffer: 10 * 1024 * 1024,
    }
  );
  return JSON.parse(res);
}

function yearRange(year, now) {
  const from = `${year}-01-01T00:00:00Z`;
  const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const toDate = endOfYear > now ? now : endOfYear;
  const to = toDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
  return { from, to };
}

function fetchYears(fromYear) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const years = [];

  for (let year = currentYear; year >= fromYear; year--) {
    const { from, to } = yearRange(year, now);
    const data = graphql({ login: LOGIN, from, to });
    const calendar = data?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar) {
      console.error(`Failed for ${year}:`, JSON.stringify(data, null, 2));
      process.exit(1);
    }
    years.push({
      year,
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks.map((week) => ({
        contributionDays: week.contributionDays.map((day) => ({
          date: day.date,
          contributionCount: day.contributionCount,
          contributionLevel: day.contributionLevel,
        })),
      })),
    });
  }

  return years;
}

const years = fetchYears(FROM_YEAR);
const total = years.reduce((sum, y) => sum + y.totalContributions, 0);
const payload = {
  login: LOGIN,
  fromYear: FROM_YEAR,
  generatedAt: new Date().toISOString(),
  total,
  years,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload)}\n`);
console.log(
  `Wrote ${outPath} (${total} contributions; years ${years.map((y) => y.year).join(', ')})`
);
