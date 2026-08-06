#!/usr/bin/env node
/**
 * Writes public/github/contributions.svg from the GitHub GraphQL API.
 * Covers calendar years FROM_YEAR through the current year (inclusive),
 * one horizontal band per year so 2023 / 2024 / 2025 / 2026 all read clearly.
 *
 * Uses GITHUB_TOKEN / GH_TOKEN when set (Actions), otherwise relies on `gh auth`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LOGIN = process.env.GITHUB_REPOSITORY_OWNER || 'aspauldingcode';
const FROM_YEAR = Number(process.env.CONTRIB_FROM_YEAR || 2023);
const outDir = path.resolve(process.cwd(), 'public', 'github');
const outPathLight = path.join(outDir, 'contributions.svg');
const outPathDark = path.join(outDir, 'contributions-dark.svg');

const THEMES = {
  light: {
    year: '#141816',
    muted: '#5a635e',
    band: '#f3f6f4',
    l0: '#dfe8e3',
    l1: '#a8d5c4',
    l2: '#6fbfa4',
    l3: '#3d9a7c',
    l4: '#1f6f5b',
  },
  dark: {
    year: '#e6ebe8',
    muted: '#8f9a94',
    band: '#121815',
    l0: '#1a2420',
    l1: '#1f4a3c',
    l2: '#2f7a62',
    l3: '#4ea888',
    l4: '#6fbfa4',
  },
};

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
    years.push({ year, calendar });
  }

  return years;
}

const LEVEL = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function renderSvg(yearCalendars, theme) {
  const cell = 11;
  const gap = 3;
  const step = cell + gap;
  // Wide enough for "Mon"/"Wed"/"Fri" so they sit clear of the year header.
  const padL = 52;
  const padR = 10;
  const headerH = 22; // year + count only; weekday labels live beside the grid
  const monthH = 16;
  const padB = 28;
  const bandGap = 28;
  const gridH = 7 * step;
  const maxWeeks = Math.max(...yearCalendars.map((y) => y.calendar.weeks.length), 53);
  const width = padL + maxWeeks * step + padR;
  const bandBlock = headerH + monthH + gridH;
  const height =
    8 + yearCalendars.length * bandBlock + (yearCalendars.length - 1) * bandGap + padB;
  const total = yearCalendars.reduce((sum, y) => sum + y.calendar.totalContributions, 0);
  const newestYear = yearCalendars[0].year;
  const oldestYear = yearCalendars[yearCalendars.length - 1].year;

  // Full weekday names, one set per year band (aligned to Mon/Wed/Fri rows).
  const weekdayMarks = [
    { i: 1, t: 'Mon' },
    { i: 3, t: 'Wed' },
    { i: 5, t: 'Fri' },
  ];

  const bands = yearCalendars.map((entry, yi) => {
    const top = 8 + yi * (bandBlock + bandGap);
    const gridY = top + headerH + monthH;
    const count = entry.calendar.totalContributions;
    const currentYear = new Date().getUTCFullYear();
    const countLabel =
      entry.year === currentYear
        ? `${count} contributions (and counting)`
        : `${count} contributions`;

    // Year sits above the month row / grid, not in the Mon/Wed/Fri gutter.
    const header = `<text class="year" x="${padL}" y="${top + 14}">${entry.year}</text>
  <text class="year-count" x="${width - padR}" y="${top + 14}" text-anchor="end">${countLabel}</text>`;

    // Month labels: first day-of-month column for this year
    const monthMarks = [];
    const seen = new Set();
    entry.calendar.weeks.forEach((week, wi) => {
      for (const day of week.contributionDays) {
        if (!day.date.startsWith(String(entry.year))) continue;
        const month = Number(day.date.slice(5, 7));
        if (seen.has(month)) continue;
        // Prefer early-in-month columns
        const dom = Number(day.date.slice(8, 10));
        if (dom > 7 && seen.size > 0) continue;
        seen.add(month);
        monthMarks.push(
          `<text class="month" x="${padL + wi * step}" y="${top + headerH + 12}">${MONTHS[month - 1]}</text>`
        );
        break;
      }
    });

    const wd = weekdayMarks
      .map(({ i, t }) => {
        // Baseline near vertical center of the weekday row.
        const y = gridY + i * step + Math.round(cell * 0.78);
        return `<text class="label" x="${padL - 8}" y="${y}" text-anchor="end">${t}</text>`;
      })
      .join('\n  ');

    const cells = [];
    entry.calendar.weeks.forEach((week, wi) => {
      week.contributionDays.forEach((day) => {
        if (!day.date.startsWith(String(entry.year))) return;
        const level = LEVEL[day.contributionLevel] ?? 0;
        const d = new Date(`${day.date}T12:00:00Z`);
        const ri = d.getUTCDay();
        const x = padL + wi * step;
        const y = gridY + ri * step;
        const title = `${day.contributionCount} contribution${
          day.contributionCount === 1 ? '' : 's'
        } on ${day.date}`;
        cells.push(
          `<rect class="l${level}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" ry="2"><title>${title}</title></rect>`
        );
      });
    });

    const bandBg = `<rect class="band" x="${padL - 2}" y="${gridY - 2}" width="${
      maxWeeks * step + 4
    }" height="${gridH + 4}" rx="4" />`;

    return `${header}
  ${monthMarks.join('\n  ')}
  ${bandBg}
  ${wd}
  ${cells.join('\n  ')}`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub contribution graphs for ${LOGIN} by year from ${oldestYear} through ${newestYear}: ${total} total contributions">
  <title>GitHub contributions by year ${oldestYear}-${newestYear} / ${LOGIN}</title>
  <style>
    .year { font: 600 14px ui-sans-serif, system-ui, sans-serif; fill: ${theme.year}; }
    .year-count { font: 11px ui-sans-serif, system-ui, sans-serif; fill: ${theme.muted}; }
    .month { font: 10px ui-sans-serif, system-ui, sans-serif; fill: ${theme.muted}; }
    .label { font: 10px ui-sans-serif, system-ui, sans-serif; fill: ${theme.muted}; }
    .caption { font: 11px ui-sans-serif, system-ui, sans-serif; fill: ${theme.muted}; }
    .band { fill: ${theme.band}; }
    .l0 { fill: ${theme.l0}; }
    .l1 { fill: ${theme.l1}; }
    .l2 { fill: ${theme.l2}; }
    .l3 { fill: ${theme.l3}; }
    .l4 { fill: ${theme.l4}; }
  </style>
  ${bands.join('\n  ')}
  <text class="caption" x="${padL}" y="${height - 10}">${total} contributions total / ${oldestYear}-present / @${LOGIN}</text>
</svg>
`;
}

const yearCalendars = fetchYears(FROM_YEAR);
const total = yearCalendars.reduce((sum, y) => sum + y.calendar.totalContributions, 0);
const yearsLabel = yearCalendars.map((y) => y.year).join(', ');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPathLight, renderSvg(yearCalendars, THEMES.light));
fs.writeFileSync(outPathDark, renderSvg(yearCalendars, THEMES.dark));
console.log(
  `Wrote ${outPathLight} + ${outPathDark} (${total} contributions; years ${yearsLabel})`
);
