#!/usr/bin/env node
/**
 * Compare installed site frameworks to the versions `npm update` would install.
 * New majors (Astro 7 while we are on 5) are notes, not a fail.
 * Used by `npm run frameworks:check`, Portfolio tests, weekly CI, and Vercel.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SITE_FRAMEWORKS = [
  'astro',
  '@astrojs/react',
  '@astrojs/vercel',
  'react',
  'react-dom',
];

export function major(version) {
  const n = String(version ?? '').split('.')[0];
  return n || '';
}

export function pickRootRow(name, value, rootDir = ROOT) {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  const want = path.join(rootDir, 'node_modules', name);
  return rows.find((row) => row && row.location === want) || rows[0] || null;
}

export function installedVersion(lock, name) {
  const entry = lock?.packages?.[`node_modules/${name}`];
  return typeof entry?.version === 'string' ? entry.version : null;
}

export function reportFromOutdated(frameworks, outdated, lock, checkedAt) {
  const packages = frameworks.map((name) => {
    const row = pickRootRow(name, outdated[name]);
    const current = row?.current || installedVersion(lock, name);
    const wanted = row?.wanted || current;
    const latest = row?.latest || current;
    const behind = Boolean(current && wanted && current !== wanted);
    return {
      name,
      status: behind ? 'behind' : 'current',
      current,
      wanted,
      latest,
      nextMajor: Boolean(current && latest && major(current) !== major(latest)),
    };
  });
  return {
    ok: packages.every((pkg) => pkg.status === 'current'),
    checkedAt,
    packages,
  };
}

export function badgePayload(report) {
  return {
    schemaVersion: 1,
    label: 'portfolio frameworks',
    message: report.ok ? 'up to date' : 'outdated',
    color: report.ok ? 'brightgreen' : 'yellow',
  };
}

export function formatReport(report) {
  const lines = report.packages.map((pkg) => {
    const bits = [`${pkg.name} ${pkg.current || '?'}`];
    if (pkg.status === 'behind') bits.push(`wanted ${pkg.wanted}`);
    if (pkg.nextMajor) bits.push(`latest major ${pkg.latest}`);
    return bits.join(' / ');
  });
  const head = report.ok ? 'Site frameworks are up to date.' : 'Site frameworks are outdated.';
  return [head, ...lines].join('\n');
}

function readLock() {
  return JSON.parse(readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
}

function npmOutdated() {
  const result = spawnSync('npm', ['outdated', '--json', ...SITE_FRAMEWORKS], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const text = (result.stdout || '').trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
    reportOnly: argv.includes('--report-only'),
  };
}

function writeOutputs(report) {
  const dir = path.join(ROOT, 'bench');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'frameworks.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    path.join(dir, 'frameworks-badge.json'),
    `${JSON.stringify(badgePayload(report), null, 2)}\n`
  );
}

export function runCheck(opts = {}) {
  const checkedAt = new Date().toISOString().slice(0, 10);
  const report = reportFromOutdated(SITE_FRAMEWORKS, npmOutdated(), readLock(), checkedAt);
  if (opts.write) writeOutputs(report);
  return report;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const report = runCheck(opts);
  console.log(formatReport(report));
  if (!report.ok && !opts.reportOnly) process.exit(1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
